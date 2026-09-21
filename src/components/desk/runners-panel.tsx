"use client";

import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { CollapsibleCard } from "@/components/desk/collapsible-card";
import { fetchAdminRunners, fmtAgo, fmtAddress, type AdminRunnerRow, type RunnerInfo } from "@/lib/api";

const POLL_MS = 30_000;

function StatusBadge({ row, r }: { row: AdminRunnerRow; r: RunnerInfo | null }) {
  if (row.runner_status === "killed") return <Badge tone="down">killed</Badge>;
  if (r?.status === "running")
    return (
      <Badge tone="up">
        <span className="size-1.5 rounded-full bg-up animate-pulse" aria-hidden />
        running
      </Badge>
    );
  if (row.active) return <Badge tone="warn">pending</Badge>;
  return <Badge tone="neutral">stopped</Badge>;
}

/** Admin runners panel — every user that has ever provisioned an agent or
 *  gone live: eligibility flags + pidfile liveness + last runner state. */
export function RunnersPanel() {
  const { data, isLoading } = useSWR("/api/admin/runners", fetchAdminRunners, {
    keepPreviousData: true,
    refreshInterval: POLL_MS,
    errorRetryInterval: 10_000,
  });
  const rows = data?.runners ?? [];

  return (
    <CollapsibleCard id="runners" title="User runners" meta={rows.length ? <Badge tone="neutral">{rows.length}</Badge> : undefined}>
      <div className="space-y-2">
        {isLoading && !data ? (
          <p className="text-sm text-muted-foreground">Loading runners…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No user runners yet — rows appear when a user provisions an agent key or goes live.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row) => {
              const r = row.runner;
              const deployed = r?.deployed;
              return (
                <li key={row.address} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                  <StatusBadge row={row} r={r} />
                  <code className="font-mono text-xs" title={row.address}>
                    {fmtAddress(row.address)}
                  </code>
                  <Badge tone="neutral">{row.tier}</Badge>
                  {row.strategy ? (
                    <span className="text-xs text-muted-foreground">{row.strategy.replace("chop-", "")}</span>
                  ) : (
                    <span className="text-xs text-subtle-foreground">no strategy</span>
                  )}
                  {row.agent_status !== "approved" && (
                    <span className="text-xs text-subtle-foreground">agent: {row.agent_status ?? "none"}</span>
                  )}
                  {r?.market && (
                    <span className="font-mono text-xs">
                      {r.market}
                      <span className="text-subtle-foreground">
                        {deployed ? ` ${deployed.placed}/${deployed.depth}` : ""}
                      </span>
                    </span>
                  )}
                  {typeof r?.realized_bps === "number" && (
                    <span
                      className={`font-mono text-xs ${
                        r.realized_bps > 0 ? "text-up" : r.realized_bps < 0 ? "text-down" : "text-muted-foreground"
                      }`}
                    >
                      {r.realized_bps > 0 ? "+" : ""}
                      {r.realized_bps.toFixed(1)}bp
                    </span>
                  )}
                  <span className="ml-auto text-xs text-subtle-foreground" title={r?.updated ? undefined : "no runner state yet"}>
                    {r?.updated ? `state ${fmtAgo(r.updated)}` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </CollapsibleCard>
  );
}
