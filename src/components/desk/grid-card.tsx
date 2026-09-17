"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtAgo, fmtNum, pnlClass, type GridCard as GridCardData } from "@/lib/api";
import { fleetStatus } from "@/components/desk/fleet-strip";

function DirectionBadge({ dir }: { dir: string }) {
  const tone = dir === "long" ? "up" : dir === "short" ? "down" : "neutral";
  const arrow =
    dir === "long" ? "▲" : dir === "short" ? "▼" : "•";
  return (
    <Badge tone={tone}>
      <span aria-hidden>{arrow}</span> {dir}
    </Badge>
  );
}

/** Fleet status chip: CAP-HOLDING (amber) > DEPLOYED x/y (cyan) > WARMING UP. */
function StatusChip({
  placed,
  depth,
  capBackoff,
  lastActivity,
}: {
  placed: number;
  depth: number;
  capBackoff: boolean;
  lastActivity: number | null;
}) {
  const status = fleetStatus(placed, capBackoff, lastActivity);
  if (status === "cap") {
    return (
      <Badge tone="warn" title="buys paused by request-cap backoff">
        CAP-HOLDING
      </Badge>
    );
  }
  if (status === "deployed") {
    return (
      <Badge tone="info" title={`${placed} of ${depth} buy rungs resting on venue`}>
        DEPLOYED {placed}/{depth}
      </Badge>
    );
  }
  if (status === "warming") {
    return (
      <Badge tone="neutral" title="no buys placed yet — grid still warming up">
        WARMING UP
      </Badge>
    );
  }
  return (
    <Badge tone="neutral" title="ladder cycled flat — no resting buys">
      DEPLOYED 0/{depth}
    </Badge>
  );
}

/** Ladder strip: one cell per rung. States: held (deep fill) > placed >
 *  selling (exit resting) > empty. Held estimated from position size vs rung unit. */
function Ladder({ card }: { card: GridCardData }) {
  const depth = card.ladder_depth || 10;
  const placed = card.placed_buy_rungs; // rungs with a fill or resting order
  const selling = card.resting_sells.length; // live exit orders on venue
  const heldCells = Math.max(0, placed - selling);

  const cells = Array.from({ length: depth }, (_, i) => {
    const k = i + 1;
    if (k <= heldCells) return "held";
    if (k <= placed) return "selling";
    return "empty";
  });

  return (
    <div>
      <div className="flex items-end gap-1" role="img" aria-label={`Ladder: ${heldCells} held, ${placed - heldCells} selling, ${depth - placed} empty rungs`}>
        {cells.map((state, i) => (
          <div
            key={i}
            className={`anim-in h-9 flex-1 rounded-sm transition-colors duration-500 hover:opacity-80 ${
              state === "held"
                ? "bg-up/70"
                : state === "selling"
                  ? "bg-warn/50"
                  : "bg-muted"
            }`}
            style={{ ["--d" as string]: `${i * 35}ms` }}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-subtle-foreground">
        <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-up/70" aria-hidden />held {heldCells}</span>
        <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-warn/50" aria-hidden />selling {placed - heldCells}</span>
        <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-muted" aria-hidden />empty {depth - placed}</span>
        {card.resting_buys.length > 0 && (
          <span>resting buys {card.resting_buys.length}</span>
        )}
      </div>
    </div>
  );
}

export function GridCard({ card, positionSzi }: { card: GridCardData; positionSzi?: number }) {
  const s = card.state ?? {};
  const realized = s.realized_bps ?? null;
  const rts = s.fills_sell ?? 0;
  const placed = card.deployed?.placed ?? card.placed_buy_rungs;
  const depth = card.deployed?.depth ?? card.ladder_depth;
  const capBackoff = card.cap_backoff ?? false;
  const lastActivity = card.last_activity ?? null;
  const posData = card.position ?? null;
  const pos = posData?.szi ?? positionSzi ?? null; // card venue read wins; legacy prop is fallback

  return (
    <Card className="card-hover">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="font-mono text-base">{card.market}</CardTitle>
          <DirectionBadge dir={card.direction.dir} />
          <StatusChip
            placed={placed}
            depth={depth}
            capBackoff={capBackoff}
            lastActivity={lastActivity}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          <span className={pnlClass(realized == null ? null : realized / 100)}>
            {realized == null ? "—" : `${realized > 0 ? "+" : ""}${realized.toFixed(1)} bp`}
          </span>
          <span className="text-subtle-foreground">
            {rts} RT{rts === 1 ? "" : "s"}
          </span>
          {lastActivity != null && (
            <span className="text-subtle-foreground" title={new Date(lastActivity * 1000).toISOString()}>
              last fill {fmtAgo(lastActivity)}
            </span>
          )}
          {card.spacing_override != null && (
            <Badge tone="warn" className="font-mono" title="operator spacing override (desk)">
              {card.spacing_override}bp
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Ladder card={card} />
        <div className="grid grid-cols-3 gap-2 border-t border-border pt-3 font-mono text-xs">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-subtle-foreground">Buys</div>
            <div className="mt-0.5">{s.fills_buy ?? "—"}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-subtle-foreground">Position</div>
            <div
              className="mt-0.5"
              title={
                posData?.stale
                  ? `stale — venue read failed, showing last-good position (${Math.round(posData.stale_age_s ?? 0)}s old)`
                  : undefined
              }
            >
              {pos == null ? (
                <span className="text-subtle-foreground">flat (venue read pending)</span>
              ) : pos === 0 ? (
                <span className="text-muted-foreground">flat</span>
              ) : (
                <span className={posData?.stale ? "text-muted-foreground" : undefined}>
                  {fmtNum(pos, 3)}
                  {posData?.stale ? " ·stale" : ""}
                </span>
              )}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-subtle-foreground">Worst pot</div>
            <div className={`mt-0.5 ${pnlClass(s.worst_pot_bps ?? null)}`}>
              {s.worst_pot_bps == null ? "—" : `${s.worst_pot_bps.toFixed(0)} bp`}
            </div>
          </div>
        </div>
        {card.direction.reason && (
          <p className="border-t border-border pt-2 text-xs leading-relaxed text-muted-foreground" title={card.direction.reason}>
            {card.direction.reason}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
