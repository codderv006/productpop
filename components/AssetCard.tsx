"use client";

import Link from "next/link";
import type { Asset } from "@/lib/types";
import { FORMAT, PlatformTag, Who, fmtDate, renderUrl, useWs } from "./ws";

export default function AssetCard({ a }: { a: Asset }) {
  const { user, fresh } = useWs();
  const uid = user!.id;
  let thumb: React.ReactNode;
  if (a.format === "visual_post") thumb = <img src={renderUrl(uid, a)} alt="" loading="lazy" />;
  else if (a.format === "carousel") thumb = <><img src={renderUrl(uid, a, "&slide=0")} alt="" loading="lazy" /><span className="count">{a.slides.length} slides</span></>;
  else if (a.format === "video_script") thumb = <><img src={renderUrl(uid, a, "&scene=0")} alt="" loading="lazy" /><span className="count">▶ {a.scenes.length} scenes · {a.scenes.reduce((s, x) => s + x.duration, 0)}s</span></>;
  else thumb = <div className="textprev">{a.format === "thread" ? a.thread.join("\n\n") : [a.hook, a.body].filter(Boolean).join("\n\n")}</div>;

  return (
    <Link href={`/assets/${a.id}`} className={"card hover asset-card" + (fresh.has(a.id) ? " flash" : "")}>
      <div className="asset-thumb">{thumb}</div>
      <div className="asset-body">
        <div className="between">
          <PlatformTag p={a.platform} />
          <span className={"badge " + a.status}>{a.status}</span>
        </div>
        <div className="t">{a.title}</div>
        <div className="between small muted">
          <span>{FORMAT[a.format]} · {fmtDate(a.scheduledDate)}</span>
          <Who actor={a.updatedBy} />
        </div>
      </div>
    </Link>
  );
}
