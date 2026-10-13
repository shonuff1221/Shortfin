"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fmtNum,
  fmtPnl,
  fmtUsd,
  pnlClass,
  type MMCollStatus,
  type MMFill,
  type MMMarket,
  type MMStatus,
} from "@/lib/api";

/* ── engine freshness: status.json is rewritten ~every 30-60s ─────────── */

export function engineHealth(s: MMStatus | null | undefined, generated?: string): "running" | "stale" | "halted" | "down" {
  if (!s) return "down";
  if (s.halted) return "halted";
  const now = generated ? new Date(generated).getTime() : new Date(s.updated).getTime();
  const ageS = (now - new Date(s.updated).getTime()) / 1000;
  return ageS > 120 ? "stale" : "running";
}

/* ── KPI row ──────────────────────────────────────────────────────────── */

function Kpi({ label, value, sub, className }: { label: string; value: string; sub?: string; className?: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/50 p-3">
      <div className="text-[10px] uppercase tracking-wider text-subtle-foreground">{label}</div>
      <div className={`mt-1 font-mono text-base font-semibold sm:text-lg ${className ?? ""}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[10px] text-subtle-foreground">{sub}</div>}
    </div>
  );
}

export function MmKpis({ status, loading }: { status?: MMStatus | null; loading?: boolean }) {
  if (loading && !status) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-[70px]" />
        ))}
      </div>
    );
  }
  const t = status?.total;
  const cap = status?.config?.risk?.gross_cap_usd as number | undefined;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
      <Kpi label="Today" value={fmtPnl(status?.today_pnl)} className={pnlClass(status?.today_pnl)} />
      <Kpi label="Total" value={fmtPnl(t?.pnl)} className={pnlClass(t?.pnl)} sub={`cons ${fmtPnl(t?.pnl_conservative)}`} />
      <Kpi label="bp / vol" value={status?.bp_on_vol == null ? "—" : `${status.bp_on_vol.toFixed(1)}`} />
      <Kpi label="Volume" value={fmtUsd(t?.vol, 0)} sub={`${fmtNum(t?.fills)} fills`} />
      <Kpi label="Inventory" value={`${fmtUsd(t?.gross_inv, 0)}`} sub={cap ? `cap ${fmtUsd(cap, 0)}` : undefined}
        className={t && cap && t.gross_inv >= cap * 0.9 ? "text-warn" : ""} />
      <Kpi label="Quoting" value={`${t?.quoting_now ?? 0}`} sub="markets" />
      <Kpi label="Actions" value={fmtNum(t?.actions)} sub={`${t?.rejects ?? 0} rejects`} />
      <Kpi label="Uptime" value={status ? `${status.uptime_h.toFixed(1)}h` : "—"} />
    </div>
  );
}

/* ── closed days table ────────────────────────────────────────────────── */

export function DaysTable({ rows }: { rows: Record<string, string>[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Closed paper days</CardTitle>
        <span className="text-xs text-subtle-foreground">{rows.length} days</span>
      </CardHeader>
      <CardContent>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-subtle-foreground">
              <th className="pb-2 font-normal">Day</th>
              <th className="pb-2 text-right font-normal">P&amp;L</th>
              <th className="pb-2 text-right font-normal">Volume</th>
              <th className="pb-2 text-right font-normal">Fills</th>
              <th className="pb-2 text-right font-normal">Rejects</th>
              <th className="pb-2 text-right font-normal">Halt</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {rows.map((r) => {
              const pnl = parseFloat(r["pnl$"]);
              return (
                <tr key={r.day} className="border-t border-border/50">
                  <td className="py-1.5">{r.day}</td>
                  <td className={`py-1.5 text-right ${pnlClass(pnl)}`}>{fmtPnl(pnl)}</td>
                  <td className="py-1.5 text-right">{fmtUsd(parseFloat(r["cum_vol$"]), 0)}</td>
                  <td className="py-1.5 text-right">{r.fills}</td>
                  <td className="py-1.5 text-right">{r.rejects}</td>
                  <td className="py-1.5 text-right text-warn">{r.halted || "—"}</td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr><td colSpan={6} className="py-3 text-subtle-foreground">No closed days yet.</td></tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

/* ── nightly replay vs paper ──────────────────────────────────────────── */

export function ReplayTable({ rows }: { rows: Record<string, string>[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Nightly replay (out-of-sample)</CardTitle>
        <span className="text-xs text-subtle-foreground">flat start each day · same config</span>
      </CardHeader>
      <CardContent>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-subtle-foreground">
              <th className="pb-2 font-normal">Day</th>
              <th className="pb-2 text-right font-normal">Replay</th>
              <th className="pb-2 text-right font-normal">Cons</th>
              <th className="pb-2 text-right font-normal">Vol</th>
              <th className="pb-2 text-right font-normal">Paper</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {rows.map((r) => {
              const pnl = parseFloat(r["replay_pnl$"]);
              const cons = parseFloat(r["replay_pnl_cons$"]);
              const pap = parseFloat(r["paper_pnl$"]);
              return (
                <tr key={r.day} className="border-t border-border/50">
                  <td className="py-1.5">{r.day}</td>
                  <td className={`py-1.5 text-right ${pnlClass(pnl)}`}>{fmtPnl(pnl)}</td>
                  <td className={`py-1.5 text-right ${pnlClass(cons)}`}>{fmtPnl(cons)}</td>
                  <td className="py-1.5 text-right">{fmtUsd(parseFloat(r["replay_vol$"]), 0)}</td>
                  <td className={`py-1.5 text-right ${Number.isNaN(pap) ? "text-subtle-foreground" : pnlClass(pap)}`}>
                    {Number.isNaN(pap) ? "—" : fmtPnl(pap)}
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr><td colSpan={5} className="py-3 text-subtle-foreground">No replays yet (runs 00:25 UTC).</td></tr>
            )}
          </tbody>
        </table>
        <p className="mt-2 text-[10px] leading-relaxed text-subtle-foreground">
          Replays restart flat each midnight; the engine carries inventory — compare cumulatives, not single days.
        </p>
      </CardContent>
    </Card>
  );
}

/* ── markets: best/worst + holdings ───────────────────────────────────── */

export function MarketsPanel({ markets }: { markets?: MMMarket[] }) {
  const ranked = (markets ?? []).slice().sort((a, b) => b.pnl - a.pnl);
  const best = ranked.filter((m) => m.pnl > 0).slice(0, 5);
  const worst = ranked.filter((m) => m.pnl < 0).slice(-5).reverse();
  const held = ranked.filter((m) => Math.abs(m["inv$"]) > 1);
  const row = (m: MMMarket) => (
    <div key={m.coin} className="flex items-center justify-between border-t border-border/50 py-1.5 font-mono text-xs">
      <span>{m.coin}</span>
      <span className="flex items-center gap-3">
        {Math.abs(m["inv$"]) > 1 && <span className="text-subtle-foreground">inv {fmtUsd(m["inv$"], 0)}</span>}
        <span className={pnlClass(m.pnl)}>{fmtPnl(m.pnl)}</span>
      </span>
    </div>
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Markets</CardTitle>
        <span className="text-xs text-subtle-foreground">{markets?.length ?? 0} active · {held.length} holding</span>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wider text-up">Best</div>
          {best.map(row)}
          {!best.length && <p className="text-xs text-subtle-foreground">—</p>}
        </div>
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wider text-down">Worst</div>
          {worst.map(row)}
          {!worst.length && <p className="text-xs text-subtle-foreground">—</p>}
        </div>
        {held.length > 0 && (
          <div className="sm:col-span-2">
            <div className="mb-1 text-[10px] uppercase tracking-wider text-subtle-foreground">Open inventory</div>
            {held.map(row)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── recent simulated fills ───────────────────────────────────────────── */

export function FillsPanel({ fills }: { fills?: MMFill[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent fills</CardTitle>
        <span className="text-xs text-subtle-foreground">simulated</span>
      </CardHeader>
      <CardContent>
        <div className="space-y-0 font-mono text-xs">
          {(fills ?? []).map((f, i) => (
            <div key={`${f.ts}-${i}`} className="flex items-center justify-between border-t border-border/50 py-1.5">
              <span className="text-subtle-foreground">
                {new Date(parseInt(f.ts)).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
              <span>{f.coin}</span>
              <Badge tone={f.side === "b" ? "up" : "down"}>{f.side === "b" ? "buy" : "sell"}</Badge>
              <span>
                {parseFloat(f.units).toPrecision(3)} @ {parseFloat(f.px).toPrecision(6)}
              </span>
            </div>
          ))}
          {!fills?.length && <p className="py-2 text-subtle-foreground">No fills recorded today.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── collector health ─────────────────────────────────────────────────── */

export function CollectorCard({ collector, generated }: { collector?: MMCollStatus | null; generated?: string }) {
  if (!collector) {
    return (
      <Card>
        <CardHeader><CardTitle>Collector</CardTitle></CardHeader>
        <CardContent><p className="text-xs text-down">No collector status — is ShortfinCollector running?</p></CardContent>
      </Card>
    );
  }
  const conns = Object.entries(collector.last_msg ?? {});
  const nowS = generated ? new Date(generated).getTime() / 1000 : new Date(collector.updated).getTime() / 1000;
  const worstAge = conns.length ? Math.max(...conns.map(([, ts]) => nowS - ts)) : Infinity;
  const ok = worstAge < 120 && collector.errors === 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Collector</CardTitle>
        <Badge tone={ok ? "up" : "warn"}>{ok ? "OK" : "stale"}</Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <div><span className="text-subtle-foreground">uptime</span><div className="font-mono">{collector.uptime_h.toFixed(1)}h</div></div>
          <div><span className="text-subtle-foreground">markets</span><div className="font-mono">{collector.coins}</div></div>
          <div><span className="text-subtle-foreground">rows</span><div className="font-mono">{fmtNum(Object.values(collector.rows ?? {}).reduce((a, b) => a + b, 0))}</div></div>
          <div><span className="text-subtle-foreground">errors</span><div className={`font-mono ${collector.errors ? "text-down" : ""}`}>{collector.errors}</div></div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {conns.map(([c, ts]) => {
            const age = nowS - ts;
            return (
              <Badge key={c} tone={age < 120 ? "neutral" : "warn"} className="font-mono">
                conn{c} {age < 120 ? `${Math.round(age)}s` : "STALE"}
              </Badge>
            );
          })}
          <Badge tone="neutral" className="font-mono">{collector.reconnects} reconnects</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
