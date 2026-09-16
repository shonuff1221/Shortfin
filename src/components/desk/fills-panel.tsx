"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtPnl, fmtTime, fmtUsd, pnlClass, type Fill } from "@/lib/api";

function sideTone(fill: Fill) {
  const dir = fill.dir.toLowerCase();
  if (dir.includes("close long")) return "text-down";
  if (dir.includes("close short")) return "text-up";
  if (dir.includes("long")) return "text-up";
  if (dir.includes("short")) return "text-down";
  return "text-muted-foreground";
}

/** Recent fills (venue truth, newest first). */
export function FillsPanel({ fills }: { fills?: Fill[] }) {
  const rows = (fills ?? []).slice(0, 12);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent fills</CardTitle>
        <span className="text-xs text-subtle-foreground">venue truth</span>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {fills ? "No recent fills." : "Loading…"}
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {rows.map((f) => (
              <li
                key={`${f.time}-${f.coin}-${f.px}-${f.sz}`}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="truncate font-mono text-sm font-medium">{f.coin}</div>
                  <div className={`mt-0.5 text-xs ${sideTone(f)}`}>{f.dir}</div>
                </div>
                <div className="text-right font-mono text-xs">
                  <div>
                    {fmtUsd(parseFloat(f.px) || 0, 3)} × {f.sz}
                  </div>
                  <div className="mt-0.5 flex items-center justify-end gap-2 text-subtle-foreground">
                    <span>{fmtTime(f.time)}</span>
                    {f.closedPnl && parseFloat(f.closedPnl) !== 0 && (
                      <span className={pnlClass(parseFloat(f.closedPnl))}>
                        {fmtPnl(parseFloat(f.closedPnl))}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
