import { ImageResponse } from "next/og";
import { getWorkspace } from "@/lib/workspace";
import { getMedia } from "@/lib/store";
import { CarouselSlide, SceneFrame, SIZES, TextCard, VisualPost } from "@/lib/templates";
import type { Aspect } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FONT_CDN = "https://cdn.jsdelivr.net/npm/@fontsource/plus-jakarta-sans@5/files";
let fontCache: { name: string; data: ArrayBuffer; weight: 400 | 500 | 700 | 800; style: "normal" }[] | null = null;
async function fonts() {
  if (fontCache) return fontCache;
  try {
    const w = [400, 500, 700, 800] as const;
    fontCache = await Promise.all(
      w.map(async (weight) => {
        const r = await fetch(`${FONT_CDN}/plus-jakarta-sans-latin-${weight}-normal.woff`, { cache: "force-cache" });
        if (!r.ok) throw new Error("font");
        return { name: "Jakarta", data: await r.arrayBuffer(), weight, style: "normal" as const };
      })
    );
    return fontCache;
  } catch {
    return undefined;
  }
}

async function resolveImage(url: string | undefined, base: string): Promise<string | undefined> {
  if (!url) return undefined;
  try {
    if (url.startsWith("/api/media/")) {
      const m = await getMedia(`media/${url.slice("/api/media/".length)}`);
      if (!m || m.contentType === "image/svg+xml" && false) return undefined;
      return m ? `data:${m.contentType};base64,${m.body.toString("base64")}` : undefined;
    }
    if (/^https?:\/\//.test(url)) return url;
    return base + url;
  } catch {
    return undefined;
  }
}

type Ctx = { params: Promise<{ uid: string; aid: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { uid, aid } = await ctx.params;
  const u = new URL(req.url);
  const ws = await getWorkspace(uid);
  const asset = ws.assets.find((a) => a.id === aid);
  if (!asset) return new Response("Not found", { status: 404 });
  const product = ws.products.find((p) => p.id === asset.productId);
  if (!product) return new Response("Product missing", { status: 404 });

  const slide = Number(u.searchParams.get("slide") ?? "0") || 0;
  const scene = u.searchParams.get("scene");
  const download = u.searchParams.get("download") === "1";
  const base = u.origin;
  const logo = await resolveImage(product.logoUrl, base);

  let el: React.ReactElement;
  let size: { width: number; height: number };
  if (scene !== null) {
    const i = Number(scene) || 0;
    const image = await resolveImage(asset.scenes[i]?.imageUrl, base);
    el = <SceneFrame asset={asset} index={i} ctx={{ product, logo, image, aspect: "story" }} />;
    size = SIZES.story;
  } else if (asset.format === "carousel") {
    const aspect: Aspect = asset.visual.aspect === "landscape" ? "square" : asset.visual.aspect;
    el = <CarouselSlide asset={asset} index={slide} ctx={{ product, logo, aspect }} />;
    size = SIZES[aspect];
  } else if (asset.format === "visual_post") {
    const image = await resolveImage(asset.visual.imageUrl, base);
    el = <VisualPost asset={asset} ctx={{ product, logo, image, aspect: asset.visual.aspect }} />;
    size = SIZES[asset.visual.aspect];
  } else {
    el = <TextCard asset={asset} ctx={{ product, logo, aspect: asset.visual.aspect }} />;
    size = SIZES[asset.visual.aspect];
  }

  const img = new ImageResponse(el, { ...size, fonts: await fonts(), emoji: "twemoji" });
  const headers = new Headers(img.headers);
  headers.set("Cache-Control", "public, max-age=60");
  if (download) {
    const slug = asset.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "asset";
    const suffix = scene !== null ? `-scene-${Number(scene) + 1}` : asset.format === "carousel" ? `-slide-${slide + 1}` : "";
    headers.set("Content-Disposition", `attachment; filename="${slug}${suffix}.png"`);
  }
  return new Response(img.body, { status: 200, headers });
}
