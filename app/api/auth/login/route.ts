import { NextResponse } from "next/server";
import { COOKIE, DEMO_USERNAME, ensureDemoUser, getUserByUsername, makeSession, verifyPassword } from "@/lib/auth";

export async function POST(req: Request) {
  const { username = "", password = "" } = await req.json().catch(() => ({}));
  if (String(username).trim().toLowerCase() === DEMO_USERNAME) await ensureDemoUser();
  const user = await getUserByUsername(String(username));
  if (!user || !verifyPassword(user, String(password))) return NextResponse.json({ error: "Wrong username or password" }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, makeSession(user.id), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
}
