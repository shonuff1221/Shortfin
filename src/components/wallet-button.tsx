"use client";

import { useEffect, useState } from "react";
import { WagmiProvider, useAccount, useConnect, useSignMessage, type Connector } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { wagmiConfig } from "@/lib/wagmi";
import { AUTH_URL } from "@/lib/api";

type Me = { address: string; role: "admin" | "user" } | null;

async function api(path: string, init?: RequestInit) {
  const res = await fetch(`${AUTH_URL}${path}`, { credentials: "include", ...init });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
  return body;
}

const queryClient = new QueryClient();

function short(a: string): string {
  return a.slice(0, 6) + "…" + a.slice(-4);
}

function ConnectFlow() {
  const { connectors, connectAsync, isPending: connecting } = useConnect();
  const { address, connector: activeConnector } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [me, setMe] = useState<Me>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api("/api/auth/me").then((m) => setMe(m)).catch(() => setMe(null));
  }, []);

  async function signIn() {
    setErr(null);
    setBusy(true);
    try {
      const injectedConnector = connectors.find((c) => c.id === "injected");
      const wcConnector = connectors.find((c) => c.id === "walletConnect");
      let acct = address;
      let conn: Connector | undefined = activeConnector ?? undefined;
      if (!acct) {
        // Browser wallet first; fall back to WalletConnect (mobile browsers, QR).
        let res: Awaited<ReturnType<typeof connectAsync>> | null = null;
        if (injectedConnector) {
          try {
            res = await connectAsync({ connector: injectedConnector });
            conn = injectedConnector;
          } catch {
            // no injected provider (mobile browser) — try WalletConnect below
          }
        }
        if (!res && wcConnector) {
          res = await connectAsync({ connector: wcConnector });
          conn = wcConnector;
        }
        if (!res) throw new Error("no wallet available — install MetaMask or scan the QR");
        const first = res.accounts[0];
        acct = typeof first === "string" ? first : first?.address;
      }
      if (!acct) throw new Error("wallet returned no account");
      if (!conn) throw new Error("no wallet connector available");
      const lower = acct.toLowerCase();
      const { nonce } = (await api("/api/auth/nonce")) as { nonce: string };
      const message = `Shortfin sign-in\nnonce: ${nonce}\naddress: ${lower}`;
      const signature = await signMessageAsync({ connector: conn, message });
      const verified = await api("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: lower, message, signature, nonce }),
      });
      window.location.assign(verified.role === "admin" ? `${AUTH_URL}/desk` : `${AUTH_URL}/u`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  async function signOut() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.assign(`${AUTH_URL}/`);
  }

  if (me) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground" title={me.address}>
          {short(me.address)} · {me.role}
        </span>
        <Button variant="outline" size="sm" onClick={signOut}>
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" onClick={signIn} disabled={busy || connecting}>
        {busy || connecting ? "Confirm in wallet…" : "Connect Wallet"}
      </Button>
      {err && (
        <span className="max-w-64 truncate text-right text-xs text-red-400" title={err}>
          {err}
        </span>
      )}
    </div>
  );
}

export default function WalletButton() {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <ConnectFlow />
      </WagmiProvider>
    </QueryClientProvider>
  );
}
