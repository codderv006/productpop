import { withUser } from "@/lib/api";
import { DEMO_USERNAME } from "@/lib/auth";
import { seedDemo } from "@/lib/seed";

// Resets the shared demo workspace to a clean FlowDesk product (demo account only).
export const POST = withUser(async (_req, user) => {
  if (user.username !== DEMO_USERNAME) return Response.json({ error: "Only the demo workspace can be reset" }, { status: 403 });
  await seedDemo(user.id, true);
  return { ok: true };
});
