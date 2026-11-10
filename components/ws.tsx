"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Asset, AssetFormat, Platform, Workspace } from "@/lib/types";

type U = { id: string; username: string; name: string; mcpToken: string };
type Ctx = {
  ws: Workspace | null;
  user: U | null;
  refresh: () => Promise<void>;
  setWs: (fn: (w: Workspace) => Workspace) => void;
  fresh: Set<string>; // ids that appeared since page load (for highlight)
  toast: (msg: string) => void;
};

const C = createContext<Ctx | null>(null);
export const useWs = () => {
  const c = useContext(C);
  if (!c) throw new Error("no ws");
  return c;
};

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [ws, setWsState] = useState<Workspace | null>(null);
  const [user, setUser] = useState<U | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const seen = useRef<Set<string> | null>(null);
  const lastActivity = useRef<string>("");
  const router = useRouter();
  const editing = useRef(0);

  const toast = useCallback((m: string) => {
    setToastMsg(m);
    setTimeout(() => setToastMsg(null), 2600);
  }, []);

  const refresh = useCallback(async () => {
    const r = await fetch("/api/workspace", { cache: "no-store" });
    if (r.status === 401) {
      router.replace("/login");
      return;
    }
    if (!r.ok) return;
    const data = (await r.json()) as { user: U; workspace: Workspace };
    const w = data.workspace;
    const ids = [...w.products.map((p) => p.id), ...w.campaigns.map((c) => c.id), ...w.assets.map((a) => a.id)];
    if (seen.current) {
      const newIds = ids.filter((i) => !seen.current!.has(i));
      if (newIds.length) setFresh((f) => new Set([...f, ...newIds]));
    }
    seen.current = new Set(ids);
    const top = w.activity[0];
    if (top && lastActivity.current && top.at !== lastActivity.current && top.actor === "claude") toast(`Claude: ${top.summary}`);
    lastActivity.current = top?.at ?? "";
    setUser(data.user);
    setWsState(w);
  }, [router, toast]);

  useEffect(() => {
    refresh();
    const t = setInterval(() => {
      if (document.visibilityState === "visible" && editing.current === 0) refresh();
    }, 3500);
    return () => clearInterval(t);
  }, [refresh]);

  const setWs = useCallback((fn: (w: Workspace) => Workspace) => setWsState((w) => (w ? fn(w) : w)), []);

  return (
    <C.Provider value={{ ws, user, refresh, setWs, fresh, toast }}>
      {children}
      {toastMsg ? <div className="toast">{toastMsg}</div> : null}
    </C.Provider>
  );
}

// ---------- helpers ----------

export const PLATFORM: Record<Platform, { label: string; color: string }> = {
  linkedin: { label: "LinkedIn", color: "#0a66c2" },
  x: { label: "X", color: "#111111" },
  instagram: { label: "Instagram", color: "#e1306c" },
  youtube_shorts: { label: "YouTube Shorts", color: "#ff0033" },
  reels: { label: "Reels", color: "#c13584" },
};

export const FORMAT: Record<AssetFormat, string> = {
  text_post: "Text post",
  thread: "Thread",
  visual_post: "Visual post",
  carousel: "Carousel",
  video_script: "Reel / Short",
};

export function renderUrl(uid: string, a: Asset, extra = "") {
  return `/api/render/${uid}/${a.id}?v=${a.version}${extra}`;
}

export function fmtDate(d: string) {
  if (!d) return "Unscheduled";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

export function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function fullText(a: Asset) {
  const parts: string[] = [];
  if (a.format === "thread" && a.thread.length) return a.thread.join("\n\n");
  if (a.hook && !a.body.startsWith(a.hook)) parts.push(a.hook);
  if (a.body) parts.push(a.body);
  if (a.cta && !a.body.includes(a.cta)) parts.push(a.cta);
  if (a.hashtags.length) parts.push(a.hashtags.join(" "));
  return parts.join("\n\n");
}

export async function api<T = unknown>(url: string, method: string, body?: unknown): Promise<T> {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: string }).error || "Request failed");
  return j as T;
}

export function Who({ actor }: { actor: "claude" | "you" }) {
  return actor === "claude" ? <span className="badge claude">✦ Claude</span> : <span className="badge you">You</span>;
}

export function PlatformTag({ p }: { p: Platform }) {
  return (
    <span className="pf">
      <span className="pf-dot" style={{ background: PLATFORM[p].color }} />
      {PLATFORM[p].label}
    </span>
  );
}
