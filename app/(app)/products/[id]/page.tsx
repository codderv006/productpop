"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ImageUpload from "@/components/ImageUpload";
import { Who, api, ago, useWs } from "@/components/ws";
import type { Product } from "@/lib/types";

const blank = (): Product => ({
  id: "", name: "", tagline: "", website: "", category: "", description: "", audience: "", features: [], voice: "",
  brand: { primary: "#5B3DF5", accent: "#22D3EE", background: "#0E0A24", text: "#FFFFFF" }, logoUrl: "", screenshots: [],
  createdAt: "", updatedAt: "", updatedBy: "you",
});

function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="f">{label}
      <span className="color-in">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} />
      </span>
    </label>
  );
}

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isNew = id === "new";
  const { ws, refresh, toast } = useWs();
  const router = useRouter();
  const server = ws?.products.find((p) => p.id === id);
  const [d, setD] = useState<Product | null>(isNew ? blank() : null);
  const [ver, setVer] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (server && (server.updatedAt !== ver)) {
      setD(structuredClone(server));
      setVer(server.updatedAt);
    }
  }, [server, ver]);

  if (!ws || !d) return isNew || ws ? <div className="card empty"><h2>Product not found</h2></div> : null;
  const set = (p: Partial<Product>) => setD({ ...d, ...p });
  const dirty = isNew || JSON.stringify(d) !== JSON.stringify(server);
  const campaigns = ws.campaigns.filter((c) => c.productId === id);

  async function save() {
    setBusy(true);
    try {
      const payload = { name: d!.name, tagline: d!.tagline, website: d!.website, category: d!.category, description: d!.description, audience: d!.audience, features: d!.features, voice: d!.voice, brand: d!.brand, logoUrl: d!.logoUrl };
      if (isNew) {
        const r = await api<{ product: Product }>("/api/products", "POST", payload);
        await refresh();
        router.replace(`/products/${r.product.id}`);
      } else {
        await api(`/api/products/${id}`, "PATCH", payload);
        await refresh();
      }
      toast("Product saved");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const b = d.brand;
  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="between">
        <div>
          <h1>{isNew ? "New product" : d.name || "Product"}</h1>
          {!isNew && server ? <p className="small muted row">Last edited by <Who actor={server.updatedBy} /> {ago(server.updatedAt)}</p> : <p className="muted">Or just describe your product to Claude — it will save it here.</p>}
        </div>
        <div className="row">
          {!isNew ? (
            <button className="btn danger" onClick={async () => { if (!confirm("Delete this product, its campaigns and assets?")) return; await api(`/api/products/${id}`, "DELETE"); await refresh(); router.push("/"); }}>Delete</button>
          ) : null}
          <button className="btn primary" onClick={save} disabled={!dirty || busy || !d.name.trim()}>{busy ? "Saving…" : dirty ? "Save product" : "Saved"}</button>
        </div>
      </div>

      <div className="editor">
        <div className="stack" style={{ gap: 16 }}>
          <div className="card stack">
            <h3>About the product</h3>
            <div className="grid g2">
              <label className="f">Name<input className="input" value={d.name} onChange={(e) => set({ name: e.target.value })} /></label>
              <label className="f">Category<input className="input" value={d.category} placeholder="Productivity SaaS" onChange={(e) => set({ category: e.target.value })} /></label>
            </div>
            <label className="f">Tagline<input className="input" value={d.tagline} onChange={(e) => set({ tagline: e.target.value })} /></label>
            <label className="f">Website<input className="input" value={d.website} placeholder="https://" onChange={(e) => set({ website: e.target.value })} /></label>
            <label className="f">Description<textarea className="input" value={d.description} onChange={(e) => set({ description: e.target.value })} /></label>
            <label className="f">Target audience<textarea className="input" style={{ minHeight: 60 }} value={d.audience} onChange={(e) => set({ audience: e.target.value })} /></label>
            <label className="f">Key features (one per line)<textarea className="input" value={d.features.join("\n")} onChange={(e) => set({ features: e.target.value.split("\n") })} /></label>
            <label className="f">Brand voice<input className="input" value={d.voice} placeholder="Friendly, practical, no buzzwords" onChange={(e) => set({ voice: e.target.value })} /></label>
          </div>
        </div>

        <div className="preview-col">
          <div className="card stack">
            <h3>Brand kit</h3>
            <div className="grid g2">
              <Color label="Primary" value={b.primary} onChange={(v) => set({ brand: { ...b, primary: v } })} />
              <Color label="Accent" value={b.accent} onChange={(v) => set({ brand: { ...b, accent: v } })} />
              <Color label="Background" value={b.background} onChange={(v) => set({ brand: { ...b, background: v } })} />
              <Color label="Text" value={b.text} onChange={(v) => set({ brand: { ...b, text: v } })} />
            </div>
            <ImageUpload
              label="Logo"
              value={d.logoUrl}
              onChange={async (u) => {
                set({ logoUrl: u });
                if (isNew) return;
                await api(`/api/products/${id}`, "PATCH", { name: d.name, tagline: d.tagline, website: d.website, category: d.category, description: d.description, audience: d.audience, features: d.features, voice: d.voice, brand: d.brand, logoUrl: u });
                await refresh();
                toast(u ? "Logo saved — every post, carousel and Reel now uses it" : "Logo removed");
              }}
            />
            <div style={{ borderRadius: 14, padding: 22, color: b.text, backgroundColor: b.background, backgroundImage: `radial-gradient(circle at 90% 0%, ${b.primary}aa, transparent 60%), radial-gradient(circle at 0% 100%, ${b.accent}55, transparent 55%)` }}>
              <div className="row" style={{ fontWeight: 700 }}>
                {d.logoUrl ? <img src={d.logoUrl} alt="" style={{ width: 26, height: 26, borderRadius: 6, objectFit: "contain" }} /> : <span style={{ width: 26, height: 26, borderRadius: 7, background: `linear-gradient(135deg, ${b.primary}, ${b.accent})`, display: "grid", placeItems: "center", color: "#fff", fontSize: 13 }}>{(d.name || "P")[0]}</span>}
                {d.name || "Your product"}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.1, margin: "26px 0 10px", letterSpacing: "-0.03em" }}>{d.tagline || "Your tagline here"}</div>
              <span style={{ display: "inline-block", background: b.primary, color: "#fff", borderRadius: 99, padding: "6px 14px", fontWeight: 700, fontSize: 12 }}>Try it free</span>
            </div>
            <p className="small muted">Every post, carousel and Reel for this product is rendered in these colours.</p>
          </div>
          {!isNew ? (
            <div className="card stack" style={{ gap: 8 }}>
              <h3>Campaigns</h3>
              {campaigns.length === 0 ? <p className="small muted">No campaigns yet — ask Claude to create one.</p> : null}
              {campaigns.map((c) => <Link key={c.id} href={`/campaigns/${c.id}`} className="between" style={{ fontWeight: 600 }}>{c.name}<span className="small muted">{ws.assets.filter((a) => a.campaignId === c.id).length} assets</span></Link>)}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
