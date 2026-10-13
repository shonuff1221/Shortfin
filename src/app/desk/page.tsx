"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { BRAND } from "@/lib/brand";
<<<<<<< HEAD
import { clearToken, fetchMM, fetcher, getToken, type MMResponse } from "@/lib/api";
=======
import { clearToken, fetcher, getToken, type Grids, type Lab, type Positions, type Pulse, type Rotations, type Summary } from "@/lib/api";
>>>>>>> a0266a72fa0758df18f0f30bd5fd73a97b11fe1f
import { FinMark } from "@/components/brand-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TokenGate } from "@/components/desk/token-gate";
<<<<<<< HEAD
import {
  CollectorCard,
  DaysTable,
  engineHealth,
  FillsPanel,
  MarketsPanel,
  MmKpis,
  ReplayTable,
} from "@/components/desk/mm-panels";
=======
import { KpiRow } from "@/components/desk/kpi-row";
import { PositionsPanel } from "@/components/desk/positions-panel";
import { GridCard } from "@/components/desk/grid-card";
import { FleetStrip } from "@/components/desk/fleet-strip";
import { VolumeCard } from "@/components/desk/volume-card";
import { FillsPanel } from "@/components/desk/fills-panel";
import { LabPanel } from "@/components/desk/lab-panel";
import { PulsesPanel } from "@/components/desk/pulses-panel";
import { HistoryPanel } from "@/components/desk/history-panel";
import { OperatePanel } from "@/components/desk/operate-panel";
import { UsersPanel } from "@/components/desk/users-panel";
import { RunnersPanel } from "@/components/desk/runners-panel";
>>>>>>> a0266a72fa0758df18f0f30bd5fd73a97b11fe1f

const POLL_MS = 15_000;

<<<<<<< HEAD
const HEALTH = {
  running: { tone: "up" as const, label: "running" },
  stale: { tone: "warn" as const, label: "stale" },
  halted: { tone: "down" as const, label: "halted" },
  down: { tone: "down" as const, label: "down" },
};
=======
function useDeskData(active: boolean) {
  const cfg = {
    fetcher,
    keepPreviousData: true,
    refreshInterval: POLL_MS,
    errorRetryInterval: 10_000,
  } as const;
  const summary = useSWR<Summary>(active ? "/api/summary" : null, fetcher, cfg);
  const positions = useSWR<Positions>(active ? "/api/positions" : null, fetcher, cfg);
  const grids = useSWR<Grids>(active ? "/api/grids" : null, fetcher, cfg);
  const rotations = useSWR<Rotations>(active ? "/api/rotations" : null, fetcher, {
    ...cfg,
    refreshInterval: 60_000, // rotations are rare — poll gently
  });
  const lab = useSWR<Lab>(active ? "/api/lab" : null, fetcher, cfg);
  const pulses = useSWR<{ entries: Pulse[] }>(active ? "/api/pulses" : null, fetcher, cfg);
  return { summary, positions, grids, rotations, lab, pulses };
}
>>>>>>> a0266a72fa0758df18f0f30bd5fd73a97b11fe1f

export default function DeskPage() {
  const [auth, setAuth] = useState<"checking" | "gate" | "in">("checking");
<<<<<<< HEAD
  const [mode, setMode] = useState<"paper" | "live">("paper");

  const { data, error, isLoading } = useSWR<MMResponse>(
    auth === "in" ? `/api/mm?mode=${mode}` : null,
    fetcher,
    { keepPreviousData: true, refreshInterval: POLL_MS, errorRetryInterval: 10_000 },
  );
=======
  const { summary, positions, grids, rotations, lab, pulses } = useDeskData(auth === "in");
>>>>>>> a0266a72fa0758df18f0f30bd5fd73a97b11fe1f

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!getToken()) {
        if (!cancelled) setAuth("gate");
        return;
      }
      try {
        await fetchMM("paper");
        if (!cancelled) setAuth("in");
      } catch {
        if (!cancelled) setAuth("gate");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setAuth("gate");
  }, []);

  if (auth === "checking") {
    return (
      <div className="grid min-h-screen place-items-center">
        <p className="text-sm text-muted-foreground">Checking access…</p>
      </div>
    );
  }
  if (auth === "gate") return <TokenGate onVerified={() => setAuth("in")} />;

  const s = data?.status;
  const health = engineHealth(s, data?.generated);
  const h = HEALTH[health];
  const q = s?.config?.quoting ?? {};
  const cfgLine = s
    ? `spread ≥ ${q.min_spr_bp}bp · improve ${q.imp_bp}bp · $${q.clip_usd} clips ×${q.max_clips} · keep band ${q.keep_band_bp}bp`
    : "";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <span className="grid size-6 place-items-center rounded border border-brand/40 bg-brand-soft text-brand">
                <FinMark size={13} />
              </span>
              <span className="hidden text-sm font-semibold sm:block">{BRAND.name} desk</span>
            </Link>
            <span className="truncate font-mono text-xs text-subtle-foreground">{cfgLine}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex rounded-md border border-border">
              {(["paper", "live"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                    mode === m ? "bg-brand-soft text-brand" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <Badge tone={h.tone}>
              <span className={`size-1.5 rounded-full ${health === "running" ? "bg-up animate-pulse" : health === "stale" ? "bg-warn" : "bg-down"}`} aria-hidden />
              {h.label}
            </Badge>
            <Button variant="ghost" size="sm" onClick={logout}>
              Lock
            </Button>
          </div>
        </div>
      </header>

<<<<<<< HEAD
      <main className="mx-auto max-w-7xl space-y-4 p-4 sm:space-y-6 sm:p-6">
        {s?.halted && (
          <div className="rounded-lg border border-down/40 bg-down-soft px-4 py-3 text-sm text-down">
            Engine halted — {s.halt_reason}. Investigate the engine log before restarting.
=======
      <main className="desk-glow mx-auto max-w-7xl space-y-4 p-4 sm:space-y-6 sm:p-6">
        <KpiRow
          summary={summary.data}
          positions={positions.data}
          loading={summary.isLoading || positions.isLoading}
        />

        <OperatePanel />

        <UsersPanel />

        <RunnersPanel />

        <FleetStrip grids={grids.data} rotations={rotations.data?.events} />

        <section aria-label="Grids" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(grids.data?.markets ?? []).map((card) => (
            <GridCard key={card.market} card={card} positionSzi={sziByMarket.get(card.market)} />
          ))}
          {grids.isLoading && !grids.data && (
            <p className="text-sm text-muted-foreground">Loading grids…</p>
          )}
        </section>

        <HistoryPanel />

        <VolumeCard />

        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <PositionsPanel data={positions.data} lineup={grids.data?.lineup?.markets} />
>>>>>>> a0266a72fa0758df18f0f30bd5fd73a97b11fe1f
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-warn">
            Desk feed unavailable — {String(error.message ?? error)}. If this is live mode, the live engine may not be running yet.
          </div>
        )}

        <MmKpis status={s} loading={isLoading} />

        <div className="grid gap-4 lg:grid-cols-2">
          <DaysTable rows={data?.daily ?? []} />
          <ReplayTable rows={data?.replay ?? []} />
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <MarketsPanel markets={s?.markets} />
          </div>
          <div className="space-y-4 lg:col-span-2">
            <FillsPanel fills={data?.fills} />
            <CollectorCard collector={data?.collector} generated={data?.generated} />
          </div>
        </div>

        <footer className="pb-6 pt-2 text-center text-xs text-subtle-foreground">
          Market-making desk · reads engine state files directly · polls every {POLL_MS / 1000}s · {mode} mode
        </footer>
      </main>
    </div>
  );
}
