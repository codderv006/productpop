import type { Asset, Workspace } from "./types";
import {
  addAssets, createCampaign, deleteAsset, findProduct, getWorkspace, labelPlatform, saveProduct, updateAsset, updateCampaign, NotFound,
} from "./workspace";

type Json = Record<string, unknown>;

const assetSchema = {
  type: "object",
  properties: {
    platform: { type: "string", enum: ["linkedin", "x", "instagram", "youtube_shorts", "reels"] },
    format: {
      type: "string",
      enum: ["text_post", "thread", "visual_post", "carousel", "video_script"],
      description:
        "text_post = copy only. thread = X thread (fill `thread`). visual_post = single designed image (fill `visual`). carousel = multi-slide image post (fill `slides`, 4–8 slides). video_script = Reel/Short storyboard rendered to video (fill `scenes`, 4–7 scenes).",
    },
    title: { type: "string", description: "Internal name, e.g. 'Day 1 – Launch announcement'" },
    day: { type: "integer", description: "Campaign day number (1 = start date). Used to schedule if scheduled_date is omitted." },
    scheduled_date: { type: "string", description: "YYYY-MM-DD" },
    hook: { type: "string", description: "Scroll-stopping first line" },
    body: { type: "string", description: "Full post copy / caption, ready to paste. Use line breaks." },
    cta: { type: "string" },
    hashtags: { type: "array", items: { type: "string" } },
    thread: { type: "array", items: { type: "string" }, description: "X thread, one tweet per item (<=280 chars each)" },
    slides: {
      type: "array",
      description: "Carousel slides. First slide = cover hook, last slide = CTA.",
      items: { type: "object", properties: { heading: { type: "string", description: "<= 60 chars" }, body: { type: "string", description: "<= 180 chars" } }, required: ["heading"] },
    },
    scenes: {
      type: "array",
      description: "Video storyboard for a 9:16 Reel/Short.",
      items: {
        type: "object",
        properties: {
          text: { type: "string", description: "Big on-screen text, <= 50 chars" },
          subtext: { type: "string", description: "Smaller supporting line, <= 90 chars" },
          duration: { type: "number", description: "Seconds, 2–5" },
          visual: { type: "string", description: "What the founder should show/record for this scene" },
        },
        required: ["text"],
      },
    },
    visual: {
      type: "object",
      description: "Design for visual_post (also used as the cover style for other formats).",
      properties: {
        template: { type: "string", enum: ["announcement", "quote", "stat", "feature"], description: "announcement = bold headline; quote = founder quote; stat = one big number; feature = headline + feature checklist" },
        aspect: { type: "string", enum: ["square", "portrait", "landscape"] },
        headline: { type: "string", description: "<= 70 chars" },
        subtext: { type: "string", description: "<= 140 chars" },
        stat: { type: "string", description: "For the stat template, e.g. '6 hrs' or '3x'" },
      },
    },
    status: { type: "string", enum: ["draft", "ready", "scheduled", "published"] },
  },
  required: ["platform", "format"],
};

