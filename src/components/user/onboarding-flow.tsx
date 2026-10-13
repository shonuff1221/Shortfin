"use client";

import { useState } from "react";
import useSWR from "swr";
import QRCode from "react-qr-code";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetcher, fmtUsd, type UserProfile, type UserAccountData } from "@/lib/api";

const POLL_MS = 30_000;
const FULL_LADDER_USD = 100;

function CompassIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="size-4">
      <circle cx="12" cy="12" r="10" />
      <path d="m16.2 7.8-2.5 6.9-6.9 2.5 2.5-6.9Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden className="size-3">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function StepDot({ n, done, current }: { n: number; done: boolean; current: boolean }) {
  return (
    <span
      aria-hidden
      className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border text-[11px] font-semibold ${
        done
          ? "border-up/50 bg-up-soft text-up"
          : current
            ? "border-brand/60 bg-brand-soft text-brand"
            : "border-border bg-muted text-subtle-foreground"
      }`}
    >
      {done ? <CheckIcon /> : n}
    </span>
  );
}

/** Guided onboarding — a live checklist that checks itself off as the user
 *  completes each step (key approval, strategy, funding — detected from their
 *  real Hyperliquid balance). The funding step embeds the deposit assistant:
 *  their address with copy + QR, and the two-hop how-to. Hides itself once
 *  the user has ever gone live. */
export function OnboardingFlow({
  address,
  user,
}: {
  address: string;
  user: UserProfile["user"] | undefined;
}) {
  const [copied, setCopied] = useState(false);
  const { data: account } = useSWR<UserAccountData>(
    "/api/user/account",
    fetcher,
    { refreshInterval: POLL_MS, keepPreviousData: true, errorRetryInterval: 10_000 },
  );

  // once live (or previously live), this card hands over to the console cards
  if (user && (user.active || user.runner_status)) return null;
  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-5 w-48" />
        </CardContent>
      </Card>
    );
  }

  const agentDone = user.agent_status === "approved";
  const strategyDone = Boolean(user.strategy);
  const equity = account?.equity ?? 0;
  const funded = equity >= FULL_LADDER_USD;

  const steps = [
    { title: "Wallet connected", done: true, hint: "You're signed in with this wallet — done." },
    {
      title: "Approve the trade-only key",
      done: agentDone,
      hint: "In the “Connect Hyperliquid” card below: generate your agent key, then approve it on Hyperliquid. It can place orders only — never withdraw.",
    },
    {
      title: "Pick a strategy",
      done: strategyDone,
      hint: "Choose a tier in the strategy menu below — conservative, standard, or max. You can change it while stopped.",
    },
    {
      title: "Fund your account",
      done: funded,
      hint: "",
    },
    {
      title: "Go live",
      done: false,
      hint: "Hit “Go live” in the card below once steps 2–4 are green. The runner starts within ~2 minutes.",
    },
  ];
  const currentIdx = steps.findIndex((s) => !s.done);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable (permissions) — user can still select the code */
    }
  }

  return (
    <Card className="border-brand/25">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-md border border-brand/40 bg-brand-soft text-brand">
            <CompassIcon />
          </span>
          Getting started
        </CardTitle>
        <Badge tone="brand">
          {steps.filter((s) => s.done).length}/{steps.length - 1}
        </Badge>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <StepDot n={i + 1} done={s.done} current={i === currentIdx} />
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className={`text-sm font-medium ${s.done ? "text-muted-foreground" : "text-foreground"}`}>
                  {s.title}
                  {s.title === "Fund your account" && (
                    <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                      {fmtUsd(equity)} / {fmtUsd(FULL_LADDER_USD, 0)}
                    </span>
                  )}
                </p>
                {s.hint && i === currentIdx && !s.done && (
                  <p className="text-xs leading-relaxed text-muted-foreground">{s.hint}</p>
                )}

                {/* deposit assistant — visible until funded, even out of turn */}
                {s.title === "Fund your account" && !funded && (
                  <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-3 sm:p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="grid shrink-0 place-items-center rounded-lg border border-border bg-white p-2">
                        <QRCode value={address} size={116} />
                      </div>
                      <div className="min-w-0 space-y-1.5">
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          This wallet address <strong className="text-foreground">is</strong> your
                          Hyperliquid account. Two hops:
                        </p>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          <strong className="text-foreground">1.</strong> Get USDC to this wallet (send
                          from an exchange or another wallet — scan the code or copy the address
                          below; Arbitrum is cheapest).
                        </p>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          <strong className="text-foreground">2.</strong> Open{" "}
                          <a
                            href="https://app.hyperliquid.xyz"
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-brand hover:underline"
                          >
                            app.hyperliquid.xyz
                          </a>{" "}
                          with this same wallet → <strong className="text-foreground">Deposit</strong>{" "}
                          → USDC. Already have HL funds? Transfer to this address instead.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-background px-2.5 py-1.5 font-mono text-xs" title={address}>
                        {address}
                      </code>
                      <button
                        type="button"
                        onClick={copyAddress}
                        className="shrink-0 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
                      >
                        {copied ? "Copied ✓" : "Copy"}
                      </button>
                    </div>
                    <p className="text-xs text-subtle-foreground">
                      {fmtUsd(equity)} detected · updates every ~30s · $100 funds the full founder
                      ladder ($10 rungs — partial funding trades fewer rungs)
                    </p>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
