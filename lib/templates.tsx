/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import type { Asset, Aspect, Product } from "./types";

// Deterministic design templates rendered to PNG by Satori (next/og).
// Every element with more than one child must use display:flex.

export const SIZES: Record<Aspect | "story", { width: number; height: number }> = {
  story: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1350 },
  landscape: { width: 1200, height: 675 },
};

type Ctx = { product: Product; logo?: string; image?: string; aspect: Aspect | "story" };

function hexToRgb(hex: string) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
export const rgba = (hex: string, a: number) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
};

function fit(text: string, sizes: [number, number][], fallback: number) {
  // choose a font size by text length: [[maxChars, size], ...]
  for (const [max, size] of sizes) if (text.length <= max) return size;
  return fallback;
}

function Frame({ ctx, children, pad = 80 }: { ctx: Ctx; children: React.ReactNode; pad?: number }) {
  const { brand } = ctx.product;
  const { width, height } = SIZES[ctx.aspect];
  return (
    <div
      style={{
        width, height, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden",
        backgroundColor: brand.background, color: brand.text, fontFamily: "Jakarta", padding: pad,
        backgroundImage: `radial-gradient(circle at 90% 0%, ${rgba(brand.primary, 0.6)} 0%, ${rgba(brand.primary, 0)} ${Math.round(Math.max(width, height) * 0.6)}px), radial-gradient(circle at 0% 100%, ${rgba(brand.accent, 0.32)} 0%, ${rgba(brand.accent, 0)} ${Math.round(Math.max(width, height) * 0.5)}px)`,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", flex: 1, position: "relative" }}>{children}</div>
    </div>
  );
}

function BrandMark({ ctx, size = 30 }: { ctx: Ctx; size?: number }) {
  const { product } = ctx;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      {ctx.logo ? (
        <img src={ctx.logo} width={size * 1.6} height={size * 1.6} style={{ borderRadius: 12, objectFit: "contain" }} />
      ) : (
        <div style={{ width: size * 1.6, height: size * 1.6, borderRadius: 14, background: `linear-gradient(135deg, ${product.brand.primary}, ${product.brand.accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size, fontWeight: 800, color: "#fff" }}>
          {product.name.slice(0, 1).toUpperCase()}
        </div>
      )}
      <div style={{ fontSize: size, fontWeight: 700, letterSpacing: -0.5 }}>{product.name}</div>
    </div>
  );
}

function Footer({ ctx, cta }: { ctx: Ctx; cta?: string }) {
  const { product } = ctx;
  const site = product.website.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
      <div style={{ fontSize: 26, opacity: 0.7, display: "flex" }}>{site || product.tagline}</div>
      {cta ? (
        <div style={{ display: "flex", background: product.brand.primary, color: "#fff", padding: "16px 30px", borderRadius: 999, fontSize: 26, fontWeight: 700 }}>
          {cta.length > 32 ? cta.slice(0, 30) + "…" : cta}
        </div>
      ) : null}
    </div>
  );
}

function Pill({ ctx, children }: { ctx: Ctx; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignSelf: "flex-start", padding: "10px 22px", borderRadius: 999, border: `2px solid ${rgba(ctx.product.brand.accent, 0.7)}`, color: ctx.product.brand.accent, fontSize: 24, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>
      {children}
    </div>
  );
}

function Arrow({ color, size = 34 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14M13 6l6 6-6 6" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function Check({ color, size = 26 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 12.5l4.5 4.5L19 7.5" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const shortCta = (a: Asset) => (a.cta || "").split(/[.!\n]/)[0].trim();

// ---------------- single visual posts ----------------

export function VisualPost({ asset, ctx }: { asset: Asset; ctx: Ctx }) {
  const v = asset.visual;
  const headline = v.headline || asset.hook || asset.title;
  const land = ctx.aspect === "landscape";
  const { brand } = ctx.product;

  if (v.template === "quote") {
    return (
      <Frame ctx={ctx}>
        <BrandMark ctx={ctx} />
        <div style={{ display: "flex", flexDirection: "column", marginTop: land ? 30 : 80 }}>
          <div style={{ fontSize: land ? 140 : 220, lineHeight: 0.8, color: brand.accent, fontWeight: 800, display: "flex" }}>“</div>
          <div style={{ fontSize: fit(headline, [[60, land ? 58 : 76], [110, land ? 46 : 62], [170, land ? 38 : 52]], land ? 32 : 44), fontWeight: 700, lineHeight: 1.2, letterSpacing: -1, display: "flex" }}>{headline}</div>
          {v.subtext ? <div style={{ marginTop: 36, fontSize: 30, opacity: 0.75, display: "flex" }}>— {v.subtext}</div> : null}
        </div>
        <Footer ctx={ctx} cta={shortCta(asset)} />
      </Frame>
    );
  }

  if (v.template === "stat") {
    return (
      <Frame ctx={ctx}>
        <BrandMark ctx={ctx} />
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", marginBottom: "auto" }}>
          <div style={{ fontSize: land ? 180 : 260, fontWeight: 800, letterSpacing: -8, lineHeight: 1, display: "flex", backgroundImage: `linear-gradient(90deg, ${brand.accent}, ${brand.primary})`, backgroundClip: "text", color: "transparent" }}>
            {v.stat || "10x"}
          </div>
          <div style={{ fontSize: fit(headline, [[50, land ? 52 : 68], [100, land ? 42 : 56]], 44), fontWeight: 700, lineHeight: 1.15, marginTop: 20, letterSpacing: -1, display: "flex" }}>{headline}</div>
          {v.subtext ? <div style={{ fontSize: land ? 26 : 32, opacity: 0.75, marginTop: 24, lineHeight: 1.4, display: "flex" }}>{v.subtext}</div> : null}
        </div>
        <Footer ctx={ctx} cta={shortCta(asset)} />
      </Frame>
    );
  }

  if (v.template === "feature") {
    const items = (asset.slides.length ? asset.slides.map((s) => s.heading) : ctx.product.features).slice(0, land ? 3 : 4);
    return (
      <Frame ctx={ctx}>
        <BrandMark ctx={ctx} />
        <div style={{ display: "flex", flexDirection: "column", marginTop: land ? 30 : 70 }}>
          <div style={{ fontSize: fit(headline, [[40, land ? 60 : 80], [80, land ? 48 : 64]], 50), fontWeight: 800, lineHeight: 1.08, letterSpacing: -2, display: "flex" }}>{headline}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: land ? 14 : 24, marginTop: land ? 26 : 50 }}>
            {items.map((it, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 22, background: rgba(brand.text, 0.06), border: `1px solid ${rgba(brand.text, 0.12)}`, borderRadius: 22, padding: land ? "14px 22px" : "22px 28px" }}>
                <div style={{ width: 44, height: 44, borderRadius: 999, background: brand.accent, color: brand.background, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800 }}><Check color={brand.background} /></div>
                <div style={{ fontSize: land ? 26 : 32, fontWeight: 500, display: "flex", flex: 1 }}>{it}</div>
              </div>
            ))}
          </div>
        </div>
        <Footer ctx={ctx} cta={shortCta(asset)} />
      </Frame>
    );
  }

  // announcement (default)
  const img = ctx.image;
  return (
    <Frame ctx={ctx}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <BrandMark ctx={ctx} />
        <Pill ctx={ctx}>New</Pill>
      </div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: img ? 50 : "auto", marginBottom: img ? 0 : "auto" }}>
        <div style={{ fontSize: fit(headline, [[30, land ? 76 : 104], [55, land ? 62 : 86], [90, land ? 50 : 70]], land ? 42 : 58), fontWeight: 800, lineHeight: 1.05, letterSpacing: -3, display: "flex" }}>{headline}</div>
        {v.subtext ? <div style={{ fontSize: land ? 28 : 36, opacity: 0.78, marginTop: 28, lineHeight: 1.35, display: "flex" }}>{v.subtext}</div> : null}
      </div>
      {img ? (
        <div style={{ display: "flex", marginTop: 44, flex: 1, borderRadius: 28, overflow: "hidden", border: `2px solid ${rgba(brand.text, 0.15)}`, marginBottom: 36 }}>
          <img src={img} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
        </div>
      ) : null}
      <Footer ctx={ctx} cta={shortCta(asset)} />
    </Frame>
  );
}

// ---------------- carousel slides ----------------

export function CarouselSlide({ asset, index, ctx }: { asset: Asset; index: number; ctx: Ctx }) {
  const slides = asset.slides.length ? asset.slides : [{ heading: asset.hook || asset.title, body: "" }];
  const s = slides[index] ?? slides[0];
  const total = slides.length;
  const isFirst = index === 0;
  const isLast = index === total - 1 && total > 1;
  const { brand } = ctx.product;

  const dots = (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      {slides.map((_, i) => (
        <div key={i} style={{ width: i === index ? 40 : 12, height: 12, borderRadius: 99, background: i === index ? brand.accent : rgba(brand.text, 0.3), display: "flex" }} />
      ))}
    </div>
  );

  if (isFirst) {
    return (
      <Frame ctx={ctx}>
        <BrandMark ctx={ctx} />
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", marginBottom: "auto" }}>
          <div style={{ fontSize: fit(s.heading, [[30, 108], [55, 88], [80, 72]], 60), fontWeight: 800, lineHeight: 1.04, letterSpacing: -3, display: "flex" }}>{s.heading}</div>
          {s.body ? <div style={{ fontSize: 38, opacity: 0.78, marginTop: 34, lineHeight: 1.35, display: "flex" }}>{s.body}</div> : null}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {dots}
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 30, fontWeight: 700, color: brand.accent }}>Swipe <Arrow color={brand.accent} /></div>
        </div>
      </Frame>
    );
  }

  if (isLast) {
    return (
      <Frame ctx={ctx}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, textAlign: "center" }}>
          <BrandMark ctx={ctx} size={44} />
          <div style={{ fontSize: fit(s.heading, [[30, 92], [60, 72]], 58), fontWeight: 800, lineHeight: 1.08, letterSpacing: -2, marginTop: 60, display: "flex", textAlign: "center", justifyContent: "center" }}>{s.heading}</div>
          {s.body ? <div style={{ fontSize: 36, opacity: 0.78, marginTop: 30, lineHeight: 1.4, display: "flex", textAlign: "center", justifyContent: "center" }}>{s.body}</div> : null}
          {shortCta(asset) ? (
            <div style={{ display: "flex", marginTop: 60, background: brand.primary, color: "#fff", padding: "24px 48px", borderRadius: 999, fontSize: 36, fontWeight: 700 }}>{shortCta(asset)}</div>
          ) : null}
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>{dots}</div>
      </Frame>
    );
  }

  return (
    <Frame ctx={ctx}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <BrandMark ctx={ctx} size={26} />
        <div style={{ display: "flex", fontSize: 28, opacity: 0.6, fontWeight: 700 }}>{String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", marginBottom: "auto" }}>
        <div style={{ display: "flex", fontSize: 150, fontWeight: 800, color: rgba(brand.accent, 0.9), lineHeight: 1, letterSpacing: -6 }}>{String(index).padStart(2, "0")}</div>
        <div style={{ fontSize: fit(s.heading, [[30, 80], [60, 64]], 52), fontWeight: 800, lineHeight: 1.1, letterSpacing: -2, marginTop: 30, display: "flex" }}>{s.heading}</div>
        {s.body ? <div style={{ fontSize: fit(s.body, [[120, 40], [200, 34]], 30), opacity: 0.8, marginTop: 34, lineHeight: 1.45, display: "flex" }}>{s.body}</div> : null}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {dots}
        <Arrow color={brand.accent} size={40} />
      </div>
    </Frame>
  );
}

// ---------------- text post "card" (for text-only assets: an optional quote card) ----------------

export function TextCard({ asset, ctx }: { asset: Asset; ctx: Ctx }) {
  const text = asset.hook || asset.body.split("\n")[0] || asset.title;
  const copy: Asset = { ...asset, visual: { ...asset.visual, template: "quote", headline: text, subtext: asset.visual.subtext || `${ctx.product.name}` } };
  return <VisualPost asset={copy} ctx={ctx} />;
}

// ---------------- Reel / Short scene frame (9:16) ----------------

export function SceneFrame({ asset, index, ctx }: { asset: Asset; index: number; ctx: Ctx }) {
  const scenes = asset.scenes.length ? asset.scenes : [{ text: asset.hook || asset.title, subtext: "", duration: 3, visual: "" }];
  const s = scenes[index] ?? scenes[0];
  const total = scenes.length;
  const isLast = index === total - 1 && total > 1;
  const { brand } = ctx.product;
  const img = ctx.image;
  return (
    <Frame ctx={ctx} pad={90}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 60 }}>
        <BrandMark ctx={ctx} size={34} />
        <div style={{ display: "flex", gap: 8 }}>
          {scenes.map((_, i) => (
            <div key={i} style={{ width: 46, height: 8, borderRadius: 9, background: i <= index ? brand.accent : rgba(brand.text, 0.25), display: "flex" }} />
          ))}
        </div>
      </div>
      {img ? (
        <div style={{ display: "flex", marginTop: 90, height: 760, borderRadius: 36, overflow: "hidden", border: `3px solid ${rgba(brand.text, 0.15)}` }}>
          <img src={img} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
        </div>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", marginTop: img ? 70 : "auto", marginBottom: "auto", alignItems: isLast ? "center" : "flex-start", textAlign: isLast ? "center" : "left" }}>
        <div style={{ fontSize: fit(s.text, [[20, 128], [40, 104], [60, 86]], 72), fontWeight: 800, lineHeight: 1.04, letterSpacing: -3, display: "flex", justifyContent: isLast ? "center" : "flex-start" }}>{s.text}</div>
        {s.subtext ? <div style={{ fontSize: 44, opacity: 0.8, marginTop: 36, lineHeight: 1.35, display: "flex", justifyContent: isLast ? "center" : "flex-start" }}>{s.subtext}</div> : null}
        {isLast && shortCta(asset) ? (
          <div style={{ display: "flex", marginTop: 70, background: brand.primary, color: "#fff", padding: "30px 60px", borderRadius: 999, fontSize: 44, fontWeight: 700 }}>{shortCta(asset)}</div>
        ) : null}
      </div>
      <div style={{ display: "flex", justifyContent: "center", fontSize: 30, opacity: 0.6, marginBottom: 80 }}>{ctx.product.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</div>
    </Frame>
  );
}
