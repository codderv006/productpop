"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ImageUpload from "@/components/ImageUpload";
import VideoStudio from "@/components/VideoStudio";
import { FORMAT, PLATFORM, PlatformTag, ProductMark, Who, ago, api, fullText, renderUrl, useWs } from "@/components/ws";
import type { Asset, Platform } from "@/lib/types";

const STATUSES = ["draft", "ready", "scheduled", "published"] as const;

export default function AssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { ws, user, refresh, setWs, toast } = useWs();
  const router = useRouter();
  const server = ws?.assets.find((a) => a.id === id);
  const [d, setD] = useState<Asset | null>(null);
  const [base, setBase] = useState(0); // server version the draft is based on
  const [saving, setSaving] = useState(false);
  const [slide, setSlide] = useState(0);
  const dirty = !!(d && server && JSON.stringify(d) !== JSON.stringify(server));
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  // load / follow server changes when not dirty
  useEffect(() => {
    if (!server) return;
    if (!d || d.id !== server.id || (!dirtyRef.current && server.version !== base)) {
      setD(structuredClone(server));
      setBase(server.version);
    }
  }, [server, d, base]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  if (!ws || !user) return null;
  if (!server) return <div className="card empty"><h2>Asset not found</h2><Link href="/" className="btn mt">Back</Link></div>;
  if (!d) return null;
  const campaign = ws.campaigns.find((c) => c.id === d.campaignId);
  const product = ws.products.find((p) => p.id === d.productId);
  const conflict = dirty && server.version !== base;

  const set = (patch: Partial<Asset>) => setD({ ...d, ...patch });
  const setV = (patch: Partial<Asset["visual"]>) => setD({ ...d, visual: { ...d.visual, ...patch } });

  async function save() {
    if (!d || !dirtyRef.current) return;
    setSaving(true);
    try {
      const updated = await api<Asset>(`/api/assets/${d.id}`, "PATCH", {
        title: d.title, hook: d.hook, body: d.body, cta: d.cta, hashtags: d.hashtags, thread: d.thread, slides: d.slides,
        scenes: d.scenes, visual: d.visual, status: d.status, scheduledDate: d.scheduledDate, publishedUrl: d.publishedUrl, platform: d.platform,
      });
      setWs((w) => ({ ...w, assets: w.assets.map((a) => (a.id === updated.id ? updated : a)) }));
      setD(structuredClone(updated));
      setBase(updated.version);
      toast("Saved");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function copy(text: string, msg = "Copied to clipboard") {
    await navigator.clipboard.writeText(text);
    toast(msg);
  }

  const uid = user.id;
  const isVisual = d.format === "visual_post";
  const isCarousel = d.format === "carousel";
  const isVideo = d.format === "video_script";
  const isThread = d.format === "thread";

  function moveItem<T>(arr: T[], i: number, dir: number) {
    const a = arr.slice();
    const j = i + dir;
    if (j < 0 || j >= a.length) return a;
    [a[i], a[j]] = [a[j], a[i]];
    return a;
  }

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="between wrap">
        <div className="small muted">
          <Link href="/">Dashboard</Link> / <Link href={`/campaigns/${d.campaignId}`}>{campaign?.name}</Link>
        </div>
        <div className="row small muted">
          v{server.version} · last edited by <Who actor={server.updatedBy} /> {ago(server.updatedAt)}
        </div>
      </div>

      <div className="between wrap">
        <div className="row"><PlatformTag p={d.platform} /><span className="badge">{FORMAT[d.format]}</span></div>
        <div className="row">
          <button className="btn" onClick={async () => { const c = await api<Asset>(`/api/assets/${d.id}`, "POST"); await refresh(); router.push(`/assets/${c.id}`); }}>Duplicate</button>
          <button className="btn danger" onClick={async () => { if (!confirm("Delete this asset?")) return; await api(`/api/assets/${d.id}`, "DELETE"); await refresh(); router.push(`/campaigns/${d.campaignId}`); }}>Delete</button>
          <button className="btn primary" onClick={save} disabled={!dirty || saving}>{saving ? "Saving…" : dirty ? "Save changes" : "Saved"}</button>
        </div>
      </div>

      {conflict ? (
        <div className="card" style={{ borderColor: "#f3d6c4", background: "var(--claude-soft)" }}>
          <div className="between">
            <span><b>Claude just updated this asset</b> while you were editing.</span>
            <div className="row">
              <button className="btn sm" onClick={() => { setD(structuredClone(server)); setBase(server.version); }}>Load Claude’s version</button>
              <button className="btn sm" onClick={() => setBase(server.version)}>Keep mine</button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="editor">
        {/* ---------------- left: fields ---------------- */}
        <div className="stack" style={{ gap: 16 }}>
          <div className="card stack">
            <label className="f">Title<input className="input" value={d.title} onChange={(e) => set({ title: e.target.value })} /></label>
            <div className="grid g3">
              <label className="f">Platform
                <select className="input" value={d.platform} onChange={(e) => set({ platform: e.target.value as Platform })}>
                  {Object.entries(PLATFORM).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </label>
              <label className="f">Publish date<input type="date" className="input" value={d.scheduledDate} onChange={(e) => set({ scheduledDate: e.target.value })} /></label>
              <label className="f">Status
                <select className="input" value={d.status} onChange={(e) => set({ status: e.target.value as Asset["status"] })}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>
            {d.status === "published" ? (
              <label className="f">Published link<input className="input" placeholder="https://linkedin.com/posts/…" value={d.publishedUrl} onChange={(e) => set({ publishedUrl: e.target.value })} /></label>
            ) : null}
          </div>

          {isVisual ? (
            <div className="card stack">
              <h3>Design</h3>
              <div className="grid g2">
                <label className="f">Template
                  <select className="input" value={d.visual.template} onChange={(e) => setV({ template: e.target.value as Asset["visual"]["template"] })}>
                    <option value="announcement">Announcement</option>
                    <option value="stat">Big stat</option>
                    <option value="quote">Quote</option>
                    <option value="feature">Feature list</option>
                  </select>
                </label>
                <label className="f">Size
                  <select className="input" value={d.visual.aspect} onChange={(e) => setV({ aspect: e.target.value as Asset["visual"]["aspect"] })}>
                    <option value="square">Square 1080×1080</option>
                    <option value="portrait">Portrait 1080×1350</option>
                    <option value="landscape">Landscape 1200×675</option>
                  </select>
                </label>
              </div>
              {d.visual.template === "stat" ? <label className="f">Big number<input className="input" value={d.visual.stat ?? ""} onChange={(e) => setV({ stat: e.target.value })} /></label> : null}
              <label className="f">{d.visual.template === "quote" ? "Quote" : "Headline"}<textarea className="input" style={{ minHeight: 60 }} value={d.visual.headline} onChange={(e) => setV({ headline: e.target.value })} /></label>
              <label className="f">{d.visual.template === "quote" ? "Attribution" : "Subtext"}<input className="input" value={d.visual.subtext} onChange={(e) => setV({ subtext: e.target.value })} /></label>
              {d.visual.template === "announcement" ? <ImageUpload label="Screenshot (optional)" value={d.visual.imageUrl} onChange={(u) => setV({ imageUrl: u || undefined })} /> : null}
            </div>
          ) : null}

          {isCarousel ? (
            <div className="card stack">
              <div className="between"><h3>Slides</h3><span className="small muted">First = cover · last = call to action</span></div>
              {d.slides.map((s, i) => (
                <div key={i} className="list-item" onFocus={() => setSlide(i)}>
                  <div className="head">
                    <span>Slide {i + 1}</span>
                    <span className="row" style={{ gap: 2 }}>
                      <button className="btn ghost sm" onClick={() => set({ slides: moveItem(d.slides, i, -1) })}>↑</button>
                      <button className="btn ghost sm" onClick={() => set({ slides: moveItem(d.slides, i, 1) })}>↓</button>
                      <button className="btn ghost sm danger" onClick={() => set({ slides: d.slides.filter((_, k) => k !== i) })}>✕</button>
                    </span>
                  </div>
                  <input className="input" value={s.heading} placeholder="Heading" onChange={(e) => set({ slides: d.slides.map((x, k) => (k === i ? { ...x, heading: e.target.value } : x)) })} />
                  <textarea className="input" style={{ minHeight: 56 }} value={s.body} placeholder="Body" onChange={(e) => set({ slides: d.slides.map((x, k) => (k === i ? { ...x, body: e.target.value } : x)) })} />
                </div>
              ))}
              <button className="btn sm" onClick={() => set({ slides: [...d.slides.slice(0, -1), { heading: "New point", body: "" }, ...d.slides.slice(-1)] })}>+ Add slide</button>
            </div>
          ) : null}

          {isVideo ? (
            <div className="card stack">
              <div className="between"><h3>Storyboard</h3><span className="small muted">{d.scenes.reduce((s, x) => s + Number(x.duration || 0), 0)}s total</span></div>
              {d.scenes.map((s, i) => (
                <div key={i} className="list-item">
                  <div className="head">
                    <span>Scene {i + 1}</span>
                    <span className="row" style={{ gap: 2 }}>
                      <button className="btn ghost sm" onClick={() => set({ scenes: moveItem(d.scenes, i, -1) })}>↑</button>
                      <button className="btn ghost sm" onClick={() => set({ scenes: moveItem(d.scenes, i, 1) })}>↓</button>
                      <button className="btn ghost sm danger" onClick={() => set({ scenes: d.scenes.filter((_, k) => k !== i) })}>✕</button>
                    </span>
                  </div>
                  <div className="grid" style={{ gridTemplateColumns: "1fr 90px" }}>
                    <input className="input" value={s.text} placeholder="On-screen text" onChange={(e) => set({ scenes: d.scenes.map((x, k) => (k === i ? { ...x, text: e.target.value } : x)) })} />
                    <input className="input" type="number" min={1} max={10} value={s.duration} onChange={(e) => set({ scenes: d.scenes.map((x, k) => (k === i ? { ...x, duration: Math.max(1, Math.min(10, Number(e.target.value) || 1)) } : x)) })} title="Seconds" />
                  </div>
                  <input className="input" value={s.subtext} placeholder="Supporting line" onChange={(e) => set({ scenes: d.scenes.map((x, k) => (k === i ? { ...x, subtext: e.target.value } : x)) })} />
                  {s.visual ? <div className="small muted">🎬 {s.visual}</div> : null}
                  <ImageUpload label="Screenshot for this scene" value={s.imageUrl} onChange={(u) => set({ scenes: d.scenes.map((x, k) => (k === i ? { ...x, imageUrl: u || undefined } : x)) })} />
                </div>
              ))}
              <button className="btn sm" onClick={() => set({ scenes: [...d.scenes, { text: "New scene", subtext: "", duration: 3, visual: "" }] })}>+ Add scene</button>
            </div>
          ) : null}

          <div className="card stack">
            <h3>{isThread ? "Thread" : isVideo ? "Caption" : "Post copy"}</h3>
            {isThread ? (
              <>
                {d.thread.map((t, i) => (
                  <div key={i} className="list-item">
                    <div className="head"><span>{i + 1}/{d.thread.length}</span><span className="row" style={{ gap: 8 }}><span style={{ color: t.length > 280 ? "#c0362c" : undefined }}>{t.length}/280</span><button className="btn ghost sm danger" onClick={() => set({ thread: d.thread.filter((_, k) => k !== i) })}>✕</button></span></div>
                    <textarea className="input" style={{ minHeight: 60 }} value={t} onChange={(e) => set({ thread: d.thread.map((x, k) => (k === i ? e.target.value : x)) })} />
                  </div>
                ))}
                <button className="btn sm" onClick={() => set({ thread: [...d.thread, ""] })}>+ Add tweet</button>
              </>
            ) : (
              <>
                <label className="f">Hook<input className="input" value={d.hook} onChange={(e) => set({ hook: e.target.value })} /></label>
                <label className="f">Body<textarea className="input" style={{ minHeight: 180 }} value={d.body} onChange={(e) => set({ body: e.target.value })} /></label>
              </>
            )}
            <label className="f">Call to action<input className="input" value={d.cta} onChange={(e) => set({ cta: e.target.value })} /></label>
            <label className="f">Hashtags<input className="input" value={d.hashtags.join(" ")} placeholder="#startups #saas" onChange={(e) => set({ hashtags: e.target.value.split(/[\s,]+/).filter(Boolean) })} /></label>
          </div>
        </div>

        {/* ---------------- right: preview ---------------- */}
        <div className="preview-col">
          {isVisual ? (
            <div className="card stack" style={{ gap: 10 }}>
              <div className="between"><h3>Preview</h3>{dirty ? <span className="small muted">Save to update</span> : null}</div>
              <img className="preview-img" src={renderUrl(uid, server)} alt="" />
              <div className="row">
                <a className="btn brand" href={renderUrl(uid, server, "&download=1")}>Download PNG</a>
                <button className="btn" onClick={() => copy(fullText(d), "Caption copied")}>Copy caption</button>
              </div>
            </div>
          ) : null}

          {isCarousel ? (
            <div className="card stack" style={{ gap: 10 }}>
              <div className="between"><h3>Preview · slide {Math.min(slide, server.slides.length - 1) + 1}/{server.slides.length}</h3>{dirty ? <span className="small muted">Save to update</span> : null}</div>
              <img className="preview-img" src={renderUrl(uid, server, `&slide=${Math.min(slide, server.slides.length - 1)}`)} alt="" />
              <div className="slides-strip">
                {server.slides.map((_, i) => (
                  <img key={i} className={i === slide ? "on" : ""} src={renderUrl(uid, server, `&slide=${i}`)} alt="" onClick={() => setSlide(i)} />
                ))}
              </div>
              <div className="row wrap">
                <button
                  className="btn brand"
                  onClick={async () => {
                    for (let i = 0; i < server.slides.length; i++) {
                      const a = document.createElement("a");
                      a.href = renderUrl(uid, server, `&slide=${i}&download=1`);
                      a.download = "";
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      await new Promise((r) => setTimeout(r, 400));
                    }
                  }}
                >
                  Download all {server.slides.length} slides
                </button>
                <button className="btn" onClick={() => copy(fullText(d), "Caption copied")}>Copy caption</button>
              </div>
            </div>
          ) : null}

          {isVideo ? (
            <>
              {product ? <VideoStudio asset={server} product={product} dirty={dirty} watermark={user.plan !== "pro"} /> : null}
              <div className="slides-strip">
                {server.scenes.map((_, i) => <img key={i} src={renderUrl(uid, server, `&scene=${i}`)} alt="" style={{ height: 150 }} />)}
              </div>
              <button className="btn" onClick={() => copy(fullText(d), "Caption copied")}>Copy caption</button>
            </>
          ) : null}

          {!isVisual && !isCarousel && !isVideo ? (
            <div className="card stack" style={{ gap: 10 }}>
              <h3>Preview</h3>
              {isThread ? (
                d.thread.map((t, i) => (
                  <div key={i} className="social">
                    <div className="who">
                      {product ? <ProductMark p={product} size={40} /> : null}
                      <div><b>{product?.name}</b> <span className="muted small">@{product?.name.toLowerCase().replace(/\s/g, "")}</span></div>
                    </div>
                    <div className="txt">{t}</div>
                  </div>
                ))
              ) : (
                <div className="social">
                  <div className="who">
                    {product ? <ProductMark p={product} size={40} /> : null}
                    <div><b>{product?.name}</b><div className="small muted">{user.name}, Founder</div></div>
                  </div>
                  <div className="txt">{[d.hook && !d.body.startsWith(d.hook) ? d.hook : "", d.body, d.cta && !d.body.includes(d.cta) ? d.cta : ""].filter(Boolean).join("\n\n")}</div>
                  {d.hashtags.length ? <div className="tags">{d.hashtags.join(" ")}</div> : null}
                </div>
              )}
              <div className="row wrap">
                <button className="btn brand" onClick={() => copy(fullText(d), "Post copied — paste it into " + PLATFORM[d.platform].label)}>Copy {isThread ? "thread" : "post"}</button>
                <a className="btn" href={renderUrl(uid, server, "&download=1")}>Download as quote card</a>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
