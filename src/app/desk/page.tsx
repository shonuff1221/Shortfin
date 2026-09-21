"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { BRAND } from "@/lib/brand";
import { clearToken, fetcher, getToken, type Grids, type Lab, type Positions, type Pulse, type Rotations, type Summary } from "@/lib/api";
import { FinMark } from "@/components/brand-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TokenGate } from "@/components/desk/token-gate";
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
import { RunnersPanel } from "@/components/desk/runners-panel";

const POLL_MS = 30_000;

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

export default function DeskPage() {
  // auth state: "checking" -> "gate" | "in"
  const [auth, setAuth] = useState<"checking" | "gate" | "in">("checking");
  const { summary, positions, grids, rotations, lab, pulses } = useDeskData(auth === "in");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!getToken()) {
        if (!cancelled) setAuth("gate");
        return;
      }
      try {
        await fetcher("/api/summary");
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

  const live = !summary.error && !positions.error;
  const sziByMarket = new Map<string, number>();
  for (const p of positions.data?.positions ?? []) {
    sziByMarket.set(p.coin, p.szi);
    sziByMarket.set(p.coin.split(":").pop() ?? p.coin, p.szi);
  }

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
            <div className="flex min-w-0 gap-1.5 overflow-x-auto">
              {(grids.data?.lineup?.markets ?? []).map((m) => (
                <Badge key={m} tone="neutral" className="font-mono">
                  {m}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge tone={live ? "up" : "down"}>
              <span className={`size-1.5 rounded-full ${live ? "bg-up animate-pulse" : "bg-down"}`} aria-hidden />
              {live ? "live" : "reconnecting"}
            </Badge>
            <Button variant="ghost" size="sm" onClick={logout}>
              Lock
            </Button>
          </div>
        </div>
      </header>

      <main className="desk-glow mx-auto max-w-7xl space-y-4 p-4 sm:space-y-6 sm:p-6">
        <KpiRow
          summary={summary.data}
          positions={positions.data}
          loading={summary.isLoading || positions.isLoading}
        />

        <OperatePanel />

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
          </div>
          <div className="lg:col-span-2">
            <FillsPanel fills={positions.data?.fills_recent} />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <LabPanel data={lab.data} />
          </div>
          <div className="lg:col-span-2">
            <PulsesPanel entries={pulses.data?.entries} />
          </div>
        </div>

        <footer className="pb-6 pt-2 text-center text-xs text-subtle-foreground">
          Read + operate · polls every 30s · brain API on :8890 · actions audited
        </footer>
      </main>
    </div>
  );
}
