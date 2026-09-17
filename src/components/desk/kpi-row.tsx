"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { fmtNum, fmtPnl, fmtUsd, pnlClass, type Summary, type Positions } from "@/lib/api";

interface Kpi {
  label: string;
  value: string;
  className?: string;
  /** small provenance chip rendered under the value (equity: live vs ops-log) */
  chip?: { text: string; tone: "up" | "warn" };
}

/** KPI row — 2-col grid on mobile, 6-up on desktop. Venue numbers when live,
 *  ops-log numbers as fallback. Values flash briefly when they change
 *  (key-remount replays the CSS animation — no state, no layout shift). */
export function KpiRow({
  summary,
  positions,
  loading,
}: {
  summary?: Summary;
  positions?: Positions;
  loading: boolean;
}) {
  if (loading && !summary && !positions) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px]" />
        ))}
      </div>
    );
  }

  const realized = positions?.realized_24h ?? summary?.realized_24h;
  const fills = positions?.fills_24h ?? summary?.fills_24h;
  const rts = positions?.rts_24h ?? summary?.rts_24h;
  const equity = positions?.account_value ?? summary?.equity;
  const fees = positions?.fees_24h ?? summary?.fees_24h;
  const volume = positions?.volume_24h ?? summary?.volume_24h;

  // equity provenance: venue live (cached ≤60s) vs hourly ops-log fallback
  const liveEquity = (summary?.equity_source ?? "").startsWith("venue");

  const kpis: Kpi[] = [
    {
      label: "Equity",
      value: fmtUsd(equity),
      chip: { text: liveEquity ? "live" : "ops-log", tone: liveEquity ? "up" : "warn" },
    },
    { label: "Realized 24h", value: fmtPnl(realized), className: pnlClass(realized) },
    { label: "Volume 24h", value: fmtUsd(volume, 0) },
    { label: "Fills 24h", value: fmtNum(fills) },
    { label: "Round trips", value: fmtNum(rts) },
    { label: "Fees 24h", value: fmtUsd(fees, 4) },
  ];

  return (
    <div aria-busy={loading}>
      {summary && summary.issues.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-warn/40 bg-warn-soft px-3 py-2">
          <Badge tone="warn">ops</Badge>
          <span className="text-xs text-warn">
            {summary.issues.join(" · ")}
          </span>
        </div>
      )}
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="card-hover">
            <CardContent className="p-3 sm:p-4">
              <dt className="text-[10px] font-medium uppercase tracking-wider text-subtle-foreground sm:text-xs">
                {kpi.label}
              </dt>
              <dd
                key={kpi.value}
                className={`anim-flash mt-1 font-mono text-base font-semibold tabular-nums sm:text-xl ${kpi.className ?? ""}`}
              >
                {kpi.value}
              </dd>
              {kpi.chip && (
                <div className="mt-1.5">
                  <Badge tone={kpi.chip.tone}>{kpi.chip.text}</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </dl>
    </div>
  );
}
