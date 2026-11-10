import crypto from "crypto";
import { mutateDoc, readDoc } from "./store";
import type {
  Actor, Asset, AssetFormat, AssetStatus, Aspect, Brand, Campaign, Platform, Product, Scene, Slide, VisualTemplate, Workspace,
} from "./types";

const key = (userId: string) => `workspaces/${userId}.json`;
const empty = (userId: string): Workspace => ({ userId, products: [], campaigns: [], assets: [], activity: [] });

export const id = (prefix: string) => `${prefix}_${crypto.randomBytes(5).toString("hex")}`;
const now = () => new Date().toISOString();

export class NotFound extends Error {}
export class BadInput extends Error {}

export async function getWorkspace(userId: string): Promise<Workspace> {
  const doc = await readDoc<Workspace>(key(userId));
  return doc?.data ?? empty(userId);
}

export function mutate<R>(userId: string, fn: (ws: Workspace) => R) {
  return mutateDoc<Workspace, R>(key(userId), () => empty(userId), fn);
}

function log(ws: Workspace, actor: Actor, summary: string, link?: string) {
  ws.activity.unshift({ at: now(), actor, summary, link });
  ws.activity = ws.activity.slice(0, 60);
}

// ---------- normalisation helpers ----------

const PLATFORMS: Platform[] = ["linkedin", "x", "instagram", "youtube_shorts", "reels"];
const FORMATS: AssetFormat[] = ["text_post", "thread", "visual_post", "carousel", "video_script"];
const STATUSES: AssetStatus[] = ["draft", "ready", "scheduled", "published"];
const TEMPLATES: VisualTemplate[] = ["announcement", "quote", "stat", "feature"];
const ASPECTS: Aspect[] = ["square", "portrait", "landscape"];

const str = (v: unknown, max = 5000) => (typeof v === "string" ? v.slice(0, max) : v == null ? "" : String(v).slice(0, max));
const strArr = (v: unknown, max = 30): string[] =>
  Array.isArray(v) ? v.map((x) => str(x, 3000)).filter(Boolean).slice(0, max) : typeof v === "string" && v ? v.split(/\n|,/).map((s) => s.trim()).filter(Boolean).slice(0, max) : [];

function pick<T extends string>(v: unknown, allowed: T[], fallback: T): T {
  const s = str(v).toLowerCase().trim().replace(/[\s-]+/g, "_");
  const alias: Record<string, string> = {
    twitter: "x", "x_twitter": "x", tweet: "text_post", post: "text_post", image: "visual_post", graphic: "visual_post",
    image_post: "visual_post", youtube: "youtube_shorts", shorts: "youtube_shorts", youtube_short: "youtube_shorts",
    instagram_reel: "reels", reel: "reels", ig: "instagram", script: "video_script", video: "video_script",
    reel_script: "video_script", short_video: "video_script", carousel_post: "carousel", x_thread: "thread",
    linkedin_post: "text_post", scheduled_: "scheduled", approved: "ready", done: "published", posted: "published",
  };
  const candidate = (alias[s] ?? s) as T;
  return allowed.includes(candidate) ? candidate : fallback;
}

const color = (v: unknown, fallback: string) => {
  const s = str(v).trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s) ? s : fallback;
};

