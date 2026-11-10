"use client";

import { useState } from "react";
import Link from "next/link";
import { FORMAT, PLATFORM, useWs } from "@/components/ws";

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function Calendar() {
  const { ws } = useWs();
  const [offset, setOffset] = useState(0);
  if (!ws) return null;
  const today = new Date();
  const start = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7) + offset * 7);
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return d;
  });
  const t = iso(new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())));

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="between">
        <div>
          <h1>Content calendar</h1>
          <p className="muted">What’s going out, across every campaign.</p>
        </div>
        <div className="row">
          <button className="btn sm" onClick={() => setOffset(offset - 1)}>← Prev</button>
          <button className="btn sm" onClick={() => setOffset(0)}>This week</button>
          <button className="btn sm" onClick={() => setOffset(offset + 1)}>Next →</button>
        </div>
      </div>
      <div className="cal">
        {days.map((d) => {
          const key = iso(d);
          const items = ws.assets.filter((a) => a.scheduledDate === key);
          return (
            <div key={key} className={"cal-day" + (key === t ? " today" : "")}>
              <div className="d">{d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}</div>
              {items.map((a) => (
                <Link key={a.id} href={`/assets/${a.id}`} className="cal-item" style={{ borderLeftColor: PLATFORM[a.platform].color, opacity: a.status === "published" ? 0.6 : 1 }}>
                  <div style={{ fontWeight: 700 }}>{a.title}</div>
                  <div className="muted">{PLATFORM[a.platform].label} · {FORMAT[a.format]}{a.status === "published" ? " · ✓" : ""}</div>
                </Link>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
