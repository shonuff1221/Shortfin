"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateAgentKey, type UserProfile } from "@/lib/api";

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="size-3.5">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="size-4">
      <circle cx="8" cy="15" r="4" />
      <path d="m10.8 12.2 8.6-8.6M15 4l3 3M18 7l2-2" />
    </svg>
  );
}

/** Connect Hyperliquid — trade-only agent key provisioning.
 *  Generates a secp256k1 keypair server-side; the private key is AES-256-GCM
 *  encrypted before it touches disk and never leaves the vault. The user
 *  approves the agent address from their own wallet — approval activation
 *  ships with 3b-signing. */
export function AgentCard({
  user,
  vaultReady,
  onProvisioned,
}: {
  user: UserProfile["user"] | undefined;
  vaultReady: boolean;
  onProvisioned: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const status = user?.agent_status ?? "none";
  const agentAddress = user?.agent_address ?? null;

  async function generate() {
    setErr(null);
    setBusy(true);
    try {
      await generateAgentKey();
      onProvisioned();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(
        msg === "unauthorized"
          ? "session expired — sign in again"
          : msg === "api 409"
            ? "agent already provisioned"
            : msg === "api 503"
              ? "vault temporarily unavailable — try again shortly"
              : "could not generate the key — try again",
      );
      onProvisioned(); // revalidate anyway (409 path reveals the existing agent)
    } finally {
      setBusy(false);
    }
  }

  async function copyAddress() {
    if (!agentAddress) return;
    try {
      await navigator.clipboard.writeText(agentAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable (http/permissions) — address stays selectable */
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-md border border-brand/40 bg-brand-soft text-brand">
            <KeyIcon />
          </span>
          Connect Hyperliquid
        </CardTitle>
        {status !== "none" && (
          <Badge tone={status === "pending_approval" ? "warn" : status === "active" ? "up" : "neutral"}>
            {status === "pending_approval" ? "pending approval" : status}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {status === "none" ? (
          <>
            <p className="text-sm text-muted-foreground">
              Shortfin trades through a <span className="text-foreground">trade-only agent key</span> — it can
              place and cancel orders, nothing else. No withdrawals, no transfers. Your capital never leaves
              your wallet.
            </p>
            <Button size="lg" className="w-full sm:w-auto" onClick={generate} disabled={busy || !vaultReady}>
              {busy ? "Generating…" : "Generate agent key"}
            </Button>
            {!vaultReady && (
              <p className="text-xs text-warn">agent vault not configured — provisioning paused</p>
            )}
            {err && <p className="text-xs text-down" role="alert">{err}</p>}
          </>
        ) : (
          <>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-subtle-foreground">
                Agent address
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <code className="break-all rounded-md border border-border bg-muted px-2.5 py-1.5 font-mono text-xs text-foreground sm:text-sm">
                  {agentAddress ?? "—"}
                </code>
                <Button variant="outline" size="sm" onClick={copyAddress} aria-label="Copy agent address">
                  <CopyIcon />
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Approve it from your wallet: Hyperliquid app → API → <span className="text-foreground">Approve an
              API wallet</span>, paste the address above. The approval flow activates next (3b-signing).
            </p>
            {err && <p className="text-xs text-down" role="alert">{err}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
