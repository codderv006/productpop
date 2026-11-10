"use client";

// ProductPop Reel engine — deterministic, in-browser.
// Draws animated scenes on a canvas, composes transitions, synthesises a music bed
// with WebAudio, and records both with MediaRecorder. No AI, no external services.

import type { Asset, Product } from "./types";

export const RW = 720;
export const RH = 1280;
const S = RW / 1080; // design units are 1080-wide
const TRANS = 0.5; // transition seconds

export type Music = "upbeat" | "chill" | "none";
export type TransitionStyle = "mixed" | "push" | "zoom" | "wipe";

type Loaded = { logo?: HTMLImageElement; images: (HTMLImageElement | undefined)[] };

// ---------- easing ----------
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
const easeInOut = (t: number) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const back = (t: number) => { t = clamp(t); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

function rgba(hex: string, a: number) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[][] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[][] = [];
  let cur: string[] = [];
  for (const w of words) {
    const test = [...cur, w].join(" ");
    if (ctx.measureText(test).width > maxW && cur.length) {
      lines.push(cur);
      cur = [w];
    } else cur.push(w);
  }
  if (cur.length) lines.push(cur);
  return lines;
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number, start: number, min: number, weight = 800) {
  for (let size = start; size >= min; size -= 4) {
    ctx.font = `${weight} ${size}px Jakarta, system-ui, sans-serif`;
    if (wrap(ctx, text, maxW).length <= maxLines) return size;
  }
  return min;
}

// ---------- scene drawing ----------

function drawBackground(ctx: CanvasRenderingContext2D, p: Product, t: number, seed: number) {
  const b = p.brand;
  ctx.fillStyle = b.background;
  ctx.fillRect(0, 0, RW, RH);
  const drift = Math.sin(t * 0.6 + seed) * 60;
  const g1 = ctx.createRadialGradient(RW * 0.9 + drift, -40 + drift * 0.5, 0, RW * 0.9 + drift, -40, RH * 0.75);
  g1.addColorStop(0, rgba(b.primary, 0.7));
  g1.addColorStop(1, rgba(b.primary, 0));
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, RW, RH);
  const g2 = ctx.createRadialGradient(-20 - drift, RH + 20, 0, -20, RH, RH * 0.6);
  g2.addColorStop(0, rgba(b.accent, 0.4));
  g2.addColorStop(1, rgba(b.accent, 0));
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, RW, RH);
}

