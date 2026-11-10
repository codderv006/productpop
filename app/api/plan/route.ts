import { body, withUser } from "@/lib/api";
import { setPlan } from "@/lib/auth";

// Simulated plan switch (no payment yet): Free shows the "Made with ProductPop" badge, Pro removes it.
export const POST = withUser(async (req, user) => {
  const { plan } = await body(req);
  if (plan !== "free" && plan !== "pro") return Response.json({ error: "plan must be free or pro" }, { status: 400 });
  await setPlan(user, plan);
  return { ok: true, plan };
});
