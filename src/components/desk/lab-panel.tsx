"use client";

import { CollapsibleCard } from "@/components/desk/collapsible-card";
import { Badge } from "@/components/ui/badge";
import { fmtNum, pnlClass, type Lab } from "@/lib/api";

/** Latest daily-lab verdict: ranked markets, ours flagged, dump warning. */
export function LabPanel({ data }: { data?: Lab }) {
  const ranked = Object.entries(data?.markets ?? {})
    .filter(([, m]) => m.best_net_bps_day != null)
    .sort((a, b) => (b[1].best_net_bps_day ?? 0) - (a[1].best_net_bps_day ?? 0));

  const date = data ? new Date(data.ts * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—";

  return (
    <CollapsibleCard
      id="lab"
      title={`Daily lab — ${date}`}
      meta={
        data ? (
          <Badge tone={data.correlated_dump ? "down" : "up"}>
            {data.correlated_dump ? "correlated dump ⚠" : "no dumps"}
          </Badge>
        ) : null
      }
    >
        {!data ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : ranked.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No snapshots yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {ranked.slice(0, 7).map(([market, m], i) => (
              <li
                key={market}
                className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${
                  m.ours ? "border-brand/40 bg-brand-soft" : "border-transparent"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="w-5 text-right font-mono text-xs text-subtle-foreground">{i + 1}</span>
                  <span className="truncate font-mono text-sm">{market}</span>
                  {m.ours && <Badge tone="brand">ours</Badge>}
                  {m.oscillating === false && <Badge tone="warn">trend</Badge>}
                </div>
                <span className={`font-mono text-sm ${pnlClass(m.best_net_bps_day)}`}>
                  {fmtNum(m.best_net_bps_day, 0)} bp/d
                </span>
              </li>
            ))}
          </ul>
        )}
    </CollapsibleCard>
  );
}
