import { body, withUser } from "@/lib/api";
import { createCampaign } from "@/lib/workspace";

export const POST = withUser(async (req, user) => createCampaign(user.id, await body(req), "you"));
