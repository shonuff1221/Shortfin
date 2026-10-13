"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { BRAND } from "@/lib/brand";
import { clearToken, fetchMM, fetcher, getToken, type MMResponse } from "@/lib/api";
import { FinMark } from "@/components/brand-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TokenGate } from "@/components/desk/token-gate";
import {
  CollectorCard,
  DaysTable,
  engineHealth,
  FillsPanel,
  MarketsPanel,
  MmKpis,
  ReplayTable,
} from "@/components/desk/mm-panels";

const POLL_MS = 15_000;

const HEALTH = {
  running: { tone: "up" as const, label: "running" },
  stale: { tone: "warn" as const, label: "stale" },
  halted: { tone: "down" as const, label: "halted" },
  down: { tone: "down" as const, label: "down" },
};

export default function DeskPage() {
  const [auth, setAuth] = useState<"checking" | "gate" | "in">("checking");
  const [mode, setMode] = useState<"paper" | "live">("paper");

  const { data, error, isLoading } = useSWR<MMResponse>(
    auth === "in" ? `/api/mm?mode=${mode}` : null,
    fetcher,
    { keepPreviousData: true, refreshInterval: POLL_MS, errorRetryInterval: 10_000 },
  );

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

      <main className="mx-auto max-w-7xl space-y-4 p-4 sm:space-y-6 sm:p-6">
        {s?.halted && (
          <div className="rounded-lg border border-down/40 bg-down-soft px-4 py-3 text-sm text-down">
            Engine halted — {s.halt_reason}. Investigate the engine log before restarting.
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
