import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { FinMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import WalletButton from "@/components/wallet-button";
import { decodeSession, SESSION_COOKIE } from "@/lib/session";

/** User console stub — real console ships in 3b (agent-key onboarding,
 *  strategy menu, personal P&L). Wallet session required. */
export default async function UserPage() {
  const jar = await cookies();
  const session = decodeSession(jar.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/");
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur">
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6" aria-label="Main">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-md border border-brand/40 bg-brand-soft text-brand">
              <FinMark size={16} />
            </span>
            <span className="font-semibold tracking-tight">{BRAND.name}</span>
          </Link>
          <WalletButton />
        </nav>
      </header>
      <main className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-24 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome aboard, <span className="font-mono text-brand">{session.address.slice(0, 6)}…{session.address.slice(-4)}</span>
        </h1>
        <p className="max-w-xl text-muted-foreground">
          Your trading console is coming in the next release: connect a Hyperliquid agent key,
          pick a strategy, and watch your positions trade themselves — non-custodial, revocable anytime.
        </p>
        <div className="rounded-xl border border-dashed border-border-strong p-6 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Next up (3b):</span> one-signature agent onboarding,
          strategy menu, live P&amp;L.
        </div>
        <Link href="/">
          <Button variant="outline">Back to home</Button>
        </Link>
      </main>
    </div>
  );
}
