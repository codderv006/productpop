import { ensureDemoUser } from "@/lib/auth";
import { callTool } from "@/lib/mcp-tools";
import { baseUrl } from "@/lib/mcp-server";

export const dynamic = "force-dynamic";

// Health check: verifies storage round-trip and the MCP tool layer for the demo workspace.
export async function GET(req: Request) {
  const t0 = Date.now();
  try {
    const demo = await ensureDemoUser();
    const ws = await callTool(demo.id, "get_workspace", {}, baseUrl(req));
    return Response.json({
      ok: true,
      storage: process.env.BLOB_READ_WRITE_TOKEN ? "vercel-blob" : "local",
      demo_products: (ws.products as unknown[]).length,
      demo_campaigns: (ws.campaigns as unknown[]).length,
      ms: Date.now() - t0,
    });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
