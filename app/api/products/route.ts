import { body, withUser } from "@/lib/api";
import { saveProduct } from "@/lib/workspace";

export const POST = withUser(async (req, user) => {
  const b = await body(req);
  delete b.id;
  return saveProduct(user.id, b, "you");
});