function drawBrand(ctx: CanvasRenderingContext2D, p: Product, L: Loaded, x: number, y: number, size: number, alpha = 1) {
  ctx.globalAlpha = alpha;
  const box = size * 1.6;
  if (L.logo) {
    ctx.save();
    roundRect(ctx, x, y, box, box, box * 0.25);
    ctx.clip();
    ctx.drawImage(L.logo, x, y, box, box);
    ctx.restore();
  } else {
    const g = ctx.createLinearGradient(x, y, x + box, y + box);
    g.addColorStop(0, p.brand.primary);
    g.addColorStop(1, p.brand.accent);
    ctx.fillStyle = g;
    roundRect(ctx, x, y, box, box, box * 0.25);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = `800 ${size}px Jakarta, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(p.name.slice(0, 1).toUpperCase(), x + box / 2, y + box / 2 + 1);
  }
  ctx.fillStyle = p.brand.text;
  ctx.font = `700 ${size}px Jakarta, system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(p.name, x + box + size * 0.5, y + box / 2 + 1);
  ctx.globalAlpha = 1;
}

/** Draw scene i at local time lt (seconds since the scene started). */
function drawScene(ctx: CanvasRenderingContext2D, a: Asset, p: Product, L: Loaded, i: number, lt: number, gt: number, wm = false) {
  const sc = a.scenes[i];
  const n = a.scenes.length;
  const isLast = i === n - 1 && n > 1;
  const b = p.brand;
  drawBackground(ctx, p, gt, i);

  // header: brand + progress
  drawBrand(ctx, p, L, 70 * S, 140 * S, 34 * S);
  const barW = 46 * S, gap = 8 * S;
  let bx = RW - 70 * S - n * barW - (n - 1) * gap;
  for (let k = 0; k < n; k++) {
    ctx.fillStyle = rgba(b.text, 0.25);
    roundRect(ctx, bx, 160 * S, barW, 8 * S, 4 * S);
    ctx.fill();
    const fill = k < i ? 1 : k === i ? clamp(lt / sc.duration) : 0;
    if (fill > 0) {
      ctx.fillStyle = b.accent;
      roundRect(ctx, bx, 160 * S, barW * fill, 8 * S, 4 * S);
      ctx.fill();
    }
    bx += barW + gap;
  }

  const pad = 90 * S;
  const maxW = RW - pad * 2;
  let textTop: number;
  const img = L.images[i];

  if (img) {
    const enter = easeOut(lt / 0.6);
    const y0 = 330 * S + (1 - enter) * 80 * S;
    const h = 780 * S;
    ctx.save();
    ctx.globalAlpha = enter;
    roundRect(ctx, pad, y0, maxW, h, 36 * S);
    ctx.clip();
    const z = 1 + 0.08 * clamp(lt / sc.duration);
    const ratio = Math.max(maxW / img.width, h / img.height) * z;
    const iw = img.width * ratio, ih = img.height * ratio;
    ctx.drawImage(img, pad + (maxW - iw) / 2, y0, iw, ih);
    ctx.restore();
    ctx.strokeStyle = rgba(b.text, 0.18 * enter);
    ctx.lineWidth = 3 * S;
    roundRect(ctx, pad, y0, maxW, h, 36 * S);
    ctx.stroke();
    textTop = 1190 * S;
  } else {
    textTop = isLast ? 700 * S : 760 * S;
  }

  // headline: word-by-word rise
  const size = fitFont(ctx, sc.text, maxW, img ? 3 : 4, img ? 96 * S : 128 * S, 56 * S);
  ctx.font = `800 ${size}px Jakarta, system-ui, sans-serif`;
  const lines = wrap(ctx, sc.text, maxW);
  const lh = size * 1.08;
  const blockH = lines.length * lh;
  const subH = sc.subtext ? 44 * S * 1.35 * 2 + 50 * S : 0;
  let y = img ? textTop : Math.round(RH * 0.5 - (blockH + subH) / 2 - (isLast ? 60 * S : 0));
  ctx.textBaseline = "top";
  let wi = 0;
  for (const line of lines) {
    const lineText = line.join(" ");
    const lineW = ctx.measureText(lineText).width;
    let x = isLast ? (RW - lineW) / 2 : pad;
    for (const w of line) {
      const t = (lt - 0.12 - wi * 0.075) / 0.45;
      const e = easeOut(t);
      ctx.globalAlpha = clamp(t * 1.5);
      ctx.fillStyle = b.text;
      ctx.textAlign = "left";
      ctx.fillText(w, x, y + (1 - e) * 46 * S);
      x += ctx.measureText(w + " ").width;
      wi++;
    }
    y += lh;
  }
  ctx.globalAlpha = 1;
  // accent underline sweep under headline
  const lineDone = 0.12 + wi * 0.075 + 0.2;
  const sweep = easeInOut((lt - lineDone) / 0.5);
  if (sweep > 0 && !isLast) {
    ctx.fillStyle = b.accent;
    roundRect(ctx, pad, y + 14 * S, 140 * S * sweep, 10 * S, 5 * S);
    ctx.fill();
  }

  // subtext
  let sy = y + 50 * S;
  if (sc.subtext) {
    const t = (lt - lineDone) / 0.5;
    ctx.globalAlpha = clamp(t) * 0.82;
    const ss = 44 * S;
    ctx.font = `500 ${ss}px Jakarta, system-ui, sans-serif`;
    ctx.fillStyle = b.text;
    for (const line of wrap(ctx, sc.subtext, maxW)) {
      const s = line.join(" ");
      const w = ctx.measureText(s).width;
      ctx.fillText(s, isLast ? (RW - w) / 2 : pad, sy + (1 - easeOut(t)) * 24 * S);
      sy += ss * 1.35;
    }
    ctx.globalAlpha = 1;
  }

  // CTA pop on last scene
  const cta = (a.cta || "").split(/[.!\n]/)[0].trim();
  if (isLast && cta) {
    const t = (lt - lineDone - 0.2) / 0.5;
    if (t > 0) {
      const sc2 = back(t);
      ctx.font = `700 ${46 * S}px Jakarta, system-ui, sans-serif`;
      const tw = ctx.measureText(cta).width;
      const w = tw + 120 * S, h = 110 * S;
      const cx = RW / 2, cy = sy + 90 * S;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(sc2, sc2);
      ctx.fillStyle = b.primary;
      ctx.shadowColor = rgba(b.primary, 0.6);
      ctx.shadowBlur = 40 * S;
      roundRect(ctx, -w / 2, -h / 2, w, h, h / 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(cta, 0, 2);
      ctx.restore();
    }
  }

  // footer url
  const site = p.website.replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (site) {
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = b.text;
    ctx.font = `500 ${30 * S}px Jakarta, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(site, RW / 2, RH - (wm ? 120 : 90) * S);
    ctx.globalAlpha = 1;
  }
  if (wm) drawWatermark(ctx);
  ctx.textAlign = "left";
}

function drawWatermark(ctx: CanvasRenderingContext2D) {
  const fs = 22 * S;
  ctx.font = `700 ${fs}px Jakarta, system-ui, sans-serif`;
  const label = "Made with ProductPop";
  const tw = ctx.measureText(label).width;
  const icon = 26 * S, gap = 10 * S, padX = 18 * S, h = 46 * S;
  const w = padX * 2 + icon + gap + tw;
  const x = (RW - w) / 2, y = RH - 40 * S - h;
  ctx.fillStyle = "rgba(15,12,30,0.62)";
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  const ix = x + padX, iy = y + (h - icon) / 2, k = icon / 64;
  ctx.fillStyle = "#15131F"; roundRect(ctx, ix, iy, icon, icon, 16 * k); ctx.fill();
  const dot = (cx: number, cy: number, r: number, c: string) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(ix + cx * k, iy + cy * k, r * k, 0, Math.PI * 2); ctx.fill(); };
  dot(27, 36, 14, "#7C5CFF"); dot(42, 22, 8, "#22D3EE"); dot(48, 40, 4, "#FF7A59");
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, ix + icon + gap, y + h / 2 + 1);
}

// ---------- timeline ----------

export function timeline(a: Asset) {
  const starts: number[] = [];
  let acc = 0;
  a.scenes.forEach((s, i) => { starts[i] = acc; acc += s.duration; });
  return { starts, total: acc + 0.6 }; // small tail hold
}

function sceneAt(starts: number[], a: Asset, t: number) {
  for (let i = a.scenes.length - 1; i >= 0; i--) if (t >= starts[i]) return i;
  return 0;
}

export function createRenderer(a: Asset, p: Product, L: Loaded, style: TransitionStyle, wm = false) {
  const { starts, total } = timeline(a);
  const A = document.createElement("canvas");
  const B = document.createElement("canvas");
  A.width = B.width = RW;
  A.height = B.height = RH;
  const ca = A.getContext("2d")!;
  const cb = B.getContext("2d")!;
  const kinds: Exclude<TransitionStyle, "mixed">[] = ["push", "zoom", "wipe"];

  return {
    total,
    starts,
    draw(ctx: CanvasRenderingContext2D, t: number) {
      const i = sceneAt(starts, a, t);
      const lt = t - starts[i];
      // during the first TRANS seconds of scene i (>0), transition from i-1
      if (i > 0 && lt < TRANS) {
        const k = style === "mixed" ? kinds[(i - 1) % kinds.length] : style;
        const prevLt = lt + a.scenes[i - 1].duration;
        drawScene(ca, a, p, L, i - 1, Math.min(prevLt, a.scenes[i - 1].duration + 2), t, wm);
        drawScene(cb, a, p, L, i, lt, t, wm);
        const e = easeInOut(lt / TRANS);
        ctx.save();
        if (k === "push") {
          ctx.drawImage(A, -e * RW, 0);
          ctx.drawImage(B, (1 - e) * RW, 0);
        } else if (k === "zoom") {
          ctx.globalAlpha = 1;
          const z = 1 + e * 0.25;
          ctx.translate(RW / 2, RH / 2);
          ctx.scale(z, z);
          ctx.drawImage(A, -RW / 2, -RH / 2);
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.globalAlpha = e;
          const z2 = 0.9 + e * 0.1;
          ctx.translate(RW / 2, RH / 2);
          ctx.scale(z2, z2);
          ctx.drawImage(B, -RW / 2, -RH / 2);
        } else {
          ctx.drawImage(A, 0, 0);
          const h = RH * e;
          ctx.beginPath();
          ctx.rect(0, RH - h, RW, h);
          ctx.clip();
          ctx.drawImage(B, 0, 0);
        }
        ctx.restore();
        ctx.globalAlpha = 1;
        return;
      }
      drawScene(ctx, a, p, L, i, lt, t, wm);
    },
  };
}

// ---------- music (procedural WebAudio) ----------

const NOTE = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export function scheduleMusic(ac: AudioContext, out: AudioNode, startAt: number, total: number, music: Music, transitions: number[], ctaAt: number | null) {
  const master = ac.createGain();
  master.gain.setValueAtTime(0.0001, startAt);
  master.gain.exponentialRampToValueAtTime(0.9, startAt + 0.4);
  master.gain.setValueAtTime(0.9, startAt + total - 1.2);
  master.gain.exponentialRampToValueAtTime(0.0001, startAt + total);
  master.connect(out);

  const noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

  // whoosh on each transition
  for (const tt of transitions) {
    const at = startAt + tt - 0.05;
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(300, at);
    bp.frequency.exponentialRampToValueAtTime(4000, at + 0.45);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.35, at + 0.18);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.55);
    src.connect(bp).connect(g).connect(master);
    src.start(at);
    src.stop(at + 0.6);
  }
  // pop on CTA
  if (ctaAt !== null) {
    const at = startAt + ctaAt;
    const o = ac.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(500, at);
    o.frequency.exponentialRampToValueAtTime(1200, at + 0.08);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.4, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.25);
    o.connect(g).connect(master);
    o.start(at);
    o.stop(at + 0.3);
  }
  if (music === "none") return;

  const upbeat = music === "upbeat";
  const bpm = upbeat ? 112 : 84;
  const beat = 60 / bpm;
  // I–V–vi–IV in C (or A minor feel for chill)
  const prog = upbeat ? [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]] : [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
  const bars = Math.ceil(total / (beat * 4)) + 1;

  const padBus = ac.createGain();
  padBus.gain.value = upbeat ? 0.09 : 0.12;
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = upbeat ? 1800 : 1100;
  padBus.connect(lp).connect(master);

  for (let bar = 0; bar < bars; bar++) {
    const chord = prog[bar % 4];
    const t0 = startAt + bar * beat * 4;
    if (t0 > startAt + total) break;
    // pad
    for (const m of chord) {
      for (const det of [-6, 6]) {
        const o = ac.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = NOTE(m);
        o.detune.value = det;
        const g = ac.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(0.5, t0 + 0.3);
        g.gain.linearRampToValueAtTime(0.35, t0 + beat * 4 - 0.1);
        g.gain.linearRampToValueAtTime(0.0001, t0 + beat * 4 + 0.2);
        o.connect(g).connect(padBus);
        o.start(t0);
        o.stop(t0 + beat * 4 + 0.3);
      }
    }
    // bass + drums per beat
    for (let k = 0; k < 4; k++) {
      const bt = t0 + k * beat;
      // bass
      const bo = ac.createOscillator();
      bo.type = "triangle";
      bo.frequency.value = NOTE(chord[0] - 24);
      const bg = ac.createGain();
      bg.gain.setValueAtTime(0.0001, bt);
      bg.gain.exponentialRampToValueAtTime(upbeat ? 0.35 : 0.25, bt + 0.02);
      bg.gain.exponentialRampToValueAtTime(0.0001, bt + beat * 0.9);
      bo.connect(bg).connect(master);
      bo.start(bt);
      bo.stop(bt + beat);
      // kick
      if (upbeat || k % 2 === 0) {
        const ko = ac.createOscillator();
        ko.frequency.setValueAtTime(150, bt);
        ko.frequency.exponentialRampToValueAtTime(45, bt + 0.12);
        const kg = ac.createGain();
        kg.gain.setValueAtTime(upbeat ? 0.6 : 0.4, bt);
        kg.gain.exponentialRampToValueAtTime(0.0001, bt + 0.25);
        ko.connect(kg).connect(master);
        ko.start(bt);
        ko.stop(bt + 0.3);
      }
      // snare/clap on 2 and 4
      if (k % 2 === 1) {
        const s = ac.createBufferSource();
        s.buffer = noiseBuf;
        const hp = ac.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 1500;
        const sg = ac.createGain();
        sg.gain.setValueAtTime(upbeat ? 0.22 : 0.1, bt);
        sg.gain.exponentialRampToValueAtTime(0.0001, bt + 0.15);
        s.connect(hp).connect(sg).connect(master);
        s.start(bt, Math.random() * 0.5);
        s.stop(bt + 0.2);
      }
      // hats on 8ths
      if (upbeat) {
        for (const off of [0, 0.5]) {
          const ht = bt + off * beat;
          const h = ac.createBufferSource();
          h.buffer = noiseBuf;
          const hp = ac.createBiquadFilter();
          hp.type = "highpass";
          hp.frequency.value = 7000;
          const hg = ac.createGain();
          hg.gain.setValueAtTime(off ? 0.08 : 0.05, ht);
          hg.gain.exponentialRampToValueAtTime(0.0001, ht + 0.05);
          h.connect(hp).connect(hg).connect(master);
          h.start(ht, Math.random() * 0.5);
          h.stop(ht + 0.06);
        }
      }
    }
  }
}

export function ctaTime(a: Asset, starts: number[]) {
  const n = a.scenes.length;
  if (n < 2 || !a.cta) return null;
  const words = a.scenes[n - 1].text.split(/\s+/).filter(Boolean).length;
  return starts[n - 1] + 0.12 + words * 0.075 + 0.2 + 0.2;
}

export function loadImage(src: string) {
  return new Promise<HTMLImageElement | undefined>((res) => {
    if (!src) return res(undefined);
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = () => res(undefined);
    i.src = src;
  });
}

export async function loadAssets(a: Asset, p: Product): Promise<Loaded> {
  try {
    await Promise.all([document.fonts.load(`800 40px Jakarta`), document.fonts.load(`700 40px Jakarta`), document.fonts.load(`500 40px Jakarta`)]);
  } catch {}
  const [logo, ...images] = await Promise.all([loadImage(p.logoUrl), ...a.scenes.map((s) => loadImage(s.imageUrl || ""))]);
  return { logo, images };
}
