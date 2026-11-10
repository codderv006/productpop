"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AssetCard from "@/components/AssetCard";
import { PLATFORM, Who, api, fmtDate, useWs } from "@/components/ws";
import type { AssetFormat, Platform } from "@/lib/types";

export default function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { ws, refresh, toast } = useWs();
  const router = useRouter();
  const [filter, setFilter] = useState<Platform | "all">("all");
  const [view, setView] = useState<"day" | "grid">("grid");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [adding, setAdding] = useState(false);

  const c = ws?.campaigns.find((x) => x.id === id);
  if (!ws) return null;
  if (!c) return <div className="card empty"><h2>Campaign not found</h2><Link href="/" className="btn mt">Back to dashboard</Link></div>;
  const p = ws.products.find((x) => x.id === c.productId);
  const all = ws.assets.filter((a) => a.campaignId === c.id).sort((a, b) => (a.scheduledDate || "9").localeCompare(b.scheduledDate || "9"));
  const assets = filter === "all" ? all : all.filter((a) => a.platform === filter);
  const platforms = [...new Set(all.map((a) => a.platform))];
  const groups = new Map<string, typeof assets>();
  for (const a of assets) groups.set(a.scheduledDate, [...(groups.get(a.scheduledDate) ?? []), a]);

  async function save() {
    await api(`/api/campaigns/${c!.id}`, "PATCH", { name, objective });
    setEditing(false);
    toast("Campaign saved");
    refresh();
  }
  async function add(format: AssetFormat, platform: Platform) {
    setAdding(false);
    const blank: Record<string, unknown> = { platform, format, title: "New " + format.replace("_", " "), hook: "", body: "" };
    if (format === "carousel") blank.slides = [{ heading: "Cover headline", body: "" }, { heading: "Point one", body: "" }, { heading: "Get started", body: "" }];
    if (format === "video_script") blank.scenes = [{ text: "Hook", duration: 3 }, { text: "The product", duration: 3 }, { text: "Try it today", duration: 3 }];
    if (format === "visual_post") blank.visual = { template: "announcement", headline: "Your headline" };
    const r = await api<{ assets: { id: string }[] }>(`/api/campaigns/${c!.id}`, "POST", blank);
    await refresh();
    router.push(`/assets/${r.assets[0].id}`);
  }

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="small muted"><Link href="/">Dashboard</Link> / {p?.name}</div>
      <div className="card">
        {editing ? (
          <div className="stack">
            <label className="f">Campaign name<input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label className="f">Objective<textarea className="input" value={objective} onChange={(e) => setObjective(e.target.value)} /></label>
            <div className="row"><button className="btn primary" onClick={save}>Save</button><button className="btn ghost" onClick={() => setEditing(false)}>Cancel</button></div>
          </div>
        ) : (
          <div className="between" style={{ alignItems: "flex-start" }}>
            <div className="stack" style={{ gap: 6 }}>
              <div className="row"><h1>{c.name}</h1><Who actor={c.createdBy} /></div>
              {c.objective ? <p className="muted">{c.objective}</p> : null}
              <p className="small muted">Starts {fmtDate(c.startDate)} · {all.length} assets · {all.filter((a) => a.status === "published").length} published</p>
            </div>
            <div className="row">
              <button className="btn" onClick={() => { setName(c.name); setObjective(c.objective); setEditing(true); }}>Edit</button>
              <button
                className="btn danger"
                onClick={async () => {
                  if (!confirm("Delete this campaign and all its assets?")) return;
                  await api(`/api/campaigns/${c.id}`, "DELETE");
                  await refresh();
                  router.push("/");
                }}
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="between wrap">
        <div className="row wrap">
          <button className={"btn sm" + (filter === "all" ? " primary" : "")} onClick={() => setFilter("all")}>All ({all.length})</button>
          {platforms.map((pl) => (
            <button key={pl} className={"btn sm" + (filter === pl ? " primary" : "")} onClick={() => setFilter(pl)}>
              {PLATFORM[pl].label} ({all.filter((a) => a.platform === pl).length})
            </button>
          ))}
        </div>
        <div className="row">
          <button className={"btn sm" + (view === "day" ? " primary" : "")} onClick={() => setView("day")}>By day</button>
          <button className={"btn sm" + (view === "grid" ? " primary" : "")} onClick={() => setView("grid")}>Grid</button>
          <div style={{ position: "relative" }}>
            <button className="btn sm brand" onClick={() => setAdding(!adding)}>+ Add asset</button>
            {adding ? (
              <div className="card" style={{ position: "absolute", right: 0, top: 36, zIndex: 10, width: 230, padding: 8 }}>
                {([
                  ["text_post", "linkedin", "LinkedIn post"],
                  ["thread", "x", "X thread"],
                  ["visual_post", "instagram", "Visual post"],
                  ["carousel", "instagram", "Carousel"],
                  ["video_script", "reels", "Reel / Short"],
                ] as [AssetFormat, Platform, string][]).map(([f, pl, l]) => (
                  <button key={f} className="btn ghost" style={{ width: "100%" }} onClick={() => add(f, pl)}>{l}</button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {assets.length === 0 ? <div className="card empty">No assets here yet.</div> : null}

      {view === "grid" ? (
        <div className="grid g4">{assets.map((a) => <AssetCard key={a.id} a={a} />)}</div>
      ) : (
        [...groups.entries()].map(([d, items]) => (
          <div key={d} className="stack" style={{ gap: 10 }}>
            <h3>{d ? `Day ${Math.round((new Date(d).getTime() - new Date(c.startDate).getTime()) / 864e5) + 1} · ${fmtDate(d)}` : "Unscheduled"}</h3>
            <div className="grid g4">{items.map((a) => <AssetCard key={a.id} a={a} />)}</div>
          </div>
        ))
      )}
    </div>
  );
}
