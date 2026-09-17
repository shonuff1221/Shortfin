"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { fmtAgo, type GridCard as GridCardData, type Grids, type RotationEvent } from "@/lib/api";

/** Shared fleet status model (strip chips + card chips agree by construction). */
export type FleetStatus = "cap" | "deployed" | "warming" | "idle";

export function fleetStatus(
  placed: number,
  capBackoff: boolean,
  lastActivity: number | null,
): FleetStatus {
  if (capBackoff) return "cap"; // buys paused by request-cap backoff — actionable
  if (placed > 0) return "deployed";
  if (lastActivity == null) return "warming"; // no buys yet, no fills ever — fresh
  return "idle"; // ladder cycled flat; venue still healthy
}

const STATUS_META: Record<FleetStatus, { dot: string; label: string; title: string }> = {
  cap: {
    dot: "bg-warn",
    label: "cap-holding",
    title: "buys paused by request-cap backoff",
  },
  deployed: { dot: "bg-info", label: "deployed", title: "buy rungs resting on venue" },
  warming: { dot: "bg-subtle-foreground", label: "warming up", title: "no buys placed yet" },
  idle: { dot: "bg-subtle-foreground", label: "flat", title: "ladder cycled flat — no resting buys" },
};

/** One ticker chip: market + deployed x/y + status color dot. */
function FleetChip({ card }: { card: GridCardData }) {
  const placed = card.deployed?.placed ?? card.placed_buy_rungs;
  const depth = card.deployed?.depth ?? card.ladder_depth;
  const status = fleetStatus(placed, card.cap_backoff ?? false, card.last_activity ?? null);
  const meta = STATUS_META[status];
  const ring =
    status === "cap"
      ? "border-warn/40 bg-warn-soft"
      : status === "deployed"
        ? "border-info/40 bg-info-soft"
        : "border-border bg-muted";
  return (
    <div
      role="listitem"
      className={`flex shrink-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 ${ring}`}
      title={`${card.market} — ${meta.title}`}
    >
      <span
        className={`size-1.5 shrink-0 rounded-full ${meta.dot} ${status === "cap" ? "animate-pulse" : ""}`}
        aria-hidden
      />
      <span className="font-mono text-xs font-medium">{card.market}</span>
      <span className="font-mono text-[11px] text-muted-foreground" aria-label={`deployed ${placed} of ${depth}`}>
        {placed}/{depth}
      </span>
      {status === "cap" && <span className="sr-only">cap-holding</span>}
    </div>
  );
}

/** Compact rotation history rows (last N registry set events). */
function RotationHistory({ events }: { events: RotationEvent[] }) {
  if (events.length === 0) {
    return <p className="text-xs text-subtle-foreground">No rotations recorded yet.</p>;
  }
  return (
    <ul className="space-y-1" aria-label="Recent lineup rotations">
      {events.map((e, i) => (
        <li key={`${e.ts}-${i}`} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
          <span className="w-16 shrink-0 text-subtle-foreground" title={new Date(e.ts * 1000).toISOString()}>
            {fmtAgo(e.ts)}
          </span>
          <span className="font-mono text-muted-foreground">{e.markets.join(" · ")}</span>
          <span className="text-subtle-foreground">{e.reason}</span>
        </li>
      ))}
    </ul>
  );
}

/** Fleet strip: current lineup as ticker chips + lineup meta + rotation history. */
export function FleetStrip({
  grids,
  rotations,
}: {
  grids: Grids | undefined;
  rotations: RotationEvent[] | undefined;
}) {
  const cards = grids?.markets ?? [];
  const updated = grids?.lineup_updated ?? grids?.lineup?.updated ?? null;
  const reason = grids?.lineup_reason ?? grids?.lineup?.reason ?? null;
  const capHolding = cards.some((c) => c.cap_backoff);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-subtle-foreground">
            Fleet
          </span>
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto" role="list" aria-label="Lineup markets">
            {cards.length === 0 && (
              <span className="text-xs text-muted-foreground">Loading lineup…</span>
            )}
            {cards.map((c) => (
              <FleetChip key={c.market} card={c} />
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {updated != null ? (
            <span>
              Lineup set <strong className="font-medium text-foreground">{fmtAgo(updated)}</strong>
              {reason ? <span className="text-subtle-foreground"> · {reason}</span> : null}
            </span>
          ) : (
            <span>Lineup age unknown</span>
          )}
          {capHolding && (
            <Badge tone="warn" title="one or more grids are holding buys by request-cap backoff">
              cap backoff active
            </Badge>
          )}
        </div>
        {rotations !== undefined && <RotationHistory events={rotations.slice(-3).reverse()} />}
      </CardContent>
    </Card>
  );
}
