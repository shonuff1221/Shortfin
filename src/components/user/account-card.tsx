"use client";

import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetcher,
  fmtNum,
  fmtPnl,
  fmtUsd,
  pnlClass,
  type UserAccountData,
} from "@/lib/api";

const POLL_MS = 30_000;

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="size-4">
      <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      <path d="M16 12h2" />
    </svg>
  );
}

/** Account overview — LIVE public reads of the session wallet on Hyperliquid
 *  (equity / allocated margin / unrealized P&L / open positions / 24h stats),
 *  SWR-polled every 30s with graceful skeletons. */
export function AccountCard() {
  const { data, error, isLoading } = useSWR<UserAccountData>(
    "/api/user/account",
    fetcher,
    { refreshInterval: POLL_MS, keepPreviousData: true, errorRetryInterval: 10_000 },
  );

  const kpis = [
    { label: "Equity", value: fmtUsd(data?.equity), chip: "live" as const },
    { label: "Allocated margin", value: fmtUsd(data?.allocated_margin) },
    { label: "Unrealized P&L", value: fmtPnl(data?.unrealized_pnl), className: pnlClass(data?.unrealized_pnl) },
    { label: "Realized 24h", value: fmtPnl(data?.realized_24h), className: pnlClass(data?.realized_24h) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-md border border-info/40 bg-info-soft text-info">
            <WalletIcon />
          </span>
          Account overview
        </CardTitle>
        <div className="flex items-center gap-2">
          {data ? (
            <>
              <Badge tone="up">live</Badge>
              <span className="text-xs text-subtle-foreground">refreshes 30s</span>
            </>
          ) : isLoading ? (
            <Skeleton className="h-5 w-24" />
          ) : (
            <Badge tone="warn">venue unreachable — retrying</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy={isLoading}>
          {kpis.map((kpi) => (
            <div key={kpi.label} className="rounded-lg border border-border bg-raised/50 p-3">
              <dt className="text-[10px] font-medium uppercase tracking-wider text-subtle-foreground sm:text-xs">
                {kpi.label}
              </dt>
              <dd className={`mt-1 font-mono text-base font-semibold sm:text-lg ${kpi.className ?? ""}`}>
                {isLoading && !data ? <Skeleton className="h-6 w-20" /> : kpi.value}
              </dd>
            </div>
          ))}
        </dl>

        <div>
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
              Open positions
            </h4>
            {data && (
              <span className="text-xs text-subtle-foreground">
                {fmtNum(data.fills_24h)} fills 24h · {fmtUsd(data.fees_24h, 4)} fees
              </span>
            )}
          </div>
          {isLoading && !data ? (
            <div className="mt-2 space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : !data ? (
            <p className="mt-2 text-sm text-muted-foreground">live data unavailable — retrying in the background</p>
          ) : data.positions.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No open positions — {error ? "wallet reads are retrying" : "this wallet is idle on Hyperliquid"}.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-border">
              {data.positions.map((p) => (
                <li key={`${p.dex}:${p.coin}`} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{p.coin}</span>
                      <Badge tone="neutral">{p.dex}</Badge>
                    </div>
                    <div className="mt-0.5 text-xs text-subtle-foreground">
                      {p.szi > 0 ? "+" : "−"}{Math.abs(p.szi)} @ {p.entry_px ?? "—"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm">{fmtUsd(p.position_value)}</div>
                    <div className={`font-mono text-xs ${pnlClass(p.u_pnl)}`}>{fmtPnl(p.u_pnl)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
