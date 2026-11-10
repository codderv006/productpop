"use client";

import { useEffect, useRef, useState } from "react";
import type { Asset, Product } from "@/lib/types";
import { RH, RW, createRenderer, ctaTime, loadAssets, scheduleMusic, type Music, type TransitionStyle } from "@/lib/reel";

// Animated Reel/Short studio: canvas animation + procedural music, recorded in the browser.

function pickMime() {
  const opts = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  return opts.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) ?? "";
}

export default function VideoStudio({ asset, product, dirty }: { asset: Asset; product: Product; dirty: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const [mode, setMode] = useState<"idle" | "loading" | "preview" | "recording" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const [ext, setExt] = useState("webm");
  const [music, setMusic] = useState<Music>("upbeat");
  const [trans, setTrans] = useState<TransitionStyle>("mixed");
  const [renderedKey, setRenderedKey] = useState("");
  const key = `${asset.version}|${music}|${trans}`;

  // draw a static poster frame
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!canvas.current || asset.scenes.length === 0) return;
      const L = await loadAssets(asset, product);
      if (!alive || !canvas.current) return;
      const r = createRenderer(asset, product, L, trans);
      r.draw(canvas.current.getContext("2d")!, Math.min(1.6, asset.scenes[0].duration - 0.1));
    })();
    return () => { alive = false; };
  }, [asset, product, trans]);

  useEffect(() => () => { stopRef.current?.(); if (url) URL.revokeObjectURL(url); }, [url]);

  async function run(record: boolean) {
    stopRef.current?.();
    const cv = canvas.current!;
    const ctx = cv.getContext("2d")!;
    setMode("loading");
    setProgress(0);
    try {
      const L = await loadAssets(asset, product);
      const r = createRenderer(asset, product, L, trans);
      const ac = new AudioContext();
      await ac.resume();
      const dest = ac.createMediaStreamDestination();
      const out = ac.createGain();
      out.connect(dest);
      if (!record) out.connect(ac.destination);
      else {
        // let the user hear it while recording, quietly
        const mon = ac.createGain();
        mon.gain.value = 0.6;
        out.connect(mon).connect(ac.destination);
      }
      const startAt = ac.currentTime + 0.15;
      scheduleMusic(ac, out, startAt, r.total, music, r.starts.slice(1), ctaTime(asset, r.starts));

      let rec: MediaRecorder | null = null;
      const chunks: Blob[] = [];
      let mime = "";
      if (record) {
        mime = pickMime();
        setExt(mime.includes("mp4") ? "mp4" : "webm");
        const stream = new MediaStream([...cv.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
        rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 8_000_000, audioBitsPerSecond: 160_000 } : undefined);
        rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      }
      const done = rec ? new Promise<void>((res) => (rec!.onstop = () => res())) : Promise.resolve();

      r.draw(ctx, 0);
      setMode(record ? "recording" : "preview");
      // align recorder/animation start with audio start
      await new Promise((res) => setTimeout(res, Math.max(0, (startAt - ac.currentTime) * 1000)));
      rec?.start(250);
      let stopped = false;
      stopRef.current = () => { stopped = true; };
      await new Promise<void>((resolve) => {
        const tick = () => {
          const t = ac.currentTime - startAt;
          if (stopped || t >= r.total) { r.draw(ctx, Math.min(t, r.total - 0.001)); resolve(); return; }
          r.draw(ctx, Math.max(0, t));
          setProgress(t / r.total);
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      stopRef.current = null;
      if (rec) {
        await new Promise((res) => setTimeout(res, 250));
        rec.stop();
        await done;
      }
      ac.close();
      if (record && !stopped) {
        const blob = new Blob(chunks, { type: mime || "video/webm" });
        if (url) URL.revokeObjectURL(url);
        setUrl(URL.createObjectURL(blob));
        setRenderedKey(key);
        setMode("done");
      } else setMode(url ? "done" : "idle");
    } catch (e) {
      console.error(e);
      setMode("error");
    }
  }

  const busy = mode === "loading" || mode === "preview" || mode === "recording";
  const slug = asset.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "reel";
  const total = asset.scenes.reduce((s, x) => s + x.duration, 0);

  return (
    <div className="card stack" style={{ gap: 12 }}>
      <div className="between">
        <h3>Video studio</h3>
        <span className="small muted">9:16 · {asset.scenes.length} scenes · {total}s</span>
      </div>
      <canvas ref={canvas} width={RW} height={RH} style={{ display: mode === "done" ? "none" : "block", width: "100%", maxWidth: 340, alignSelf: "center", borderRadius: 14, background: "#000" }} />
      {mode === "done" && url ? <video src={url} controls playsInline style={{ width: "100%", maxWidth: 340, alignSelf: "center", borderRadius: 14, background: "#000" }} /> : null}
      {busy ? (
        <div style={{ height: 6, background: "var(--bg)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ width: `${progress * 100}%`, height: "100%", background: mode === "recording" ? "var(--claude)" : "var(--brand)" }} />
        </div>
      ) : null}
      <div className="grid g2">
        <label className="f">Music
          <select className="input" value={music} disabled={busy} onChange={(e) => setMusic(e.target.value as Music)}>
            <option value="upbeat">Upbeat (112 bpm)</option>
            <option value="chill">Chill (84 bpm)</option>
            <option value="none">No music (SFX only)</option>
          </select>
        </label>
        <label className="f">Transitions
          <select className="input" value={trans} disabled={busy} onChange={(e) => setTrans(e.target.value as TransitionStyle)}>
            <option value="mixed">Mixed</option>
            <option value="push">Push</option>
            <option value="zoom">Zoom</option>
            <option value="wipe">Wipe</option>
          </select>
        </label>
      </div>
      {mode === "error" ? <div className="err">Rendering failed in this browser — try Chrome.</div> : null}
      {mode === "done" && renderedKey !== key ? <div className="small" style={{ color: "var(--warn)" }}>Settings or storyboard changed — render again to update the file.</div> : null}
      <div className="row wrap">
        {busy ? (
          <button className="btn" onClick={() => stopRef.current?.()}>■ Stop</button>
        ) : (
          <>
            <button className="btn" onClick={() => { setMode("idle"); run(false); }} disabled={dirty || asset.scenes.length === 0}>▶ Preview with sound</button>
            <button className="btn brand" onClick={() => run(true)} disabled={dirty || asset.scenes.length === 0}>{mode === "done" ? "Render again" : "● Render video"}</button>
          </>
        )}
        {mode === "done" && url ? <a className="btn primary" href={url} download={`${slug}.${ext}`}>Download {ext.toUpperCase()}</a> : null}
      </div>
      <p className="small muted">
        {dirty ? "Save your changes to render them. " : ""}Animated text, transitions and a generated soundtrack — rendered in your browser from ProductPop’s templates. Add screenshots to scenes on the left.
      </p>
    </div>
  );
}
