// ProductPop logo mark: a gradient tile with a "P" whose bowl pops out as a burst.
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <defs>
        <linearGradient id="ppg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6D4BFF" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#ppg)" />
      <path d="M21 49V15h13.5a11 11 0 0 1 0 22H29" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="47.5" cy="45.5" r="4.5" fill="#fff" />
      <path d="M47.5 33.5v3M58 45.5h-3M55 37.5l-2.2 2.2" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" opacity=".9" />
    </svg>
  );
}

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, fontWeight: 800, letterSpacing: "-0.02em" }}>
      <LogoMark size={size} />
      <span>
        Product<span style={{ background: "linear-gradient(90deg,#6D4BFF,#22D3EE)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Pop</span>
      </span>
    </span>
  );
}
