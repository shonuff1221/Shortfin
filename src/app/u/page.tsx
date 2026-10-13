import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { FinMark } from "@/components/brand-mark";
import WalletButton from "@/components/wallet-button";
import { UserConsole } from "@/components/user/console";
import { decodeSession, SESSION_COOKIE } from "@/lib/session";

/** User console — real account surface (3b-foundation): agent-key
 *  onboarding, live wallet overview, strategy menu, fee note.
 *  Wallet session required (any role). */
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
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <UserConsole address={session.address} role={session.role} />
      </main>
    </div>
  );
}
