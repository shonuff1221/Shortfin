"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetcher, fmtNum, fmtPnl, fmtUsd, pnlClass } from "@/lib/api";

interface EquityPoint {
  ts: string;
  equity: number;
  usdc: number;
  allocated: number;
  upnl: number;
}

interface DailyPnl {
  day: string;
  realized: number;
  fees: number;
  fills: number;
  rts: number;
}

/** Equity sparkline — dependency-free SVG, token-colored. */
function Sparkline({ points }: { points: EquityPoint[] }) {
  const W = 560;
  const H = 120;
  const PAD = 6;
  if (points.length < 2) {
    return (
      <p className="grid h-[120px] place-items-center text-xs text-muted-foreground">
        Collecting equity points… (records every minute while the desk is open)
      </p>
    );
  }
  const values = points.map((p) => p.equity);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = (W - 2 * PAD) / (points.length - 1);
  const coords = values.map((v, i) => [
    PAD + i * step,
    H - PAD - ((v - min) / span) * (H - 2 * PAD),
  ]);
  const line = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${PAD},${H - PAD} ${line} ${W - PAD},${H - PAD}`;
  const up = values[values.length - 1] >= values[0];
  const stroke = up ? "var(--up)" : "var(--down)";
  const first = values[0];
  const last = values[values.length - 1];

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-[120px] w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Equity ${fmtUsd(first)} to ${fmtUsd(last)} over the window`}
      >
        <polygon points={area} fill={up ? "var(--up-soft)" : "var(--down-soft)"} />
        <polyline points={line} fill="none" stroke={stroke} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption className="mt-1 flex justify-between font-mono text-xs text-subtle-foreground">
        <span>{fmtUsd(first)}</span>
        <span className={pnlClass(last - first)}>
          {fmtPnl(last - first)} over {points.length} pts
        </span>
        <span>{fmtUsd(last)}</span>
      </figcaption>
    </figure>
  );
}

/** Daily realized P&L bars — green up / red down from zero line. */
function DailyBars({ days }: { days: DailyPnl[] }) {
  if (days.length === 0) {
    return <p className="grid h-[120px] place-items-center text-xs text-muted-foreground">No fill history yet.</p>;
  }
  const W = 560;
  const H = 120;
  const PAD = 8;
  const values = days.map((d) => d.realized);
  const maxAbs = Math.max(...values.map(Math.abs), 0.01);
  const zero = H / 2;
  const bw = (W - 2 * PAD) / days.length;
  const total = values.reduce((a, b) => a + b, 0);

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[120px] w-full" role="img"
           aria-label={`Daily realized P&L, ${days.length} days, total ${fmtPnl(total)}`}>
        <line x1={PAD} x2={W - PAD} y1={zero} y2={zero} stroke="var(--line-strong)" strokeWidth="1" />
        {days.map((d, i) => {
          const h = (Math.abs(d.realized) / maxAbs) * (H / 2 - PAD);
          const x = PAD + i * bw + bw * 0.18;
          const w = bw * 0.64;
          const y = d.realized >= 0 ? zero - h : zero;
          return (
            <rect key={d.day} x={x} y={y} width={w} height={Math.max(h, 1)}
                  fill={d.realized >= 0 ? "var(--up)" : "var(--down)"} opacity="0.75"
                  rx="2">
              <title>{`${d.day}: ${fmtPnl(d.realized)} · ${d.fills} fills · ${d.rts} RTs`}</title>
            </rect>
          );
        })}
      </svg>
      <figcaption className="mt-1 flex justify-between font-mono text-xs text-subtle-foreground">
        <span>{days[0]?.day.slice(5)}</span>
        <span className={pnlClass(total)}>Σ {fmtPnl(total)}</span>
        <span>{days[days.length - 1]?.day.slice(5)}</span>
      </figcaption>
    </figure>
  );
}

/** History row: equity sparkline + daily P&L (Postgres-backed). */
export function HistoryPanel() {
  const equity = useSWR<{ points: EquityPoint[] }>("/api/history/equity?hours=24", fetcher, {
    keepPreviousData: true,
    refreshInterval: 60_000,
  });
  const daily = useSWR<{ days: DailyPnl[] }>("/api/history/pnl_daily?days=14", fetcher, {
    keepPreviousData: true,
    refreshInterval: 60_000,
  });

  const latest = equity.data?.points?.at(-1);

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle>Equity — 24h</CardTitle>
            {latest && (
              <span className="font-mono text-xs text-muted-foreground">
                now {fmtUsd(latest.equity)} · free {fmtUsd(latest.usdc)}
              </span>
            )}
          </CardHeader>
          <CardContent>
            <Sparkline points={equity.data?.points ?? []} />
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Realized / day</CardTitle>
            <span className="text-xs text-subtle-foreground">venue fills ledger</span>
          </CardHeader>
          <CardContent>
            <DailyBars days={daily.data?.days ?? []} />
            <div className="mt-2 font-mono text-[10px] text-subtle-foreground">
              {daily.data
                ? `${fmtNum(daily.data.days.reduce((a, d) => a + d.fills, 0))} fills · ${fmtNum(
                    daily.data.days.reduce((a, d) => a + d.rts, 0),
                  )} RTs in window`
                : "…"}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
