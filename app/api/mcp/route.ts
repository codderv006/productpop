import { handleMcp } from "@/lib/mcp-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const h = (req: Request) => handleMcp(req, null);
export { h as GET, h as POST, h as DELETE, h as OPTIONS };
