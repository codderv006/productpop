import { body, withUser } from "@/lib/api";
import { addAssets, deleteCampaign, updateCampaign } from "@/lib/workspace";

type Ctx = { params: Promise<{ id: string }> };
export const PATCH = withUser<Ctx>(async (req, user, ctx) => updateCampaign(user.id, (await ctx.params).id, await body(req), "you"));
export const DELETE = withUser<Ctx>(async (_req, user, ctx) => deleteCampaign(user.id, (await ctx.params).id, "you"));
// POST = add a blank asset
export const POST = withUser<Ctx>(async (req, user, ctx) => addAssets(user.id, (await ctx.params).id, [await body(req)], "you"));