export const TOOLS = [
  {
    name: "get_workspace",
    description: "Overview of the user's ProductPop workspace: products (with ids), campaigns and asset counts. Call this first to find ids.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
  },
  {
    name: "save_product",
    description:
      "Create or update a product profile (the reusable brand + marketing context). Pass `id` to update an existing product; omit it to create. Only the fields you pass are changed.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Existing product id (to update)" },
        name: { type: "string" },
        tagline: { type: "string" },
        website: { type: "string" },
        category: { type: "string" },
        description: { type: "string" },
        audience: { type: "string", description: "Target audience / ICP" },
        features: { type: "array", items: { type: "string" } },
        voice: { type: "string", description: "Brand voice / tone guidance" },
        brand: {
          type: "object",
          description: "Brand colours as hex",
          properties: { primary: { type: "string" }, accent: { type: "string" }, background: { type: "string" }, text: { type: "string" } },
        },
        logo_url: { type: "string" },
      },
    },
  },
  {
    name: "get_product",
    description: "Get a product profile in full (description, audience, features, voice, brand colours). Accepts id or exact name.",
    inputSchema: { type: "object", properties: { product: { type: "string", description: "Product id or name" } }, required: ["product"] },
    annotations: { readOnlyHint: true },
  },
  {
    name: "create_campaign",
    description:
      "Create a marketing campaign for a product and save all of its content assets in one call. Each asset becomes an independently editable item in ProductPop; visual_post and carousel assets are rendered into on-brand PNGs and video_script assets into a 9:16 video by ProductPop's templates. Write complete, ready-to-publish copy.",
    inputSchema: {
      type: "object",
      properties: {
        product_id: { type: "string", description: "Product id (or name)" },
        name: { type: "string", description: "e.g. 'Smart Reports launch week'" },
        objective: { type: "string" },
        start_date: { type: "string", description: "YYYY-MM-DD; defaults to today" },
        assets: { type: "array", items: assetSchema },
      },
      required: ["product_id", "name", "assets"],
    },
  },
  {
    name: "add_assets",
    description: "Add more content assets to an existing campaign.",
    inputSchema: {
      type: "object",
      properties: { campaign_id: { type: "string" }, assets: { type: "array", items: assetSchema } },
      required: ["campaign_id", "assets"],
    },
  },
  {
    name: "get_campaign",
    description: "Get a campaign with every asset in full (ids, copy, slides, scenes, dates, status). Includes edits the user made in the app. Use before updating.",
    inputSchema: { type: "object", properties: { campaign_id: { type: "string" } }, required: ["campaign_id"] },
    annotations: { readOnlyHint: true },
  },
  {
    name: "update_asset",
    description:
      "Edit an existing asset in place (no duplicate is created). Pass only the fields to change. Arrays (slides, scenes, thread, hashtags) replace the existing array.",
    inputSchema: {
      type: "object",
      properties: { asset_id: { type: "string" }, ...(assetSchema.properties as Json), published_url: { type: "string" } },
      required: ["asset_id"],
    },
  },
  {
    name: "update_campaign",
    description: "Rename a campaign or change its objective / start date.",
    inputSchema: {
      type: "object",
      properties: { campaign_id: { type: "string" }, name: { type: "string" }, objective: { type: "string" }, start_date: { type: "string" } },
      required: ["campaign_id"],
    },
  },
  {
    name: "delete_asset",
    description: "Delete one asset from a campaign.",
    inputSchema: { type: "object", properties: { asset_id: { type: "string" } }, required: ["asset_id"] },
    annotations: { destructiveHint: true },
  },
  {
    name: "get_content_calendar",
    description: "List scheduled content between two dates across all campaigns, with status. Useful for 'what's going out this week?'.",
    inputSchema: {
      type: "object",
      properties: { from: { type: "string", description: "YYYY-MM-DD" }, to: { type: "string", description: "YYYY-MM-DD" } },
    },
    annotations: { readOnlyHint: true },
  },
];

export const INSTRUCTIONS = `ProductPop turns a founder's product into ready-to-share marketing content. You (Claude) write the strategy and copy; ProductPop stores it, lets the founder edit it, and renders visual posts, carousels and Reels/Shorts from its own design templates using the product's brand colours.
Typical flow: get_workspace → (save_product if new) → get_product → create_campaign with all assets in one call → share the links returned.
Write final, publish-ready copy that follows the product's voice. Match each platform: LinkedIn = story + line breaks; X = punchy, threads <=280 chars per tweet; Instagram = caption + hashtags; Reels/Shorts = 4–7 short scenes.
Before editing, call get_campaign to see the latest version (the founder may have edited it in the app), then use update_asset rather than creating duplicates.`;

function assetSummary(a: Asset, base: string, uid: string) {
  const s: Json = {
    id: a.id,
    title: a.title,
    platform: labelPlatform(a.platform),
    format: a.format,
    scheduled_date: a.scheduledDate,
    status: a.status,
    last_edited_by: a.updatedBy === "you" ? "founder (in app)" : "claude",
    link: `${base}/assets/${a.id}`,
  };
  if (a.format === "visual_post") s.image_png = `${base}/api/render/${uid}/${a.id}?v=${a.version}`;
  if (a.format === "carousel") s.slide_pngs = a.slides.map((_, i) => `${base}/api/render/${uid}/${a.id}?slide=${i}&v=${a.version}`);
  if (a.format === "video_script") s.scenes = a.scenes.length;
  return s;
}

function assetFull(a: Asset, base: string, uid: string) {
  return {
    ...assetSummary(a, base, uid),
    hook: a.hook,
    body: a.body,
    cta: a.cta,
    hashtags: a.hashtags,
    ...(a.thread.length ? { thread: a.thread } : {}),
    ...(a.slides.length ? { slides: a.slides.map(({ heading, body }) => ({ heading, body })) } : {}),
    ...(a.scenes.length ? { scenes: a.scenes.map(({ text, subtext, duration, visual }) => ({ text, subtext, duration, visual })) } : {}),
    visual: { template: a.visual.template, aspect: a.visual.aspect, headline: a.visual.headline, subtext: a.visual.subtext, stat: a.visual.stat },
    published_url: a.publishedUrl || undefined,
    version: a.version,
  };
}

