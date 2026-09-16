"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetcher,
  runAction,
  SPACING_CHOICES,
  type ActionResult,
  type DeskAction,
  type Grids,
  type Operate,
} from "@/lib/api";

/**
 * Operate — the write surface. Rotate (lineup.py), freeze/unfreeze
 * (FREEZE_ sentinel files), kill (remediate.py restart), spacing
 * (SPACING_ override files — one-tap, no confirm: low-risk and instantly
 * reversible; grids re-ladder within ~30s). Tool output is surfaced
 * VERBATIM, REFUSED guards included. Max 1 action / 10s API-side.
 *
 * Safety UX: rotate needs one explicit confirm; kill needs a double-confirm
 * (arm → execute, auto-disarms after 6s). Spacing is one-tap + result toast.
 */

/** Segmented [Auto | 5 | 8 | 10] spacing toggle. `state` is the LIVE override
 *  from /api/grids cards: number = override active, null = session auto,
 *  undefined = market not in lineup (no card — override pre-sets rotation). */
function SpacingToggle({
  market,
  state,
  busy,
  onApply,
}: {
  market: string;
  state: number | null | undefined;
  busy: boolean;
  onApply: (bps: number | null) => void;
}) {
  const options: Array<{ label: string; value: number | null }> = [
    { label: "Auto", value: null },
    ...SPACING_CHOICES.map((b) => ({ label: String(b), value: b as number | null })),
  ];
  return (
    <div
      role="radiogroup"
      aria-label={`Rung spacing ${market}`}
      className="inline-flex overflow-hidden rounded-md border border-border"
    >
      {options.map((o) => {
        const active = state === o.value;
        return (
          <button
            key={o.label}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={busy || active}
            title={
              active
                ? o.value === null
                  ? "session auto spacing (engine decides per hour)"
                  : `override ${o.value} bps active — grid re-laddered`
                : o.value === null
                  ? "remove override — back to session auto"
                  : `force ${o.value} bps rung spacing — re-ladders ~30s`
            }
            onClick={() => onApply(o.value)}
            className={`min-h-8 border-l border-border px-2.5 font-mono text-xs transition-colors first:border-l-0 disabled:cursor-default disabled:opacity-100 ${
              active
                ? "bg-brand-soft font-semibold text-brand"
                : "bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            {o.label}
            {o.value === null ? "" : "bp"}
          </button>
        );
      })}
    </div>
  );
}

export function OperatePanel() {
  const { data, mutate, isLoading } = useSWR<Operate>("/api/operate", fetcher, {
    refreshInterval: 30_000,
    keepPreviousData: true,
    errorRetryInterval: 10_000,
  });
  // live spacing state rides the grids cards (same SWR key as the desk page → shared cache)
  const { data: grids, mutate: mutateGrids } = useSWR<Grids>("/api/grids", fetcher, {
    refreshInterval: 30_000,
    keepPreviousData: true,
    errorRetryInterval: 10_000,
  });

  const [pickedOverride, setPickedOverride] = useState<{ from: string; picked: string[] } | null>(null);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [killArmed, setKillArmed] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const disarmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lineupMarkets = data?.lineup?.markets ?? [];
  const lineupKey = lineupMarkets.join(",");
  // user's composer selection, valid only against the lineup it was made against;
  // falls back to the live lineup once the lineup (or data) changes externally
  const picked = pickedOverride && pickedOverride.from === lineupKey ? pickedOverride.picked : lineupMarkets;

  // live per-market spacing override from the grids cards (null = auto; undefined = no card)
  const spacingByMarket = new Map<string, number | null>();
  for (const card of grids?.markets ?? []) {
    spacingByMarket.set(card.market, card.spacing_override ?? null);
  }

  useEffect(
    () => () => {
      if (disarmTimer.current) clearTimeout(disarmTimer.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  function flashToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 6_000);
  }

  function disarmSoon() {
    if (disarmTimer.current) clearTimeout(disarmTimer.current);
    disarmTimer.current = setTimeout(() => {
      setConfirmRotate(false);
      setKillArmed(null);
    }, 6_000);
  }

  function toggleMarket(m: string) {
    const base = picked.includes(m) ? picked.filter((x) => x !== m) : [...picked, m];
    setPickedOverride({ from: lineupKey, picked: base });
    setConfirmRotate(false);
  }

  async function act(
    label: string,
    body: { action: DeskAction; market?: string; markets?: string[]; bps?: number | null },
    successToast?: string,
  ) {
    setBusy(label);
    setNotice(null);
    try {
      const res = await runAction(body);
      setResult(res);
      setConfirmRotate(false);
      setKillArmed(null);
      if (successToast) flashToast(successToast, res.ok);
      // refresh write-surface + grid/lineup views
      await mutate();
      if (body.action === "spacing" || body.action === "rotate") await mutateGrids();
    } catch (err) {
      if (err instanceof Error && err.message === "rate-limited") {
        setNotice("Rate-limited — max 1 action per 10s. Wait a moment.");
      } else if (err instanceof Error && err.message === "unauthorized") {
        setNotice("Token rejected — lock and re-enter the desk.");
      } else {
        setNotice(err instanceof Error ? err.message : "action failed");
      }
    } finally {
      setBusy(null);
    }
  }

  const lineupChanged =
    JSON.stringify([...picked].sort()) !== JSON.stringify([...lineupMarkets].sort());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Operate</CardTitle>
        <Badge tone="warn">write</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* current lineup */}
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-subtle-foreground">
            Current lineup
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {isLoading && !data ? (
              <span className="text-sm text-muted-foreground">loading…</span>
            ) : lineupMarkets.length === 0 ? (
              <span className="text-sm text-muted-foreground">none</span>
            ) : (
              lineupMarkets.map((m) => (
                <Badge key={m} tone="brand" className="font-mono">
                  {m}
                </Badge>
              ))
            )}
          </div>
        </div>

        {/* rotate composer */}
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-subtle-foreground">
            Rotate lineup — pick markets (multi-select)
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Lineup candidates">
            {(data?.candidates ?? []).map((c) => {
              const on = picked.includes(c.market);
              return (
                <button
                  key={c.market}
                  type="button"
                  onClick={() => toggleMarket(c.market)}
                  aria-pressed={on}
                  className={`min-h-9 rounded-md border px-2.5 font-mono text-xs transition-colors ${
                    on
                      ? "border-brand/60 bg-brand-soft text-brand"
                      : "border-border bg-card text-muted-foreground hover:border-brand/30 hover:text-foreground"
                  }`}
                >
                  {c.market}
                  {c.frozen && (
                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-label="frozen" className="ml-1.5 inline-block align-baseline">
                      <path d="M6 1v10M2 3l8 6M10 3l-8 6M1.5 6h9" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {confirmRotate ? (
              <Button
                size="sm"
                variant="down"
                disabled={busy !== null || picked.length === 0}
                onClick={() => act(`rotate ${picked.join(",")}`, { action: "rotate", markets: picked })}
              >
                {busy?.startsWith("rotate") ? "Rotating…" : `Confirm — rotate to ${picked.length} market${picked.length === 1 ? "" : "s"}`}
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={busy !== null || picked.length === 0 || !lineupChanged}
                onClick={() => {
                  setConfirmRotate(true);
                  disarmSoon();
                }}
              >
                Apply lineup ({picked.length})
              </Button>
            )}
            {lineupChanged && !confirmRotate && (
              <span className="text-xs text-warn">differs from live lineup</span>
            )}
          </div>
        </div>

        {/* per-market spacing · freeze · kill */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-subtle-foreground">
            Markets — spacing · freeze · kill/restart
          </p>
          {(data?.candidates ?? []).map((c) => {
            const spacing = spacingByMarket.get(c.market);
            return (
            <div
              key={c.market}
              className="flex flex-col gap-2 rounded-lg border border-border/70 bg-card px-2.5 py-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm">{c.market}</span>
                {c.in_lineup ? (
                  <Badge tone="brand">live</Badge>
                ) : (
                  <Badge tone="neutral">off</Badge>
                )}
                {c.frozen && <Badge tone="info">frozen</Badge>}
                {spacing != null && (
                  <Badge tone="warn" className="font-mono">
                    {spacing}bp lock
                  </Badge>
                )}
                <span className="flex-1" />
                <Button
                  size="sm"
                  variant={c.frozen ? "outline" : "default"}
                  className="h-9"
                  disabled={busy !== null}
                  onClick={() =>
                    act(`${c.frozen ? "unfreeze" : "freeze"} ${c.market}`, {
                      action: c.frozen ? "unfreeze" : "freeze",
                      market: c.market,
                    })
                  }
                >
                  {busy === `${c.frozen ? "unfreeze" : "freeze"} ${c.market}`
                    ? "…"
                    : c.frozen
                      ? "Unfreeze"
                      : "Freeze"}
                </Button>
                {killArmed === c.market ? (
                  <Button
                    size="sm"
                    variant="down"
                    className="h-9 animate-pulse"
                    disabled={busy !== null}
                    onClick={() => act(`kill ${c.market}`, { action: "kill", market: c.market })}
                  >
                    {busy === `kill ${c.market}` ? "Killing…" : "Confirm kill?"}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9 text-down hover:text-down"
                    disabled={busy !== null || !c.in_lineup}
                    title={c.in_lineup ? "kill + restart this market's bot" : "not in lineup"}
                    onClick={() => {
                      setKillArmed(c.market);
                      disarmSoon();
                    }}
                  >
                    Kill
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-medium uppercase tracking-wider text-subtle-foreground">
                  Rung spacing
                </span>
                <SpacingToggle
                  market={c.market}
                  state={spacing}
                  busy={busy !== null}
                  onApply={(bps) =>
                    act(
                      `spacing ${c.market} ${bps ?? "auto"}`,
                      { action: "spacing", market: c.market, bps },
                      `${c.market} → ${bps == null ? "auto (session)" : `${bps} bp`} — re-ladders ~30s`,
                    )
                  }
                />
                {spacing === undefined && !grids && (
                  <span className="text-xs text-subtle-foreground">loading state…</span>
                )}
                {spacing === undefined && grids && !c.in_lineup && (
                  <span className="text-xs text-subtle-foreground" title="takes effect when rotated in">
                    not live — sets on rotation
                  </span>
                )}
              </div>
            </div>
            );
          })}
        </div>

        {/* notices + verbatim tool output */}
        {notice && (
          <p role="alert" className="rounded-lg border border-warn/40 bg-warn-soft px-3 py-2 text-xs text-warn">
            {notice}
          </p>
        )}
        {result && (
          <div>
            <div className="flex items-center gap-2">
              <Badge tone={result.ok ? "up" : "down"}>{result.ok ? "ok" : "refused/failed"}</Badge>
              <span className="font-mono text-xs text-muted-foreground">
                {result.action}
                {result.args.market ? ` ${result.args.market}` : ""}
                {result.args.markets ? ` ${result.args.markets.join(",")}` : ""}
                {result.action === "spacing" ? ` ${result.args.bps == null ? "auto" : `${result.args.bps}bp`}` : ""} · exit {result.exit_code ?? "—"} · {result.elapsed_s}s
              </span>
            </div>
            <pre className="mt-2 max-h-40 overflow-auto rounded-lg border border-border bg-background/60 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words">
              {result.output}
            </pre>
          </div>
        )}

        {/* result toast (spacing one-tap) */}
        {toast && (
          <div
            role="status"
            aria-live="polite"
            className={`fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-lg border px-4 py-2.5 font-mono text-xs shadow-lg sm:inset-x-auto ${
              toast.ok
                ? "border-up/50 bg-card text-up"
                : "border-warn/50 bg-card text-warn"
            }`}
          >
            {toast.msg}
          </div>
        )}

        <p className="text-xs text-subtle-foreground">
          Invokes the operator tooling only (lineup.py · FREEZE/SPACING files · remediate.py). Every
          action is audited to Postgres + the ops journal. Max 1 action / 10s.
        </p>
      </CardContent>
    </Card>
  );
}
