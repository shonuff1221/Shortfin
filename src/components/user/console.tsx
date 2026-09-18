"use client";

import Link from "next/link";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetcher, fmtAddress, type UserProfile } from "@/lib/api";
import { AgentCard } from "@/components/user/agent-card";
import { AccountCard } from "@/components/user/account-card";
import { GoLiveCard } from "@/components/user/go-live-card";
import { StrategyMenu } from "@/components/user/strategy-menu";

function FeeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="size-4">
      <path d="M19 5 5 19" />
      <circle cx="7.5" cy="7.5" r="2.5" />
      <circle cx="16.5" cy="16.5" r="2.5" />
    </svg>
  );
}

/** User console body — profile (session-scoped) feeds the agent + strategy
 *  cards; the account card polls the user's own Hyperliquid wallet. */
export function UserConsole({ address, role }: { address: string; role: string }) {
  const { data, error, isLoading, mutate } = useSWR<UserProfile>(
    "/api/user/profile",
    fetcher,
    { revalidateOnFocus: false, errorRetryInterval: 10_000 },
  );

  if (error && !data) {
    return (
      <Card className="mx-auto max-w-md">
        <CardContent className="space-y-2 p-6 pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            {error.message === "unauthorized"
              ? "Your session expired."
              : "The account store is unreachable right now."}
          </p>
          <Link href="/" className="text-sm font-medium text-brand hover:underline">
            Sign in again
          </Link>
        </CardContent>
      </Card>
    );
  }

  const user = data?.user;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <h1 className="text-2xl font-semibold tracking-tight">Your console</h1>
        <code
          className="rounded-md border border-border bg-muted px-2 py-1 font-mono text-xs text-muted-foreground"
          title={address}
        >
          {fmtAddress(address)}
        </code>
        {isLoading && !data ? (
          <Skeleton className="h-6 w-16" />
        ) : (
          <Badge tone="brand">{user?.tier ?? "founder"}</Badge>
        )}
        {role === "admin" && (
          <Link href="/desk" className="text-xs font-medium text-info hover:underline">
            operator desk →
          </Link>
        )}
      </div>

      <AgentCard
        user={user}
        vaultReady={data?.vault_ready ?? true}
        onProvisioned={() => mutate()}
      />

      <GoLiveCard user={user} onChanged={() => mutate()} />

      <AccountCard />

      <StrategyMenu
        strategies={data?.strategies}
        current={user?.strategy}
        onSaved={() => mutate()}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-md border border-warn/40 bg-warn-soft text-warn">
              <FeeIcon />
            </span>
            Performance fee
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {data?.fee_note ??
              "A performance fee applies to realized gains, computed from your on-chain fills."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
