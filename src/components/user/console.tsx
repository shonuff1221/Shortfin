"use client";

import Link from "next/link";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetcher, fmtAddress, type UserProfile } from "@/lib/api";
import { AgentCard } from "@/components/user/agent-card";
import { AccountCard } from "@/components/user/account-card";
import { GoLiveCard } from "@/components/user/go-live-card";
import { StrategyMenu } from "@/components/user/strategy-menu";
import { FundsGuide } from "@/components/user/funds-guide";
import { OnboardingFlow } from "@/components/user/onboarding-flow";

function ConsoleHeader({ address, role, tier }: { address: string; role: string; tier?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <h1 className="text-2xl font-semibold tracking-tight">Your console</h1>
      <code
        className="rounded-md border border-border bg-muted px-2 py-1 font-mono text-xs text-muted-foreground"
        title={address}
      >
        {fmtAddress(address)}
      </code>
      {tier ? <Badge tone="brand">{tier}</Badge> : null}
      {role === "admin" && (
        <Link href="/desk" className="text-xs font-medium text-info hover:underline">
          operator desk →
        </Link>
      )}
    </div>
  );
}

function HourglassIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="size-5">
      <path d="M5 22h14" />
      <path d="M5 2h14" />
      <path d="M17 22v-4.17a2 2 0 0 0-.59-1.42L12 12l-4.41 4.41A2 2 0 0 0 7 17.83V22" />
      <path d="M7 2v4.17a2 2 0 0 0 .59 1.42L12 12l4.41-4.41A2 2 0 0 0 17 6.17V2" />
    </svg>
  );
}

/** User console body — profile (session-scoped) feeds the agent + strategy
 *  cards; the account card polls the user's own Hyperliquid wallet.
 *  3d access gate: pending → request-received view; denied/banned → revoked. */
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
  const status = user?.status ?? (role === "admin" ? "approved" : "pending");

  if (user && status === "pending") {
    return (
      <div className="space-y-5">
        <ConsoleHeader address={address} role={role} tier={user.tier} />
        <Card className="border-warn/30">
          <CardContent className="flex flex-col items-start gap-3 p-6 pt-6 sm:flex-row sm:items-center">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-warn/40 bg-warn-soft text-warn">
              <HourglassIcon />
            </span>
            <div className="space-y-1">
              <p className="font-semibold">Access requested</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                You&apos;re signed in. The operator approves new accounts before they go live — this page
                unlocks once you&apos;re approved. Meanwhile, everything below tells you how funding and
                fees work, so you can be ready in minutes.
              </p>
            </div>
          </CardContent>
        </Card>
        <FundsGuide feeNote={data?.fee_note} />
      </div>
    );
  }

  if (user && (status === "denied" || status === "banned")) {
    return (
      <div className="space-y-5">
        <ConsoleHeader address={address} role={role} tier={user.tier} />
        <Card className="border-down/30">
          <CardContent className="flex flex-col items-start gap-3 p-6 pt-6 sm:flex-row sm:items-center">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-down/40 bg-down/10 text-down">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="size-5">
                <rect width="18" height="11" x="3" y="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <div className="space-y-1">
              <p className="font-semibold">{status === "banned" ? "Access revoked" : "Request declined"}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {status === "banned"
                  ? "Your access has been revoked. Any funds in your Hyperliquid account remain yours — withdraw them directly from app.hyperliquid.xyz."
                  : "Your access request was declined. You can still withdraw any funds directly from app.hyperliquid.xyz."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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

      <OnboardingFlow address={address} user={user} />

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

      <FundsGuide feeNote={data?.fee_note} />
    </div>
  );
}
