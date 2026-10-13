"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, useAccount, useConnect, useSignTypedData } from "wagmi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateAgentKey, markAgentApproved, type UserProfile } from "@/lib/api";
import { wagmiConfig } from "@/lib/wagmi";

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

const APPROVE_TYPES = {
  "HyperliquidTransaction:ApproveAgent": [
    { name: "hyperliquidChain", type: "string" },
    { name: "agentAddress", type: "address" },
    { name: "agentName", type: "string" },
    { name: "nonce", type: "uint64" },
  ],
  EIP712Domain: [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" },
  ],
} as const;

/** One-signature approveAgent: wallet signs the EIP-712 payload, browser posts the
 *  signed action straight to Hyperliquid (CORS-open), server marks the agent approved. */
function ApproveFlow({ agentAddress, onDone }: { agentAddress: string; onDone: () => void }) {
  const { connectors, connectAsync } = useConnect();
  const { address, connector: activeConnector } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function approve() {
    setErr(null);
    setBusy(true);
    try {
      const injectedConnector = connectors.find((c) => c.id === "injected");
      if (!injectedConnector) throw new Error("no injected wallet found — install MetaMask/Brave");
      let acct = address;
      if (!acct) acct = (await connectAsync({ connector: injectedConnector })).accounts[0];
      const conn = activeConnector ?? injectedConnector;
      // user-signed actions (approveAgent) use a TIMESTAMP nonce — SDK convention
      const nonceMs = Date.now();
      const message = {
        hyperliquidChain: "Mainnet",
        agentAddress: agentAddress as `0x${string}`,
        agentName: "Shortfin",
        nonce: BigInt(nonceMs),
      };
      const signature = await signTypedDataAsync({
        connector: conn,
        domain: {
          name: "HyperliquidSignTransaction",
          version: "1",
          chainId: BigInt(421614),
          verifyingContract: "0x0000000000000000000000000000000000000000",
        },
        types: APPROVE_TYPES,
        primaryType: "HyperliquidTransaction:ApproveAgent",
        message,
      });
      const res = await fetch("https://api.hyperliquid.xyz/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: { type: "approveAgent", ...message, nonce: nonceMs, signatureChainId: "0x66eee" },
          signature,
          nonce: nonceMs,
        }),
      });
      const body = await res.json();
      if (body?.status !== "ok") throw new Error(body?.response || body?.error || `HTTP ${res.status}`);
      await markAgentApproved();
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button size="lg" className="w-full sm:w-auto" onClick={approve} disabled={busy}>
        {busy ? "Confirm in wallet…" : "Approve on Hyperliquid"}
      </Button>
      {err && <p className="text-xs text-down" role="alert">{err}</p>}
    </div>
  );
}

/** Connect Hyperliquid — trade-only agent key provisioning.
 *  Server generates a secp256k1 keypair (AES-256-GCM at rest); the user approves
 *  the agent from their own wallet with one signature. Trade-only: no withdrawals. */
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
          <Badge
            tone={
              status === "approved" || status === "active"
                ? "up"
                : status === "pending_approval"
                  ? "warn"
                  : "neutral"
            }
          >
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
            {status === "pending_approval" ? (
              <>
                <p className="text-sm text-muted-foreground">
                  One signature activates the connection — your wallet approves this agent for trading on
                  Hyperliquid. Revocable anytime from the Hyperliquid app.
                </p>
                <WagmiProvider config={wagmiConfig}>
                  <ApproveFlow agentAddress={agentAddress ?? ""} onDone={onProvisioned} />
                </WagmiProvider>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                <span className="text-up font-medium">Connected.</span> Your agent is approved — trading
                activation ships with the next release.
              </p>
            )}
            <p className="text-xs text-subtle-foreground">
              Prefer manual? Hyperliquid app → API → <span className="text-foreground">Approve an API wallet</span>{" "}
              and paste the address above — same effect.
            </p>
            {err && <p className="text-xs text-down" role="alert">{err}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
