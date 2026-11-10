"use client";

import { useRef, useState } from "react";

export default function ImageUpload({ value, onChange, label = "Image" }: { value?: string; onChange: (url: string) => void; label?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function upload(f: File) {
    setBusy(true);
    setErr("");
    const fd = new FormData();
    fd.append("file", f);
    const r = await fetch("/api/upload", { method: "POST", body: fd });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(j.error || "Upload failed");
    onChange(j.url);
  }
  return (
    <div className="stack" style={{ gap: 6 }}>
      <span className="small" style={{ fontWeight: 600, color: "var(--muted)" }}>{label}</span>
      <div className="row">
        {value ? <img src={value} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8, border: "1px solid var(--line)" }} /> : null}
        <button type="button" className="btn sm" onClick={() => ref.current?.click()} disabled={busy}>{busy ? "Uploading…" : value ? "Replace" : "Upload"}</button>
        {value ? <button type="button" className="btn sm ghost" onClick={() => onChange("")}>Remove</button> : null}
        <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </div>
      {err ? <span className="err">{err}</span> : null}
    </div>
  );
}
