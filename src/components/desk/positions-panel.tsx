"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtNum, fmtPnl, fmtUsd, pnlClass, type Positions } from "@/lib/api";

/** Venue-truth positions: table on md+, compact rows on mobile. */
export function PositionsPanel({ data }: { data?: Positions }) {
  const rows = data?.positions ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Positions</CardTitle>
        {data && (
          <span className="font-mono text-xs text-muted-foreground">
            {fmtUsd(data.usdc)} USDC free · {fmtUsd(data.allocated_margin)} allocated
          </span>
        )}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {data ? "Flat — no open positions." : "Loading…"}
          </p>
        ) : (
          <>
            {/* Mobile: stacked rows */}
            <ul className="divide-y divide-border md:hidden">
              {rows.map((p) => (
                <li key={`${p.dex}-${p.coin}`} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-mono text-sm font-medium">{p.coin}</div>
                    <div className="mt-0.5 text-xs text-subtle-foreground">
                      {fmtNum(Math.abs(p.szi), 3)} @ {p.entry_px ?? "—"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-mono text-sm ${pnlClass(p.u_pnl)}`}>{fmtPnl(p.u_pnl)}</div>
                    <div className="mt-0.5 text-xs text-subtle-foreground">{fmtUsd(p.position_value)}</div>
                  </div>
                </li>
              ))}
            </ul>
            {/* Desktop: table */}
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-subtle-foreground">
                    <th scope="col" className="py-2 pr-4 font-medium">Market</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Dex</th>
                    <th scope="col" className="py-2 pr-4 text-right font-medium">Size</th>
                    <th scope="col" className="py-2 pr-4 text-right font-medium">Entry</th>
                    <th scope="col" className="py-2 pr-4 text-right font-medium">Value</th>
                    <th scope="col" className="py-2 text-right font-medium">uP&L</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {rows.map((p) => (
                    <tr key={`${p.dex}-${p.coin}`} className="border-b border-border/50 last:border-0">
                      <td className="py-2.5 pr-4 font-medium">{p.coin}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{p.dex}</td>
                      <td className="py-2.5 pr-4 text-right">{fmtNum(p.szi, 3)}</td>
                      <td className="py-2.5 pr-4 text-right">{p.entry_px ?? "—"}</td>
                      <td className="py-2.5 pr-4 text-right">{fmtUsd(p.position_value)}</td>
                      <td className={`py-2.5 text-right ${pnlClass(p.u_pnl)}`}>{fmtPnl(p.u_pnl)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data && data.unrealized_pnl !== 0 && (
              <div className="mt-3 flex justify-end gap-2 text-xs">
                <Badge tone={data.unrealized_pnl > 0 ? "up" : "down"}>
                  total uP&L {fmtPnl(data.unrealized_pnl)}
                </Badge>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
