"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { activateRunner, type UserProfile } from "@/lib/api";

function PowerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="size-4">
      <path d="M12 3v9" />
      <path d="M18.4 6.6a9 9 0 1 1-12.8 0" />
    </svg>
  );
}

/** Go-live card — flips users.active via /api/user/activate. Enabled only
 *  when the agent key is approved AND a strategy is chosen. Going live needs
 *  an explicit confirmation (native <dialog>: terms, fee, revocability);
 *  stopping is one click (risk-reducing). */
export function GoLiveCard({
  user,
  onChanged,
}: {
  user: UserProfile["user"] | undefined;
  onChanged: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [stoppedFlash, setStoppedFlash] = useState(false);

  const approved = user?.agent_status === "approved";
  const hasStrategy = Boolean(user?.strategy);
  const eligible = approved && hasStrategy;
  const active = Boolean(user?.active);
  const killed = user?.runner_status === "killed";

  useEffect(() => {
    if (stoppedFlash) {
      const t = setTimeout(() => setStoppedFlash(false), 2500);
      return () => clearTimeout(t);
    }
  }, [stoppedFlash]);

  async function flip(next: boolean) {
    if (busy) return;
    setErr(null);
    setBusy(true);
    try {
      await activateRunner(next);
      onChanged();
      if (!next) {
        setStoppedFlash(true);
      }
      dialogRef.current?.close();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(
        msg === "unauthorized"
          ? "session expired — sign in again"
          : msg === "api 409"
            ? "not eligible yet — approve your agent key and pick a strategy first"
            : "could not update — try again",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-md border border-up/40 bg-up-soft text-up">
            <PowerIcon />
          </span>
          Go live
        </CardTitle>
        {active ? (
          <Badge tone="up">
            <span className="size-1.5 rounded-full bg-up animate-pulse" aria-hidden />
            live
          </Badge>
        ) : killed ? (
          <Badge tone="down">kill-switch</Badge>
        ) : eligible ? (
          <Badge tone="brand">ready</Badge>
        ) : (
          <Badge tone="warn">set-up needed</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Your grid rides the operator&rsquo;s market lineup with a trade-only agent —{" "}
          <span className="text-foreground">Shortfin never holds your funds</span>.
        </p>

        {killed && (
          <p className="rounded-lg border border-down/40 bg-down-soft/60 p-3 text-xs leading-relaxed text-down">
            Your runner hit its kill-switch (position drawdown beyond −2% or the $100
            exposure cap) and flattened everything. Re-arm below when you&rsquo;re ready.
          </p>
        )}

        {!eligible && (
          <ul className="space-y-1 text-xs text-muted-foreground">
            {!approved && <li>· approve your agent key on Hyperliquid (Connect card above)</li>}
            {!hasStrategy && <li>· choose a strategy (menu below)</li>}
          </ul>
        )}

        {active ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => flip(false)} disabled={busy}>
              {busy ? "Stopping…" : "Stop trading"}
            </Button>
            <span className="text-xs text-subtle-foreground">
              stops new entries within ~2 min · resting exits stay
            </span>
            {stoppedFlash && <span className="text-xs font-medium text-up">stopped</span>}
          </div>
        ) : (
          <Button disabled={!eligible || busy} onClick={() => dialogRef.current?.showModal()}>
            {killed ? "Re-arm & go live" : "Go live"}
          </Button>
        )}
        {err && <p className="text-xs text-down" role="alert">{err}</p>}

        <dialog
          ref={dialogRef}
          onCancel={() => dialogRef.current?.close()}
          className="fixed inset-0 m-auto w-[min(92vw,26rem)] rounded-xl border border-border bg-raised p-0 text-foreground backdrop:bg-black/60"
        >
          <div className="space-y-4 p-5 sm:p-6">
            <div>
              <h3 className="text-base font-semibold">Confirm go-live</h3>
              <p className="mt-1 text-xs text-subtle-foreground">
                You&rsquo;re authorizing the Shortfin agent to trade your Hyperliquid
                account with the strategy you selected.
              </p>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-2">
                <span aria-hidden className="mt-0.5 text-brand">•</span>
                <span><span className="font-medium">20% performance fee</span> on realized
                  gains, computed from your on-chain fills. No management fee.</span>
              </li>
              <li className="flex gap-2">
                <span aria-hidden className="mt-0.5 text-brand">•</span>
                <span><span className="font-medium">Trade-only agent key</span> — it can
                  place and cancel orders, never withdraw or transfer your funds.</span>
              </li>
              <li className="flex gap-2">
                <span aria-hidden className="mt-0.5 text-brand">•</span>
                <span><span className="font-medium">Revocable anytime</span> — stop here or
                  revoke the agent on Hyperliquid; resting exits keep unwinding safely.</span>
              </li>
              <li className="flex gap-2">
                <span aria-hidden className="mt-0.5 text-brand">•</span>
                <span>Founder tier: $10 rungs, $100 hard exposure cap, −2% kill-switch
                  flattens and stops the runner.</span>
              </li>
            </ul>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => dialogRef.current?.close()}>
                Cancel
              </Button>
              <Button onClick={() => flip(true)} disabled={busy}>
                {busy ? "Activating…" : "Confirm — go live"}
              </Button>
            </div>
          </div>
        </dialog>
      </CardContent>
    </Card>
  );
}
