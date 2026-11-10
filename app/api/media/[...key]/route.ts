import { getMedia } from "@/lib/store";

type Ctx = { params: Promise<{ key: string[] }> };
export async function GET(_req: Request, ctx: Ctx) {
  const parts = (await ctx.params).key;
  if (parts.some((p) => p.includes(".."))) return new Response("Bad path", { status: 400 });
  const m = await getMedia(`media/${parts.join("/")}`);
  if (!m) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(m.body), { headers: { "Content-Type": m.contentType, "Cache-Control": "public, max-age=31536000, immutable" } });
}
