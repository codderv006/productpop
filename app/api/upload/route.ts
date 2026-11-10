import crypto from "crypto";
import { withUser } from "@/lib/api";
import { putMedia } from "@/lib/store";

const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];

export const POST = withUser(async (req, user) => {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file" }, { status: 400 });
  if (!ALLOWED.includes(file.type)) return Response.json({ error: "Upload a PNG, JPG, WebP, GIF or SVG image" }, { status: 400 });
  if (file.size > 4 * 1024 * 1024) return Response.json({ error: "Max 4 MB" }, { status: 400 });
  const ext = file.type.split("/")[1].replace("svg+xml", "svg").replace("jpeg", "jpg");
  const key = `media/${user.id}/${crypto.randomBytes(10).toString("hex")}.${ext}`;
  await putMedia(key, Buffer.from(await file.arrayBuffer()), file.type);
  return { url: `/api/media/${key.slice("media/".length)}` };
});
