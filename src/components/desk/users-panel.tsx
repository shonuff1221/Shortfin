"use client";

import { useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CollapsibleCard } from "@/components/desk/collapsible-card";
import {
  deactivateUser,
  fetchAdminUsers,
  fmtAgo,
  fmtAddress,
  setUserStatus,
  type AdminUserRow,
  type UserStatus,
} from "@/lib/api";

const POLL_MS = 30_000;

function AccessBadge({ status }: { status: UserStatus }) {
  switch (status) {
    case "approved":
      return <Badge tone="up">approved</Badge>;
    case "pending":
      return <Badge tone="warn">pending</Badge>;
    case "denied":
      return <Badge tone="down">denied</Badge>;
    case "banned":
      return <Badge tone="down">banned</Badge>;
  }
}

function UserRow({ row, onChanged }: { row: AdminUserRow; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function act(status: UserStatus) {
    setErr(null);
    setNote(null);
    setBusy(true);
    try {
      await setUserStatus(row.address, status);
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function stopRunner() {
    setErr(null);
    setNote(null);
    setBusy(true);
    try {
      await deactivateUser(row.address);
      setNote("Runner stop requested — supervisor stops it within ~2 min. Wait for flat, then retry the ban.");
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const r = row.runner;
  const trading = row.trading?.blocked;

  return (
    <li className="space-y-1.5 py-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <AccessBadge status={row.status} />
        <code className="font-mono text-xs" title={row.address}>
          {fmtAddress(row.address)}
        </code>
        {row.strategy ? (
          <span className="text-xs text-muted-foreground">{row.strategy.replace("chop-", "")}</span>
        ) : (
          <span className="text-xs text-subtle-foreground">no strategy</span>
        )}
        {row.agent_status && row.agent_status !== "none" && (
          <span className="text-xs text-subtle-foreground">agent: {row.agent_status}</span>
        )}
        {r?.status === "running" && (
          <span className="font-mono text-xs text-up">
            ▲ {r.market ?? ""} {r.deployed ? `${r.deployed.placed}/${r.deployed.depth}` : ""}
          </span>
        )}
        {trading && (
          <span className="text-xs text-warn" title={row.trading.reasons.join("; ")}>
            ⚠ trading — {row.trading.reasons[0]}
          </span>
        )}
        <span className="ml-auto text-xs text-subtle-foreground">
          {row.status === "pending" ? `requested ${fmtAgo(Date.parse(row.updated_at) / 1000)}` : ""}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {row.status === "pending" && (
          <>
            <Button size="sm" disabled={busy} onClick={() => act("approved")}>
              Approve
            </Button>
            <Button size="sm" variant="outline" disabled={busy || trading} onClick={() => act("denied")}>
              Deny
            </Button>
          </>
        )}
        {row.status === "approved" && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => act("banned")}>
            Ban
          </Button>
        )}
        {(row.status === "denied" || row.status === "banned") && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => act("approved")}>
            Re-approve
          </Button>
        )}
        {trading && row.active && (
          <Button size="sm" variant="outline" disabled={busy} onClick={stopRunner}>
            Stop runner
          </Button>
        )}
      </div>
      {note && <p className="text-xs text-info">{note}</p>}
      {err && (
        <p className="max-w-full text-xs text-red-400" title={err}>
          {err}
        </p>
      )}
    </li>
  );
}

/** Admin users panel — every account: access status, approve/deny/ban with the
 *  can't-ban-while-trading guard (stop the runner first, wait for flat). */
export function UsersPanel() {
  const { data, isLoading, mutate } = useSWR("/api/admin/users", fetchAdminUsers, {
    keepPreviousData: true,
    refreshInterval: POLL_MS,
    errorRetryInterval: 10_000,
  });
  const rows = data?.users ?? [];
  const pending = rows.filter((r) => r.status === "pending").length;

  return (
    <CollapsibleCard
      id="users"
      title="User access"
      meta={
        pending > 0 ? (
          <Badge tone="warn">
            {pending} pending
          </Badge>
        ) : rows.length ? (
          <Badge tone="neutral">{rows.length}</Badge>
        ) : undefined
      }
    >
      <div className="space-y-2">
        {isLoading && !data ? (
          <p className="text-sm text-muted-foreground">Loading accounts…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No accounts yet — rows appear when a wallet signs in and requests access.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <UserRow key={row.address} row={row} onChanged={() => mutate()} />
            ))}
          </ul>
        )}
        <p className="pt-1 text-xs text-subtle-foreground">
          Ban is blocked while a user has money trading (runner on, open positions, resting orders) — stop
          the runner, wait for flat, then ban. Denied/banned wallets keep their funds; the engine simply
          never trades for them again.
        </p>
      </div>
    </CollapsibleCard>
  );
}
