"use client";

import { useEffect, useRef, useState } from "react";
import type { Asset } from "@/lib/types";
import { renderUrl } from "./ws";

// Deterministic in-browser video rendering: each scene is a template-rendered PNG,
// animated on a canvas (fade + slow zoom) and recorded with MediaRecorder. No AI.

const W = 720;
const H = 1280;
const FPS = 30;
const FADE = 0.35;

function pickMime() {
  const opts = ["video/mp4;codecs=avc1.42E01E", "video/mp4", "video/webm;codecs=vp9", "video/webm"];
  return opts.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) ?? "";
}

function loadImg(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

export default function VideoStudio({ asset, uid, dirty }: { asset: Asset; uid: string; dirty: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"idle" | "loading" | "recording" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const [ext, setExt] = useState("webm");
  const [renderedVersion, setRenderedVersion] = useState(0);
  const total = asset.scenes.reduce((s, x) => s + x.duration, 0);

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  async function render() {
    const cv = canvas.current!;
    const ctx = cv.getContext("2d")!;
    setState("loading");
    setProgress(0);
    try {
      const imgs = await Promise.all(asset.scenes.map((_, i) => loadImg(renderUrl(uid, asset, `&scene=${i}`))));
      const mime = pickMime();
      setExt(mime.includes("mp4") ? "mp4" : "webm");
      const stream = cv.captureStream(FPS);
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 6_000_000 } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      const done = new Promise<void>((r) => (rec.onstop = () => r()));
      const starts: number[] = [];
      asset.scenes.reduce((acc, s, i) => ((starts[i] = acc), acc + s.duration), 0);

      const draw = (t: number) => {
        let i = starts.findIndex((st, k) => t >= st && t < st + asset.scenes[k].duration);
        if (i < 0) i = asset.scenes.length - 1;
        const local = t - starts[i];
        const dur = asset.scenes[i].duration;
        const zoom = 1 + 0.06 * (local / dur);
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, W, H);
        const drawScene = (img: HTMLImageElement, z: number, alpha: number, dy = 0) => {
          ctx.globalAlpha = alpha;
          const w = W * z, h = H * z;
          ctx.drawImage(img, (W - w) / 2, (H - h) / 2 + dy, w, h);
          ctx.globalAlpha = 1;
        };
        drawScene(imgs[i], zoom, 1, (1 - Math.min(1, local / FADE)) * 40);
        // crossfade from previous scene
        if (i > 0 && local < FADE) drawScene(imgs[i - 1], 1.06, 1 - local / FADE);
      };

      draw(0);
      rec.start(250);
      setState("recording");
      const t0 = performance.now();
      await new Promise<void>((resolve) => {
        const tick = () => {
          const t = (performance.now() - t0) / 1000;
          if (t >= total) {
            draw(total - 0.001);
            resolve();
            return;
          }
          draw(t);
          setProgress(t / total);
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      await new Promise((r) => setTimeout(r, 200));
      rec.stop();
      await done;
      const blob = new Blob(chunks, { type: mime || "video/webm" });
      if (url) URL.revokeObjectURL(url);
      setUrl(URL.createObjectURL(blob));
      setRenderedVersion(asset.version);
      setState("done");
    } catch (e) {
      console.error(e);
      setState("error");
    }
  }

  const slug = asset.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "reel";
  const stale = state === "done" && renderedVersion !== asset.version;

  return (
    <div className="card stack" style={{ gap: 10 }}>
      <div className="between">
        <h3>Video studio</h3>
        <span className="small muted">9:16 · {asset.scenes.length} scenes · {total}s</span>
      </div>
      <canvas ref={canvas} width={W} height={H} style={{ display: state === "recording" || state === "loading" ? "block" : "none", width: "100%", borderRadius: 12, background: "#000" }} />
      {state === "idle" || state === "error" ? <img src={renderUrl(uid, asset, "&scene=0")} alt="" style={{ width: "60%", alignSelf: "center", borderRadius: 12 }} /> : null}
      {state === "done" && url ? <video src={url} controls playsInline style={{ width: "100%", borderRadius: 12, background: "#000" }} /> : null}
      {state === "recording" ? (
        <div style={{ height: 6, background: "var(--bg)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ width: `${progress * 100}%`, height: "100%", background: "var(--brand)" }} />
        </div>
      ) : null}
      {state === "error" ? <div className="err">Rendering failed in this browser. Try Chrome.</div> : null}
      {stale ? <div className="small" style={{ color: "var(--warn)" }}>The storyboard changed since this render — render again.</div> : null}
      <div className="row wrap">
        <button className="btn brand" onClick={render} disabled={state === "recording" || state === "loading" || dirty || asset.scenes.length === 0}>
          {state === "recording" ? `Rendering… ${Math.round(progress * 100)}%` : state === "loading" ? "Preparing scenes…" : state === "done" ? "Render again" : "▶ Render video"}
        </button>
        {state === "done" && url ? <a className="btn" href={url} download={`${slug}.${ext}`}>Download {ext.toUpperCase()}</a> : null}
      </div>
      {dirty ? <p className="small muted">Save your changes to render them.</p> : <p className="small muted">Rendered in your browser from ProductPop’s templates — add screenshots to scenes on the left.</p>}
    </div>
  );
}
