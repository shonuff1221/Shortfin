"use client";

import { useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CollapsibleCard } from "@/components/desk/collapsible-card";
import { fetcher, fmtNum, fmtUsd, type VolumeData, type VolumeWindow } from "@/lib/api";

const WINDOWS = [
  { id: "24h", label: "24H" },
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
] as const;

type WindowId = (typeof WINDOWS)[number]["id"];

/** Sliding-pill segmented control (real buttons, aria-pressed). */
function WindowToggle({ value, onChange }: { value: WindowId; onChange: (w: WindowId) => void }) {
  const idx = WINDOWS.findIndex((w) => w.id === value);
  return (
    <div
      role="group"
      aria-label="Volume window"
      className="relative grid w-full max-w-56 grid-cols-3 rounded-lg border border-border bg-muted p-1"
    >
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-md border border-brand/30 bg-raised shadow-[0_0_12px_-4px_var(--brand-soft)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ transform: `translateX(${idx * 100}%)` }}
      />
      {WINDOWS.map((w) => (
        <button
          key={w.id}
          type="button"
          aria-pressed={value === w.id}
          onClick={() => onChange(w.id)}
          className={`relative z-10 cursor-pointer rounded-md py-1.5 text-center font-mono text-xs font-medium transition-colors duration-200 ${
            value === w.id ? "text-brand-strong" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {w.label}
        </button>
      ))}
    </div>
  );
}

/** Daily volume bars — brand-colored, staggered entrance, hover titles. */
function VolumeBars({ days }: { days: VolumeData["by_day"] }) {
  if (days.length === 0) {
    return <p className="grid h-16 place-items-center text-xs text-muted-foreground">No volume history yet.</p>;
  }
  const max = Math.max(...days.map((d) => d.volume), 0.01);
  const shown = days.slice(-30);
  return (
    <div>
      <div className="flex h-16 items-end gap-1" role="img" aria-label={`Daily volume over last ${shown.length} days`}>
        {shown.map((d, i) => (
          <div
            key={d.day}
            title={`${d.day}: ${fmtUsd(d.volume)} · ${fmtNum(d.fills)} fills`}
            className="anim-in flex-1 rounded-sm bg-brand/60 transition-colors duration-200 hover:bg-brand-strong"
            style={{ height: `${Math.max(4, (d.volume / max) * 100)}%`, ["--d" as string]: `${Math.min(i * 20, 400)}ms` }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[10px] text-subtle-foreground">
        <span>{shown[0]?.day.slice(5)}</span>
        <span>peak {fmtUsd(max, 0)}</span>
        <span>{shown[shown.length - 1]?.day.slice(5)}</span>
      </div>
    </div>
  );
}

/** Volume card: venue-fill volume with 24H/7D/30D windows + daily bars. */
export function VolumeCard() {
  const { data, isLoading } = useSWR<VolumeData>("/api/history/volume", fetcher, {
    keepPreviousData: true,
    refreshInterval: 60_000,
  });
  const [win, setWin] = useState<WindowId>("24h");

  const w: VolumeWindow | undefined = data?.windows?.[win];
  const live24 = data?.windows?.["24h"];
  // coverage check uses the payload's own ts (pure — no Date.now during render)
  const shortCoverage =
    win === "30d" && data?.coverage_from != null && data?.ts != null
      ? new Date(data.coverage_from) > new Date(data.ts * 1000 - 29 * 86_400_000)
      : false;

  return (
    <CollapsibleCard
      id="volume"
      title="Volume"
      meta={
        w ? (
          <Badge tone="neutral" className="font-mono">
            {fmtNum(w.fills)} fills · {fmtNum(w.rts)} RTs
          </Badge>
        ) : null
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-medium uppercase tracking-wider text-subtle-foreground">
              Traded volume — {win === "24h" ? "24 hours" : win === "7d" ? "7 days" : "30 days"}
            </div>
            {isLoading && !data ? (
              <Skeleton className="mt-2 h-9 w-40" />
            ) : (
              /* key on value: remount replays the flash animation on change */
              <div key={w?.volume} className="anim-flash mt-1 font-mono text-3xl font-semibold tabular-nums sm:text-4xl">
                {fmtUsd(w?.volume ?? null, 0)}
              </div>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle-foreground">
              {shortCoverage && data?.coverage_from && (
                <span title="ledger coverage starts here">ledger from {data.coverage_from.slice(5)}</span>
              )}
              {win !== "24h" && live24 && <span>24h: {fmtUsd(live24.volume, 0)}</span>}
            </div>
          </div>
          <WindowToggle value={win} onChange={setWin} />
        </div>
        <VolumeBars days={data?.by_day ?? []} />
      </div>
    </CollapsibleCard>
  );
}