const dateStr = (v: unknown): string => {
  const s = str(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  if (!s) return "";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

const addDays = (date: string, days: number) => {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

function normSlides(v: unknown): Slide[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 10).map((s) => {
    const o = (typeof s === "object" && s) ? (s as Record<string, unknown>) : ({ heading: s } as Record<string, unknown>);
    return { heading: str(o.heading ?? o.title ?? o.headline, 200), body: str(o.body ?? o.text ?? o.content, 600), imageUrl: str(o.imageUrl ?? o.image_url, 1000) || undefined };
  });
}

function normScenes(v: unknown): Scene[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 12).map((s) => {
    const o = (typeof s === "object" && s) ? (s as Record<string, unknown>) : ({ text: s } as Record<string, unknown>);
    const dur = Number(o.duration ?? o.duration_seconds ?? o.seconds ?? 3);
    return {
      text: str(o.text ?? o.overlay ?? o.text_overlay ?? o.heading, 140),
      subtext: str(o.subtext ?? o.caption ?? o.voiceover ?? "", 240),
      duration: Math.min(10, Math.max(1, isFinite(dur) ? dur : 3)),
      visual: str(o.visual ?? o.shot ?? o.direction ?? "", 300),
      imageUrl: str(o.imageUrl ?? o.image_url, 1000) || undefined,
    };
  });
}

function defaultAspect(platform: Platform, format: AssetFormat): Aspect {
  if (format === "carousel") return "portrait";
  if (platform === "x" || platform === "linkedin") return format === "visual_post" && platform === "linkedin" ? "square" : "landscape";
  return "portrait";
}

export function buildAsset(input: Record<string, unknown>, campaign: Campaign, actor: Actor, index = 0): Asset {
  const platform = pick(input.platform, PLATFORMS, "linkedin");
  const format = pick(input.format ?? input.type, FORMATS, platform === "reels" || platform === "youtube_shorts" ? "video_script" : "text_post");
  const visualIn = (typeof input.visual === "object" && input.visual ? input.visual : {}) as Record<string, unknown>;
  const day = Number(input.day);
  const scheduled = dateStr(input.scheduledDate ?? input.scheduled_date ?? input.date) ||
    (campaign.startDate ? addDays(campaign.startDate, isFinite(day) && day > 0 ? day - 1 : index) : "");
  const hook = str(input.hook, 400);
  const t = now();
  return {
    id: id("a"),
    campaignId: campaign.id,
    productId: campaign.productId,
    platform,
    format,
    title: str(input.title, 200) || `${labelPlatform(platform)} ${labelFormat(format)}`,
    hook,
    body: str(input.body ?? input.caption ?? input.text, 6000),
    cta: str(input.cta, 300),
    hashtags: strArr(input.hashtags, 15).map((h) => (h.startsWith("#") ? h : "#" + h.replace(/\s+/g, ""))),
    thread: strArr(input.thread ?? input.tweets, 15),
    slides: normSlides(input.slides),
    scenes: normScenes(input.scenes ?? input.storyboard),
    visual: {
      template: pick(visualIn.template ?? input.template, TEMPLATES, "announcement"),
      aspect: pick(visualIn.aspect ?? input.aspect, ASPECTS, defaultAspect(platform, format)),
      headline: str(visualIn.headline ?? input.headline, 160) || hook.slice(0, 120),
      subtext: str(visualIn.subtext ?? input.subtext, 260),
      stat: str(visualIn.stat ?? input.stat, 30) || undefined,
      imageUrl: str(visualIn.imageUrl ?? visualIn.image_url, 1000) || undefined,
    },
    scheduledDate: scheduled,
    status: pick(input.status, STATUSES, "draft"),
    publishedUrl: str(input.publishedUrl ?? input.published_url, 1000),
    version: 1,
    createdAt: t,
    updatedAt: t,
    createdBy: actor,
    updatedBy: actor,
  };
}

export function labelPlatform(p: Platform) {
  return { linkedin: "LinkedIn", x: "X", instagram: "Instagram", youtube_shorts: "YouTube Shorts", reels: "Instagram Reels" }[p];
}
export function labelFormat(f: AssetFormat) {
  return { text_post: "post", thread: "thread", visual_post: "visual post", carousel: "carousel", video_script: "video" }[f];
}

// ---------- products ----------

const DEFAULT_BRAND: Brand = { primary: "#5B3DF5", accent: "#14B8A6", background: "#0F0B1E", text: "#FFFFFF" };

export function findProduct(ws: Workspace, ref: string): Product | undefined {
  if (!ref) return ws.products.length === 1 ? ws.products[0] : undefined;
  const r = ref.toLowerCase().trim();
  return ws.products.find((p) => p.id === ref) ?? ws.products.find((p) => p.name.toLowerCase() === r);
}

export function applyProduct(p: Product, input: Record<string, unknown>, actor: Actor) {
  const has = (k: string) => input[k] !== undefined && input[k] !== null;
  if (has("name")) p.name = str(input.name, 120) || p.name;
  if (has("tagline")) p.tagline = str(input.tagline, 200);
  if (has("website")) p.website = str(input.website, 300);
  if (has("category")) p.category = str(input.category, 120);
  if (has("description")) p.description = str(input.description, 3000);
  if (has("audience") || has("target_audience")) p.audience = str(input.audience ?? input.target_audience, 1000);
  if (has("features") || has("key_features")) p.features = strArr(input.features ?? input.key_features, 15);
  if (has("voice") || has("tone")) p.voice = str(input.voice ?? input.tone, 500);
  if (has("logoUrl") || has("logo_url")) p.logoUrl = str(input.logoUrl ?? input.logo_url, 1000);
  if (has("screenshots")) p.screenshots = strArr(input.screenshots, 12);
  const b = (input.brand ?? input.brand_colors ?? input.colors) as Record<string, unknown> | undefined;
  if (b && typeof b === "object") {
    p.brand = {
      primary: color(b.primary, p.brand.primary),
      accent: color(b.accent ?? b.secondary, p.brand.accent),
      background: color(b.background ?? b.bg, p.brand.background),
      text: color(b.text ?? b.foreground, p.brand.text),
    };
  }
  p.updatedAt = now();
  p.updatedBy = actor;
}

export function newProduct(input: Record<string, unknown>, actor: Actor): Product {
  const name = str(input.name, 120).trim();
  if (!name) throw new BadInput("Product name is required");
  const t = now();
  const p: Product = {
    id: id("p"), name, tagline: "", website: "", category: "", description: "", audience: "", features: [], voice: "",
    brand: { ...DEFAULT_BRAND }, logoUrl: "", screenshots: [], createdAt: t, updatedAt: t, updatedBy: actor,
  };
  applyProduct(p, input, actor);
  return p;
}

export async function saveProduct(userId: string, input: Record<string, unknown>, actor: Actor) {
  return mutate(userId, (ws) => {
    const ref = str(input.id ?? input.product_id);
    let p = ref ? findProduct(ws, ref) : undefined;
    if (!p && !ref && input.name) p = findProduct(ws, str(input.name));
    if (ref && !p) throw new NotFound(`No product with id ${ref}`);
    if (p) {
      applyProduct(p, input, actor);
      log(ws, actor, `Updated product ${p.name}`, `/products/${p.id}`);
      return { product: p, created: false };
    }
    const np = newProduct(input, actor);
    ws.products.push(np);
    log(ws, actor, `Created product ${np.name}`, `/products/${np.id}`);
    return { product: np, created: true };
  });
}

export async function deleteProduct(userId: string, productId: string, actor: Actor) {
  return mutate(userId, (ws) => {
    const p = ws.products.find((x) => x.id === productId);
    if (!p) throw new NotFound("Product not found");
    ws.products = ws.products.filter((x) => x.id !== productId);
    const cids = new Set(ws.campaigns.filter((c) => c.productId === productId).map((c) => c.id));
    ws.campaigns = ws.campaigns.filter((c) => !cids.has(c.id));
    ws.assets = ws.assets.filter((a) => !cids.has(a.campaignId));
    log(ws, actor, `Deleted product ${p.name}`);
    return { ok: true };
  });
}

// ---------- campaigns ----------

export async function createCampaign(userId: string, input: Record<string, unknown>, actor: Actor) {
  return mutate(userId, (ws) => {
    const product = findProduct(ws, str(input.product_id ?? input.productId ?? input.product));
    if (!product) throw new NotFound(ws.products.length ? "Product not found. Pass product_id (see list_products)." : "Create a product first with save_product.");
    const t = now();
    const startDate = dateStr(input.start_date ?? input.startDate) || t.slice(0, 10);
    const campaign: Campaign = {
      id: id("c"), productId: product.id, name: str(input.name, 160) || `${product.name} campaign`,
      objective: str(input.objective ?? input.goal, 1000), startDate, createdAt: t, updatedAt: t, createdBy: actor,
    };
    ws.campaigns.push(campaign);
    const assetsIn = Array.isArray(input.assets) ? (input.assets as Record<string, unknown>[]) : [];
    const assets = assetsIn.slice(0, 30).map((a, i) => buildAsset(a ?? {}, campaign, actor, i));
    ws.assets.push(...assets);
    log(ws, actor, `Created campaign “${campaign.name}” with ${assets.length} assets`, `/campaigns/${campaign.id}`);
    return { campaign, assets, product };
  });
}

export async function updateCampaign(userId: string, campaignId: string, input: Record<string, unknown>, actor: Actor) {
  return mutate(userId, (ws) => {
    const c = ws.campaigns.find((x) => x.id === campaignId);
    if (!c) throw new NotFound("Campaign not found");
    if (input.name !== undefined) c.name = str(input.name, 160) || c.name;
    if (input.objective !== undefined) c.objective = str(input.objective, 1000);
    const sd = dateStr(input.start_date ?? input.startDate);
    if (sd) c.startDate = sd;
    c.updatedAt = now();
    log(ws, actor, `Updated campaign “${c.name}”`, `/campaigns/${c.id}`);
    return c;
  });
}

export async function deleteCampaign(userId: string, campaignId: string, actor: Actor) {
  return mutate(userId, (ws) => {
    const c = ws.campaigns.find((x) => x.id === campaignId);
    if (!c) throw new NotFound("Campaign not found");
    ws.campaigns = ws.campaigns.filter((x) => x.id !== campaignId);
    ws.assets = ws.assets.filter((a) => a.campaignId !== campaignId);
    log(ws, actor, `Deleted campaign “${c.name}”`);
    return { ok: true };
  });
}

export async function addAssets(userId: string, campaignId: string, assetsIn: Record<string, unknown>[], actor: Actor) {
  return mutate(userId, (ws) => {
    const c = ws.campaigns.find((x) => x.id === campaignId);
    if (!c) throw new NotFound("Campaign not found");
    const offset = ws.assets.filter((a) => a.campaignId === c.id).length;
    const assets = assetsIn.slice(0, 30).map((a, i) => buildAsset(a ?? {}, c, actor, offset + i));
    ws.assets.push(...assets);
    c.updatedAt = now();
    log(ws, actor, `Added ${assets.length} asset${assets.length === 1 ? "" : "s"} to “${c.name}”`, `/campaigns/${c.id}`);
    return { campaign: c, assets };
  });
}

// ---------- assets ----------

export function applyAssetPatch(a: Asset, patch: Record<string, unknown>, actor: Actor) {
  const has = (k: string) => patch[k] !== undefined && patch[k] !== null;
  if (has("title")) a.title = str(patch.title, 200);
  if (has("hook")) a.hook = str(patch.hook, 400);
  if (has("body") || has("caption")) a.body = str(patch.body ?? patch.caption, 6000);
  if (has("cta")) a.cta = str(patch.cta, 300);
  if (has("hashtags")) a.hashtags = strArr(patch.hashtags, 15).map((h) => (h.startsWith("#") ? h : "#" + h.replace(/\s+/g, "")));
  if (has("thread")) a.thread = strArr(patch.thread, 15);
  if (has("slides")) a.slides = normSlides(patch.slides);
  if (has("scenes")) a.scenes = normScenes(patch.scenes);
  if (has("platform")) a.platform = pick(patch.platform, PLATFORMS, a.platform);
  if (has("format")) a.format = pick(patch.format, FORMATS, a.format);
  if (has("status")) a.status = pick(patch.status, STATUSES, a.status);
  if (has("publishedUrl") || has("published_url")) a.publishedUrl = str(patch.publishedUrl ?? patch.published_url, 1000);
  if (has("scheduledDate") || has("scheduled_date")) a.scheduledDate = dateStr(patch.scheduledDate ?? patch.scheduled_date);
  const v = patch.visual as Record<string, unknown> | undefined;
  if (v && typeof v === "object") {
    if (v.template !== undefined) a.visual.template = pick(v.template, TEMPLATES, a.visual.template);
    if (v.aspect !== undefined) a.visual.aspect = pick(v.aspect, ASPECTS, a.visual.aspect);
    if (v.headline !== undefined) a.visual.headline = str(v.headline, 160);
    if (v.subtext !== undefined) a.visual.subtext = str(v.subtext, 260);
    if (v.stat !== undefined) a.visual.stat = str(v.stat, 30) || undefined;
    if (v.imageUrl !== undefined || v.image_url !== undefined) a.visual.imageUrl = str(v.imageUrl ?? v.image_url, 1000) || undefined;
  }
  a.version += 1;
  a.updatedAt = now();
  a.updatedBy = actor;
}

export async function updateAsset(userId: string, assetId: string, patch: Record<string, unknown>, actor: Actor) {
  return mutate(userId, (ws) => {
    const a = ws.assets.find((x) => x.id === assetId);
    if (!a) throw new NotFound(`No asset with id ${assetId}`);
    applyAssetPatch(a, patch, actor);
    log(ws, actor, `Edited “${a.title}”`, `/assets/${a.id}`);
    return a;
  });
}

export async function deleteAsset(userId: string, assetId: string, actor: Actor) {
  return mutate(userId, (ws) => {
    const a = ws.assets.find((x) => x.id === assetId);
    if (!a) throw new NotFound("Asset not found");
    ws.assets = ws.assets.filter((x) => x.id !== assetId);
    log(ws, actor, `Deleted “${a.title}”`);
    return { ok: true };
  });
}

export async function duplicateAsset(userId: string, assetId: string, actor: Actor) {
  return mutate(userId, (ws) => {
    const a = ws.assets.find((x) => x.id === assetId);
    if (!a) throw new NotFound("Asset not found");
    const t = now();
    const copy: Asset = JSON.parse(JSON.stringify(a));
    Object.assign(copy, { id: id("a"), title: a.title + " (copy)", status: "draft", publishedUrl: "", version: 1, createdAt: t, updatedAt: t, createdBy: actor, updatedBy: actor });
    ws.assets.push(copy);
    log(ws, actor, `Duplicated “${a.title}”`, `/assets/${copy.id}`);
    return copy;
  });
}
