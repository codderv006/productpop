"use client";

import { useEffect, useState } from "react";
import { useWs } from "@/components/ws";

const PROMPTS = [
  "Save my product in ProductPop: <name>, <one-line description>, for <audience>. Brand colours #5B3DF5 and #22D3EE.",
  "Using my FlowDesk product in ProductPop, create a 7-day launch campaign for LinkedIn, X, Instagram and Reels: 2 LinkedIn posts, 1 X thread, 1 Instagram carousel, 2 visual posts and 1 Reel. Save everything in ProductPop.",
  "Open my latest ProductPop campaign and rewrite the day-4 LinkedIn post to focus on saving time. Update it in place.",
  "What's going out this week in ProductPop? Mark yesterday's posts as published.",
];

export default function Connect() {
  const { user, toast } = useWs();
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  if (!user) return null;
  const url = `${origin}/api/mcp/${user.mcpToken}`;
  const copy = async (t: string) => { await navigator.clipboard.writeText(t); toast("Copied"); };

  return (
    <div className="stack" style={{ gap: 18, maxWidth: 820 }}>
      <div>
        <h1>Connect Claude</h1>
        <p className="muted">ProductPop has no AI inside. Your own Claude does the thinking and writing through this private link — ProductPop saves, designs and keeps everything.</p>
      </div>

      <div className="card stack">
        <h3>Your MCP link</h3>
        <div className="code">{url}</div>
        <div className="row">
          <button className="btn brand" onClick={() => copy(url)}>Copy link</button>
          <span className="small muted">Private to your workspace — treat it like a password.</span>
        </div>
      </div>

      <div className="card stack">
        <h3>Add it to Claude (1 minute)</h3>
        <div className="steps">
          <div><span>Open <b>claude.ai</b> (or the Claude desktop app) → <b>Settings → Connectors</b>.</span></div>
          <div><span>Click <b>Add custom connector</b>. Name it <b>ProductPop</b> and paste your MCP link as the URL. Click <b>Add</b> (no OAuth needed).</span></div>
          <div><span>In a new chat, open the <b>+ / tools</b> menu and make sure <b>ProductPop</b> is switched on.</span></div>
          <div><span>Ask Claude for a campaign. Everything it creates appears here live — open the dashboard in another tab and watch.</span></div>
        </div>
      </div>

      <div className="card stack">
        <h3>Try these prompts</h3>
        {PROMPTS.map((p) => (
          <div key={p} className="list-item">
            <div className="between" style={{ alignItems: "flex-start" }}>
              <span style={{ fontSize: 13.5 }}>{p}</span>
              <button className="btn sm" onClick={() => copy(p)}>Copy</button>
            </div>
          </div>
        ))}
      </div>

      <div className="card stack">
        <h3>What Claude can do in ProductPop</h3>
        <div className="grid g2 small">
          {[
            ["save_product", "Create or update a product & brand kit"],
            ["create_campaign", "Save a whole campaign of assets in one go"],
            ["add_assets", "Add more posts to a campaign"],
            ["get_campaign", "Read the latest version, including your edits"],
            ["update_asset", "Rewrite a post in place — no duplicates"],
            ["get_content_calendar", "See what's scheduled"],
          ].map(([k, v]) => (
            <div key={k}><code style={{ fontWeight: 700 }}>{k}</code><div className="muted">{v}</div></div>
          ))}
        </div>
      </div>
    </div>
  );
}
