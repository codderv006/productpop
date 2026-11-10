import { handleMcp } from "@/lib/mcp-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ctx = { params: Promise<{ token: string }> };
const h = async (req: Request, ctx: Ctx) => handleMcp(req, (await ctx.params).token);
export { h as GET, h as POST, h as DELETE, h as OPTIONS };
