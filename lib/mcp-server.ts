import { getUserByToken } from "./auth";
import { callTool, INSTRUCTIONS, TOOLS } from "./mcp-tools";

// Minimal, stateless MCP server over Streamable HTTP (JSON responses).
// Handles: initialize, ping, tools/list, tools/call, notifications/*.

const SUPPORTED = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];

type RpcReq = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID",
  "Access-Control-Expose-Headers": "Mcp-Session-Id",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...cors } });
}

export function baseUrl(req: Request) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = req.headers;
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function handleOne(msg: RpcReq, userId: string, base: string) {
  const { id, method, params = {} } = msg;
  const ok = (result: unknown) => ({ jsonrpc: "2.0", id, result });
  const err = (code: number, message: string) => ({ jsonrpc: "2.0", id, error: { code, message } });

  if (id === undefined || id === null) return null; // notification

  switch (method) {
    case "initialize": {
      const requested = String(params.protocolVersion ?? "");
      return ok({
        protocolVersion: SUPPORTED.includes(requested) ? requested : SUPPORTED[1],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "productpop", title: "ProductPop", version: "1.0.0" },
        instructions: INSTRUCTIONS,
      });
    }
    case "ping":
      return ok({});
    case "tools/list":
      return ok({ tools: TOOLS });
    case "resources/list":
      return ok({ resources: [] });
    case "prompts/list":
      return ok({ prompts: [] });
    case "tools/call": {
      const name = String(params.name ?? "");
      const args = (params.arguments ?? {}) as Record<string, unknown>;
      try {
        const result = await callTool(userId, name, args, base);
        return ok({ content: [{ type: "text", text: JSON.stringify(result, null, 2) }], structuredContent: result, isError: false });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return ok({ content: [{ type: "text", text: `Error: ${message}` }], isError: true });
      }
    }
    default:
      return err(-32601, `Method not found: ${method}`);
  }
}

export async function handleMcp(req: Request, token: string | null) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method === "GET") return new Response("Method Not Allowed: this server does not offer an SSE stream.", { status: 405, headers: { Allow: "POST", ...cors } });
  if (req.method === "DELETE") return new Response(null, { status: 204, headers: cors });

  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || null;
  const user = await getUserByToken(token || bearer || "");
  if (!user) return json({ jsonrpc: "2.0", id: null, error: { code: -32001, message: "Invalid ProductPop MCP link. Copy your link from Settings → Connect Claude." } }, 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400);
  }
  const base = baseUrl(req);
  if (Array.isArray(body)) {
    const out = (await Promise.all(body.map((m) => handleOne(m as RpcReq, user.id, base)))).filter(Boolean);
    return out.length ? json(out) : new Response(null, { status: 202, headers: cors });
  }
  const res = await handleOne(body as RpcReq, user.id, base);
  return res ? json(res) : new Response(null, { status: 202, headers: cors });
}