function overview(ws: Workspace, base: string) {
  return {
    app: base,
    products: ws.products.map((p) => ({ id: p.id, name: p.name, tagline: p.tagline, link: `${base}/products/${p.id}` })),
    campaigns: ws.campaigns
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((c) => {
        const assets = ws.assets.filter((a) => a.campaignId === c.id);
        return {
          id: c.id,
          name: c.name,
          product: ws.products.find((p) => p.id === c.productId)?.name,
          start_date: c.startDate,
          assets: assets.length,
          published: assets.filter((a) => a.status === "published").length,
          link: `${base}/campaigns/${c.id}`,
        };
      }),
  };
}

export async function callTool(userId: string, name: string, args: Json, base: string): Promise<Json> {
  switch (name) {
    case "get_workspace":
      return overview(await getWorkspace(userId), base);

    case "save_product": {
      const { product, created } = await saveProduct(userId, args, "claude");
      return { message: created ? "Product saved to ProductPop" : "Product updated", product_id: product.id, link: `${base}/products/${product.id}`, product };
    }

    case "get_product": {
      const ws = await getWorkspace(userId);
      const p = findProduct(ws, String(args.product ?? args.product_id ?? args.id ?? ""));
      if (!p) throw new NotFound("Product not found. Call get_workspace to see product ids.");
      return { ...p, link: `${base}/products/${p.id}` };
    }

    case "create_campaign": {
      const { campaign, assets, product } = await createCampaign(userId, args, "claude");
      return {
        message: `Saved “${campaign.name}” with ${assets.length} assets for ${product.name}. Share the campaign link with the user — they can edit, render and download everything there.`,
        campaign_id: campaign.id,
        link: `${base}/campaigns/${campaign.id}`,
        assets: assets.map((a) => assetSummary(a, base, userId)),
      };
    }

    case "add_assets": {
      const { campaign, assets } = await addAssets(userId, String(args.campaign_id ?? ""), (args.assets as Json[]) ?? [], "claude");
      return { message: `Added ${assets.length} assets`, link: `${base}/campaigns/${campaign.id}`, assets: assets.map((a) => assetSummary(a, base, userId)) };
    }

    case "get_campaign": {
      const ws = await getWorkspace(userId);
      const c = ws.campaigns.find((x) => x.id === args.campaign_id) ?? ws.campaigns.find((x) => x.name.toLowerCase() === String(args.campaign_id ?? "").toLowerCase());
      if (!c) throw new NotFound("Campaign not found. Call get_workspace to see campaign ids.");
      const assets = ws.assets.filter((a) => a.campaignId === c.id).sort((a, b) => (a.scheduledDate || "").localeCompare(b.scheduledDate || ""));
      return {
        id: c.id, name: c.name, objective: c.objective, start_date: c.startDate,
        product: ws.products.find((p) => p.id === c.productId)?.name, link: `${base}/campaigns/${c.id}`,
        assets: assets.map((a) => assetFull(a, base, userId)),
      };
    }

    case "update_asset": {
      const { asset_id, ...patch } = args;
      const a = await updateAsset(userId, String(asset_id ?? ""), patch, "claude");
      return { message: `Updated “${a.title}” (now version ${a.version})`, asset: assetFull(a, base, userId) };
    }

    case "update_campaign": {
      const { campaign_id, ...patch } = args;
      const c = await updateCampaign(userId, String(campaign_id ?? ""), patch, "claude");
      return { message: "Campaign updated", campaign: c, link: `${base}/campaigns/${c.id}` };
    }

    case "delete_asset":
      await deleteAsset(userId, String(args.asset_id ?? ""), "claude");
      return { message: "Asset deleted" };

    case "get_content_calendar": {
      const ws = await getWorkspace(userId);
      const from = String(args.from ?? "") || "0000-00-00";
      const to = String(args.to ?? "") || "9999-99-99";
      const items = ws.assets
        .filter((a) => a.scheduledDate && a.scheduledDate >= from && a.scheduledDate <= to)
        .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
        .map((a) => ({ ...assetSummary(a, base, userId), campaign: ws.campaigns.find((c) => c.id === a.campaignId)?.name }));
      return { from: args.from, to: args.to, count: items.length, items, link: `${base}/calendar` };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
