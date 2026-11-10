export type Platform = "linkedin" | "x" | "instagram" | "youtube_shorts" | "reels";
export type AssetFormat = "text_post" | "thread" | "visual_post" | "carousel" | "video_script";
export type AssetStatus = "draft" | "ready" | "scheduled" | "published";
export type Actor = "claude" | "you";
export type Aspect = "square" | "portrait" | "landscape";
export type VisualTemplate = "announcement" | "quote" | "stat" | "feature";

export interface Brand {
  primary: string;
  accent: string;
  background: string;
  text: string;
}

export interface Product {
  id: string;
  name: string;
  tagline: string;
  website: string;
  category: string;
  description: string;
  audience: string;
  features: string[];
  voice: string;
  brand: Brand;
  logoUrl: string;
  screenshots: string[];
  createdAt: string;
  updatedAt: string;
  updatedBy: Actor;
}

export interface Slide {
  heading: string;
  body: string;
  imageUrl?: string;
}

export interface Scene {
  text: string;
  subtext: string;
  duration: number; // seconds
  visual: string; // direction for the founder, e.g. "screen recording of dashboard"
  imageUrl?: string;
}

export interface Asset {
  id: string;
  campaignId: string;
  productId: string;
  platform: Platform;
  format: AssetFormat;
  title: string;
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
  thread: string[]; // for X threads
  slides: Slide[]; // carousel slides
  scenes: Scene[]; // reel / shorts storyboard
  visual: {
    template: VisualTemplate;
    aspect: Aspect;
    headline: string;
    subtext: string;
    stat?: string;
    imageUrl?: string;
  };
  scheduledDate: string; // YYYY-MM-DD
  status: AssetStatus;
  publishedUrl: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: Actor;
  updatedBy: Actor;
}

export interface Campaign {
  id: string;
  productId: string;
  name: string;
  objective: string;
  startDate: string;
  createdAt: string;
  updatedAt: string;
  createdBy: Actor;
}

export interface Activity {
  at: string;
  actor: Actor;
  summary: string;
  link?: string;
}

export interface Workspace {
  userId: string;
  products: Product[];
  campaigns: Campaign[];
  assets: Asset[];
  activity: Activity[];
}

export interface User {
  id: string;
  username: string;
  name: string;
  passwordHash: string;
  salt: string;
  mcpToken: string;
  createdAt: string;
}
