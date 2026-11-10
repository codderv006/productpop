"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";

export default function Login() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e?: React.FormEvent, creds?: { username: string; password: string }) {
    e?.preventDefault();
    setBusy(true);
    setErr("");
    const r = await fetch(mode === "login" || creds ? "/api/auth/login" : "/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(creds ?? { username, password, name }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(j.error || "Something went wrong");
    router.replace("/");
  }

  return (
    <div className="auth">
      <div className="auth-hero">
        <div className="row" style={{ fontWeight: 800, fontSize: 18 }}>
          <Logo size={34} />
        </div>
        <div>
          <h1>Your product deserves to be seen.</h1>
          <p style={{ fontSize: 17, opacity: 0.8, marginTop: 18, maxWidth: 500, lineHeight: 1.6 }}>
            Tell your own Claude about your product. ProductPop turns what it writes into on-brand posts, carousels and Reels you can edit, download and publish.
          </p>
          <div className="row wrap" style={{ gap: 8, marginTop: 28 }}>
            {["LinkedIn", "X", "Instagram", "Reels", "YouTube Shorts"].map((p) => (
              <span key={p} style={{ border: "1px solid rgba(255,255,255,.25)", borderRadius: 99, padding: "5px 12px", fontSize: 13 }}>{p}</span>
            ))}
          </div>
        </div>
        <p style={{ opacity: 0.55, fontSize: 13 }}>No AI inside. Your Claude writes; ProductPop saves, designs and keeps it live.</p>
      </div>
      <div className="auth-form">
        <form className="card stack" onSubmit={submit}>
          <h2>{mode === "login" ? "Log in" : "Create your workspace"}</h2>
          {mode === "signup" ? (
            <label className="f">Your name<input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Asha Rao" /></label>
          ) : null}
          <label className="f">Username<input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" /></label>
          <label className="f">Password<input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
          {err ? <div className="err">{err}</div> : null}
          <button className="btn primary" style={{ justifyContent: "center", padding: 11 }} disabled={busy}>
            {busy ? "…" : mode === "login" ? "Log in" : "Create account"}
          </button>
          <button type="button" className="btn" style={{ justifyContent: "center", padding: 11 }} disabled={busy} onClick={() => submit(undefined, { username: "demo", password: "productpop2026" })}>
            Try the demo workspace
          </button>
          <div className="small muted" style={{ textAlign: "center" }}>
            {mode === "login" ? "New here? " : "Have an account? "}
            <a style={{ color: "var(--brand)", fontWeight: 700, cursor: "pointer" }} onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErr(""); }}>
              {mode === "login" ? "Create a workspace" : "Log in"}
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
