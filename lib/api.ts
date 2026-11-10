import { NextResponse } from "next/server";
import { currentUser } from "./auth";
import { BadInput, NotFound } from "./workspace";
import type { User } from "./types";

export function withUser<C>(fn: (req: Request, user: User, ctx: C) => Promise<unknown>) {
  return async (req: Request, ctx: C) => {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    try {
      const out = await fn(req, user, ctx);
      return out instanceof Response ? out : NextResponse.json(out);
    } catch (e) {
      const status = e instanceof NotFound ? 404 : e instanceof BadInput ? 400 : 500;
      if (status === 500) console.error(e);
      return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status });
    }
  };
}

export async function body(req: Request): Promise<Record<string, unknown>> {
  try { return (await req.json()) as Record<string, unknown>; } catch { return {}; }
}
