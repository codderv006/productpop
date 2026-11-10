import { body, withUser } from "@/lib/api";
import { deleteAsset, duplicateAsset, updateAsset } from "@/lib/workspace";

type Ctx = { params: Promise<{ id: string }> };
export const PATCH = withUser<Ctx>(async (req, user, ctx) => updateAsset(user.id, (await ctx.params).id, await body(req), "you"));
export const DELETE = withUser<Ctx>(async (_req, user, ctx) => deleteAsset(user.id, (await ctx.params).id, "you"));
export const POST = withUser<Ctx>(async (_req, user, ctx) => duplicateAsset(user.id, (await ctx.params).id, "you"));
