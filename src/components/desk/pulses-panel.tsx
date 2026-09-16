"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Pulse } from "@/lib/api";

/** Manager pulse feed — last journal entries, newest last (journal order). */
export function PulsesPanel({ entries }: { entries?: Pulse[] }) {
  const rows = [...(entries ?? [])].reverse(); // newest first for display

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manager pulses</CardTitle>
        <span className="text-xs text-subtle-foreground">journal</span>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : (
          <ol className="space-y-3">
            {rows.map((p, i) => (
              <li key={`${p.date}-${p.time}-${i}`} className="flex gap-3">
                <div className="shrink-0 text-right">
                  <div className="font-mono text-xs text-brand">{p.time}</div>
                  <div className="text-[10px] text-subtle-foreground">{p.date}</div>
                </div>
                <div className="min-w-0 border-l border-border pl-3">
                  <details className="group" open={i === 0}>
                    <summary className="cursor-pointer list-none text-xs leading-relaxed text-muted-foreground transition-colors hover:text-foreground">
                      <span className="line-clamp-2 group-open:line-clamp-none">{p.text}</span>
                    </summary>
                  </details>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
