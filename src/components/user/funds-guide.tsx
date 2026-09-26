import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="size-4">
      <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      <path d="M16 12h2" />
    </svg>
  );
}

/** Funds & fees instructions for the user console. Pure static content —
 *  shown to pending users (so they can prepare) and approved ones alike. */
export function FundsGuide({ feeNote }: { feeNote?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-md border border-brand/40 bg-brand-soft text-brand">
            <WalletIcon />
          </span>
          Funds &amp; fees — how it works
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        <div>
          <h3 className="mb-1 font-semibold text-foreground">Adding funds</h3>
          <p>
            Your capital lives in <strong>your own Hyperliquid account</strong> — Shortfin never holds it.
            Open{" "}
            <a
              href="https://app.hyperliquid.xyz"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-brand hover:underline"
            >
              app.hyperliquid.xyz
            </a>{" "}
            with this same wallet → <strong>Deposit</strong> → USDC ( Arbitrum). Deposits post in
            minutes. <strong>$100 covers the full founder-tier ladder</strong> (10 rungs × $10); larger
            balances are fine — the engine caps deployed exposure at $100 in founder tier.
          </p>
        </div>
        <div>
          <h3 className="mb-1 font-semibold text-foreground">Removing funds</h3>
          <p>
            No lock-ups, ever. Best practice: hit <strong>Stop</strong> on this page first (one click —
            it cancels new entries and lets resting exits unwind your inventory), then withdraw from{" "}
            <a
              href="https://app.hyperliquid.xyz"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-brand hover:underline"
            >
              app.hyperliquid.xyz
            </a>{" "}
            → <strong>Withdraw</strong> → USDC to your wallet. The trade-only agent key can move nothing
            on its own — and you can revoke it on Hyperliquid anytime.
          </p>
        </div>
        <div>
          <h3 className="mb-1 font-semibold text-foreground">Performance fee</h3>
          <p>
            {feeNote ??
              "20% performance fee on realized gains, computed from your on-chain fills. No management fee, no lock-ups."}{" "}
            The fee accrues per profitable round-trip in a transparent ledger on your account; founder-tier
            fees are settled on an agreed schedule. Nothing is ever taken from deposits or withdrawals —
            only from net realized profits.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
