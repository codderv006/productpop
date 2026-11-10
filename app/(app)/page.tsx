"use client";

import Link from "next/link";
import { ProductMark, Who, ago, useWs } from "@/components/ws";

export default function Dashboard() {
  const { ws, user, fresh } = useWs();
  if (!ws || !user) return null;
  const assets = ws.assets;
  const today = new Date().toISOString().slice(0, 10);
  const week = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const stats = [
    { n: ws.campaigns.length, l: "Campaigns" },
    { n: assets.length, l: "Assets created" },
    { n: assets.filter((a) => a.scheduledDate >= today && a.scheduledDate <= week && a.status !== "published").length, l: "Going out this week" },
    { n: assets.filter((a) => a.status === "published").length, l: "Published" },
  ];
  const campaigns = ws.campaigns.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="dash">
      <div className="between dash-head">
        <div>
          <h1>Hi {user.name.split(" ")[0]} 👋</h1>
          <p className="muted">Everything Claude writes for your products lands here — ready to edit, render and ship.</p>
        </div>
        <span className="live">Live — syncing with Claude</span>
      </div>

      <div className="dash-body">
      <div className="dash-main">
      <div className="grid g4">
        {stats.map((s) => (
          <div key={s.l} className="card stat">
            <div className="n">{s.n}</div>
            <div className="l">{s.l}</div>
          </div>
        ))}
      </div>

        <div className="stack">
          <div className="between">
            <h2>Campaigns</h2>
          </div>
          {campaigns.length === 0 ? (
            <div className="card empty">
              <h2>No campaigns yet</h2>
              <p>Connect Claude, then ask it: <i>“Create a 7-day launch campaign for {ws.products[0]?.name ?? "my product"} and save it in ProductPop.”</i></p>
              <Link href="/connect" className="btn brand mt">Connect Claude</Link>
            </div>
          ) : (
            <div className="grid g2">
              {campaigns.map((c) => {
                const p = ws.products.find((x) => x.id === c.productId);
                const ca = assets.filter((a) => a.campaignId === c.id);
                const pub = ca.filter((a) => a.status === "published").length;
                const kinds = new Set(ca.map((a) => a.platform)).size;
                return (
                  <Link key={c.id} href={`/campaigns/${c.id}`} className={"card hover stack" + (fresh.has(c.id) ? " flash" : "")} style={{ gap: 10 }}>
                    <div className="between">
                      <span className="row small" style={{ fontWeight: 700 }}>
                        {p ? <ProductMark p={p} size={18} /> : null}
                        {p?.name}
                      </span>
                      <Who actor={c.createdBy} />
                    </div>
                    <h3>{c.name}</h3>
                    <p className="muted small" style={{ minHeight: 18 }}>{c.objective}</p>
                    <div className="between small muted">
                      <span>{ca.length} assets · {kinds} platforms</span>
                      <span>{pub}/{ca.length} published</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 99, background: "var(--bg)", overflow: "hidden" }}>
                      <div style={{ width: `${ca.length ? (pub / ca.length) * 100 : 0}%`, height: "100%", background: "var(--ok)" }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

      </div>
        <div className="card dash-activity">
          <div className="card-title"><h3>Activity</h3><span className="small muted">{ws.activity.length} events</span></div>
          <div className="activity">
            {ws.activity.length === 0 ? <p className="muted small">Nothing yet.</p> : null}
            {ws.activity.map((a, i) => {
              const inner = (
                <>
                  <Who actor={a.actor} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, lineHeight: 1.4 }}>{a.summary}</div>
                    <div className="small muted">{ago(a.at)}</div>
                  </div>
                </>
              );
              return a.link ? <Link key={i} href={a.link} className="it">{inner}</Link> : <div key={i} className="it">{inner}</div>;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
