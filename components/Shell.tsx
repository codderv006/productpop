"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ProductMark, useWs } from "./ws";

const I = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  cal: "M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z",
  plug: "M9 7V3M15 7V3M7 7h10v4a5 5 0 0 1-10 0zM12 16v5",
  box: "M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8",
};
function Icon({ d }: { d: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { ws, user } = useWs();
  const nav = (href: string, label: string, icon: string, exact = false) => {
    const on = exact ? path === href : path.startsWith(href);
    return (
      <Link href={href} className={"nav" + (on ? " active" : "")}>
        <Icon d={icon} />
        {label}
      </Link>
    );
  };
  return (
    <div className="shell">
      <aside className="side">
        <Link href="/" className="logo">
          <span className="logo-mark">P</span> ProductPop
        </Link>
        {nav("/", "Dashboard", I.home, true)}
        {nav("/calendar", "Calendar", I.cal)}
        {nav("/connect", "Connect Claude", I.plug)}
        <div className="nav-sec">Products</div>
        {ws?.products.map((p) => (
          <Link key={p.id} href={`/products/${p.id}`} className={"nav" + (path === `/products/${p.id}` ? " active" : "")}>
            <ProductMark p={p} />
            {p.name}
          </Link>
        ))}
        <Link href="/products/new" className="nav">
          <Icon d="M12 5v14M5 12h14" /> New product
        </Link>
        <div className="side-foot">
          <div style={{ fontWeight: 700, color: "var(--ink)" }}>{user?.name}</div>
          <div className="between">
            <span>@{user?.username}</span>
            <button
              className="btn ghost sm"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                router.replace("/login");
              }}
            >
              Log out
            </button>
          </div>
        </div>
      </aside>
      <main className="main">{ws ? children : <div className="muted">Loading your workspace…</div>}</main>
    </div>
  );
}
