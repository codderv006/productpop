import crypto from "crypto";
import { cookies } from "next/headers";
import { readDoc, writeDoc } from "./store";
import type { User } from "./types";

const SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";
export const COOKIE = "pp_session";

export const DEMO_USERNAME = "demo";
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "productpop2026";

function hash(password: string, salt: string) {
  return crypto.scryptSync(password, salt, 32).toString("hex");
}

function normUsername(u: string) {
  return u.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "");
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const doc = await readDoc<User>(`users/${normUsername(username)}.json`);
  return doc?.data ?? null;
}

export async function getUserById(id: string): Promise<User | null> {
  const idx = await readDoc<{ username: string }>(`userids/${id}.json`);
  if (!idx) return null;
  return getUserByUsername(idx.data.username);
}

export async function getUserByToken(token: string): Promise<User | null> {
  if (!token || !/^[a-zA-Z0-9_-]{16,}$/.test(token)) return null;
  const idx = await readDoc<{ username: string }>(`tokens/${token}.json`);
  if (!idx) return null;
  return getUserByUsername(idx.data.username);
}

export async function createUser(username: string, password: string, name: string, fixedToken?: string): Promise<User> {
  const u = normUsername(username);
  if (u.length < 3) throw new Error("Username must be at least 3 characters (letters, numbers, . _ -)");
  if (password.length < 6) throw new Error("Password must be at least 6 characters");
  if (await getUserByUsername(u)) throw new Error("That username is taken");
  const salt = crypto.randomBytes(16).toString("hex");
  const user: User = {
    id: "u_" + crypto.randomBytes(8).toString("hex"),
    username: u,
    name: name.trim() || u,
    salt,
    passwordHash: hash(password, salt),
    mcpToken: fixedToken || crypto.randomBytes(18).toString("base64url"),
    createdAt: new Date().toISOString(),
  };
  await writeDoc(`users/${u}.json`, user);
  await writeDoc(`userids/${user.id}.json`, { username: u });
  await writeDoc(`tokens/${user.mcpToken}.json`, { username: u });
  return user;
}

export async function ensureDemoUser(): Promise<User> {
  const existing = await getUserByUsername(DEMO_USERNAME);
  if (existing) return existing;
  const user = await createUser(DEMO_USERNAME, DEMO_PASSWORD, "Demo Founder", process.env.DEMO_MCP_TOKEN || undefined);
  const { seedDemo } = await import("./seed");
  await seedDemo(user.id);
  return user;
}

export function verifyPassword(user: User, password: string) {
  const a = Buffer.from(hash(password, user.salt), "hex");
  const b = Buffer.from(user.passwordHash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function sign(value: string) {
  return crypto.createHmac("sha256", SECRET).update(value).digest("base64url");
}

export function makeSession(userId: string) {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 30;
  const payload = `${userId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function parseSession(value: string | undefined): string | null {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [userId, exp, sig] = parts;
  const expected = sign(`${userId}.${exp}`);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (Number(exp) < Date.now()) return null;
  return userId;
}

export async function currentUser(): Promise<User | null> {
  const jar = await cookies();
  const id = parseSession(jar.get(COOKIE)?.value);
  if (!id) return null;
  return getUserById(id);
}

export function publicUser(u: User) {
  return { id: u.id, username: u.username, name: u.name, mcpToken: u.mcpToken };
}
