"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { joinWaitlist } from "@/lib/api";

/**
 * Public waitlist form → POST /api/waitlist (no token). Mobile-first:
 * email + submit in one row on sm+, stacked on phones. Optional wallet
 * field stays collapsed behind a toggle until asked for.
 */
export function WaitlistForm({ source, showWallet = false }: { source: string; showWallet?: boolean }) {
  const [email, setEmail] = useState("");
  const [wallet, setWallet] = useState("");
  const [walletOpen, setWalletOpen] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "added" | "duplicate" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setState("sending");
    try {
      const res = await joinWaitlist({
        email,
        wallet: wallet.trim() || undefined,
        source,
      });
      setState(res.status === "duplicate" ? "duplicate" : "added");
    } catch (err) {
      setState("error");
      setError(
        err instanceof Error && err.message === "rate-limited"
          ? "Too many attempts — try again in a minute."
          : "Something went wrong on our side. Try again shortly.",
      );
    }
  }

  if (state === "added" || state === "duplicate") {
    return (
      <div
        role="status"
        className="flex w-full flex-col items-center gap-2 rounded-xl border border-up/40 bg-up-soft px-6 py-5 text-center sm:max-w-md"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--up)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20 6L9 17l-5-5" />
        </svg>
        <p className="text-sm font-medium text-up">
          {state === "duplicate" ? "You're already on the list — we'll be in touch." : "You're on the list. We'll reach out when your seat opens."}
        </p>
      </div>
    );
  }

  const walletVisible = showWallet || walletOpen;

  return (
    <form onSubmit={submit} className="w-full space-y-3 sm:max-w-md" noValidate>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={`wl-email-${source}`} className="sr-only">
          Email address
        </label>
        <Input
          id={`wl-email-${source}`}
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={state === "error"}
          className="h-11 flex-1"
        />
        <Button type="submit" size="lg" disabled={state === "sending" || !email.trim()} className="h-11">
          {state === "sending" ? "Joining…" : "Join the waitlist"}
        </Button>
      </div>

      {walletVisible ? (
        <label htmlFor={`wl-wallet-${source}`} className="block">
          <span className="text-xs text-muted-foreground">
            Wallet address (optional — for early agent-key onboarding)
          </span>
          <Input
            id={`wl-wallet-${source}`}
            type="text"
            autoComplete="off"
            placeholder="0x… or Solana address"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            className="mt-1 h-11"
          />
        </label>
      ) : (
        <button
          type="button"
          onClick={() => setWalletOpen(true)}
          className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          + Add a wallet address (optional)
        </button>
      )}

      {state === "error" && (
        <p role="alert" className="text-sm text-down">
          {error}
        </p>
      )}
    </form>
  );
}
