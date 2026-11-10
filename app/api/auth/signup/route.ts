import { NextResponse } from "next/server";
import { COOKIE, createUser, makeSession } from "@/lib/auth";

export async function POST(req: Request) {
  const { username = "", password = "", name = "" } = await req.json().catch(() => ({}));
  try {
    const user = await createUser(String(username), String(password), String(name));
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE, makeSession(user.id), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
    return res;
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not sign up" }, { status: 400 });
  }
}
