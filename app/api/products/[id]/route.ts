import { body, withUser } from "@/lib/api";
import { deleteProduct, saveProduct } from "@/lib/workspace";

type Ctx = { params: Promise<{ id: string }> };
export const PATCH = withUser<Ctx>(async (req, user, ctx) => saveProduct(user.id, { ...(await body(req)), id: (await ctx.params).id }, "you"));
export const DELETE = withUser<Ctx>(async (_req, user, ctx) => deleteProduct(user.id, (await ctx.params).id, "you"));
