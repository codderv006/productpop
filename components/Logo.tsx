// ProductPop logo mark: three "popping" bubbles on a dark tile.
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden style={{ flex: "none" }}>
      <rect width="64" height="64" rx="16" fill="#15131F" />
      <circle cx="27" cy="36" r="14" fill="#7C5CFF" />
      <circle cx="42" cy="22" r="8" fill="#22D3EE" />
      <circle cx="48" cy="40" r="4" fill="#FF7A59" />
    </svg>
  );
}

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, fontWeight: 800, letterSpacing: "-0.02em" }}>
      <LogoMark size={size} />
      <span>
        Product<span style={{ color: "#7C5CFF" }}>Pop</span>
      </span>
    </span>
  );
}
