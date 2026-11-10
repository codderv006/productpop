import { withUser } from "@/lib/api";
import { publicUser } from "@/lib/auth";
import { getWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";
export const GET = withUser(async (_req, user) => ({ user: publicUser(user), workspace: await getWorkspace(user.id) }));
