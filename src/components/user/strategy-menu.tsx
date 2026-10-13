"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saveUserStrategy, type StrategyOption } from "@/lib/api";

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden className="size-3.5">
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

function GaugeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="size-4">
      <path d="M12 15V9M4.6 9a9 9 0 0 1 14.8 0M4.6 9 3 7.5M19.4 9 21 7.5" />
      <circle cx="12" cy="15" r="1" />
    </svg>
  );
}

/** Strategy menu — the catalog as selectable cards with save. Radio-group
 *  semantics; the current pick persists server-side (shortfin.users.strategy). */
export function StrategyMenu({
  strategies,
  current,
  onSaved,
}: {
  strategies: StrategyOption[] | undefined;
  current: string | null | undefined;
  onSaved: () => void;
}) {
  // selection = explicit user pick, else whatever the server says
  const [picked, setPicked] = useState<string | null>(null);
  const selected = picked ?? current ?? null;
  const [busy, setBusy] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!selected || busy) return;
    setErr(null);
    setBusy(true);
    try {
      await saveUserStrategy(selected);
      onSaved();
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg === "unauthorized" ? "session expired — sign in again" : "could not save — try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-md border border-brand/40 bg-brand-soft text-brand">
            <GaugeIcon />
          </span>
          Strategy
        </CardTitle>
        {current ? <Badge tone="brand">active pick</Badge> : <Badge tone="warn">not set</Badge>}
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          All tiers run the same market-making grid — <span className="text-foreground">Chop Harvester</span> —
          at different rung spacings. Wider spacing trades less and weathers trends better.
        </p>
        <div role="radiogroup" aria-label="Strategy tiers" className="grid gap-2.5">
          {strategies === undefined ? null : strategies.map((s) => {
            const active = selected === s.id;
            const isCurrent = current === s.id;
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setPicked(s.id)}
                className={`min-h-[76px] cursor-pointer rounded-xl border p-3.5 text-left transition-colors duration-200 sm:p-4 ${
                  active
                    ? "border-brand bg-brand-soft/60"
                    : "border-border bg-raised/40 hover:border-border-strong hover:bg-raised"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{s.name}</span>
                  <Badge tone={active ? "brand" : "neutral"}>{s.spacing_bps}bp rungs</Badge>
                  {isCurrent && (
                    <span className="text-xs font-medium text-brand">current</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{s.tagline}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-subtle-foreground">{s.risk_note}</p>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={save}
            disabled={busy || selected === undefined || selected === current}
          >
            {busy ? "Saving…" : savedFlash ? (
              <>
                <CheckIcon /> Saved
              </>
            ) : (
              "Save strategy"
            )}
          </Button>
          {err && <p className="text-xs text-down" role="alert">{err}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
