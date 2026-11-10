import { ensureDemoUser } from "@/lib/auth";
import { callTool } from "@/lib/mcp-tools";
import { baseUrl } from "@/lib/mcp-server";
import { mutateDoc } from "@/lib/store";

export const dynamic = "force-dynamic";

// Health check: verifies storage round-trip and the MCP tool layer for the demo workspace.
export async function GET(req: Request) {
  const t0 = Date.now();
  try {
    const demo = await ensureDemoUser();
    let writes = 0;
    if (new URL(req.url).searchParams.get("write") === "1") {
      for (let i = 0; i < 3; i++) writes = await mutateDoc<{ n: number }, number>("health/counter.json", () => ({ n: 0 }), (d) => ++d.n);
    }
    const ws = await callTool(demo.id, "get_workspace", {}, baseUrl(req));
    return Response.json({
      ok: true,
      storage: process.env.BLOB_READ_WRITE_TOKEN ? "vercel-blob" : "local",
      demo_products: (ws.products as unknown[]).length,
      demo_campaigns: (ws.campaigns as unknown[]).length,
      writes,
      ms: Date.now() - t0,
    });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
