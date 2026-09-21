import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FinMark } from "@/components/brand-mark";
import { WaitlistForm } from "@/components/waitlist-form";
import WalletButton from "@/components/wallet-button";

/* ── Inline SVG icon set (stroke style, no emoji) ───────────────────── */

const iconProps = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const WalletIcon = () => (
  <svg {...iconProps}>
    <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2H5" />
    <path d="M17 13h.01" />
  </svg>
);
const EngineIcon = () => (
  <svg {...iconProps}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
    <path d="M9 2v2M15 2v2M9 18v2M15 18v2M2 9h2M2 15h2M18 9h2M18 15h2" />
    <path d="M9.5 9.5h5v5h-5z" />
  </svg>
);
const ChartIcon = () => (
  <svg {...iconProps}>
    <path d="M3 3v16a2 2 0 0 0 2 2h16" />
    <path d="M7 15l4-6 3 3 5-7" />
  </svg>
);
const ShieldIcon = () => (
  <svg {...iconProps}>
    <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);
const KeyIcon = () => (
  <svg {...iconProps}>
    <circle cx="7.5" cy="15.5" r="4.5" />
    <path d="M11 12L21 2M17 6l3 3M14 9l2 2" />
  </svg>
);
const EyeIcon = () => (
  <svg {...iconProps}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

/* ── Illustrative desk mock (public page — no real account data) ────── */

const mockRungs = [
  { k: 1, state: "held" },
  { k: 2, state: "held" },
  { k: 3, state: "placed" },
  { k: 4, state: "placed" },
  { k: 5, state: "selling" },
  { k: 6, state: "empty" },
  { k: 7, state: "empty" },
  { k: 8, state: "empty" },
  { k: 9, state: "empty" },
  { k: 10, state: "empty" },
] as const;

function DeskMock() {
  return (
    <div className="relative mx-auto w-full max-w-3xl rounded-2xl border border-border bg-card/90 p-4 shadow-2xl shadow-black/60 backdrop-blur sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-up animate-pulse" aria-hidden />
          <span className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Live desk — illustrative
          </span>
        </div>
        <Badge tone="up">grid · long</Badge>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: "Equity", value: "$128,402", tone: "" },
          { label: "Realized 24h", value: "+$1,284", tone: "text-up" },
          { label: "Round trips", value: "212", tone: "" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-lg border border-border bg-muted/60 p-3">
            <div className="text-[10px] uppercase tracking-wider text-subtle-foreground sm:text-xs">{kpi.label}</div>
            <div className={`mt-1 font-mono text-sm font-semibold sm:text-lg ${kpi.tone}`}>{kpi.value}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-subtle-foreground sm:text-xs">
          <span>Ladder · 10 rungs</span>
          <span className="font-mono">1,556.2 anchor</span>
        </div>
        <div className="mt-2 flex items-end gap-1" aria-hidden>
          {mockRungs.map((r) => (
            <div
              key={r.k}
              className={`h-8 flex-1 rounded-sm sm:h-10 ${
                r.state === "held"
                  ? "bg-up/70"
                  : r.state === "placed"
                    ? "bg-up/25"
                    : r.state === "selling"
                      ? "bg-warn/60"
                      : "bg-muted"
              }`}
            />
          ))}
        </div>
        <div className="mt-2 flex gap-3 text-[10px] text-subtle-foreground sm:text-xs">
          <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-up/70" />held</span>
          <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-up/25" />placed</span>
          <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-warn/60" />selling</span>
        </div>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────── */

const steps = [
  {
    icon: <WalletIcon />,
    title: "Connect your wallet",
    body: "Approve a trade-only agent key on Hyperliquid. Your capital never leaves your account — we can trade, never withdraw.",
  },
  {
    icon: <EngineIcon />,
    title: "We run the strats",
    body: "Grid engines place, manage, and recycle limit orders across the best oscillating perp markets — 24/7, with kill-switch risk guards.",
  },
  {
    icon: <ChartIcon />,
    title: "You watch the P&L",
    body: "A live desk shows every position, rung, fill, and verdict call in real time. Full transparency, zero screen time.",
  },
];

const trust = [
  {
    icon: <KeyIcon />,
    title: "Trade-only agent keys",
    body: "Hyperliquid API wallets scope our access to exchange operations. No transfers, no withdrawals — cryptographically.",
  },
  {
    icon: <ShieldIcon />,
    title: "Non-custodial by design",
    body: "We never hold your funds. Assets sit in your account on-venue, visible to you at all times.",
  },
  {
    icon: <EyeIcon />,
    title: "Revoke anytime",
    body: "One transaction revokes the agent key. Cut our access instantly, keep your positions and capital.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur">
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6" aria-label="Main">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-md border border-brand/40 bg-brand-soft text-brand">
              <FinMark size={16} />
            </span>
            <span className="font-semibold tracking-tight">{BRAND.name}</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/desk" className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:block">
              Live desk
            </Link>
            <WalletButton />
            <a
              href="#waitlist"
              className="inline-flex h-8 cursor-pointer items-center rounded-md border border-border-strong px-3 text-xs font-medium transition-colors duration-200 hover:border-brand/50 hover:bg-raised"
            >
              Request access
            </a>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="hero-grid pointer-events-none absolute inset-0" aria-hidden />
          <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pb-24 sm:pt-24">
            <Badge tone="brand" className="mb-6">
              <span className="size-1.5 rounded-full bg-brand" aria-hidden />
              Live on Hyperliquid perps
            </Badge>
            <h1 className="mx-auto max-w-3xl text-balance text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
              {BRAND.heroHeadline.split(".")[0]}.
              <span className="glow-brand bg-gradient-to-b from-brand to-brand/60 bg-clip-text text-transparent">
                {" "}
                {BRAND.heroHeadline.split(".").slice(1).join(".").trim()}
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              {BRAND.heroSub}
            </p>
            <div className="mt-8 flex flex-col items-center">
              <WaitlistForm source="landing-hero" />
              <Link
                href="/desk"
                className="mt-4 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                or see the live desk →
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-2 text-xs text-subtle-foreground">
              <Badge tone="neutral">Non-custodial</Badge>
              <Badge tone="neutral">Trade-only keys</Badge>
              <Badge tone="neutral">Revocable anytime</Badge>
              <Badge tone="neutral">24/7 market-making</Badge>
            </div>
            <div className="mt-14 sm:mt-20">
              <DeskMock />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="border-t border-border/70 bg-card/30 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-center text-2xl font-bold tracking-tight sm:text-4xl">
              How it works
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
              Three steps from wallet to working capital.
            </p>
            <ol className="mt-12 grid gap-6 md:grid-cols-3">
              {steps.map((s, i) => (
                <li key={s.title} className="relative rounded-xl border border-border bg-card p-6">
                  <div className="flex items-center justify-between">
                    <span className="grid size-11 place-items-center rounded-lg border border-brand/30 bg-brand-soft text-brand">
                      {s.icon}
                    </span>
                    <span className="font-mono text-xs text-subtle-foreground">0{i + 1}</span>
                  </div>
                  <h3 className="mt-4 font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Non-custodial / trust */}
        <section id="security" className="py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-center text-2xl font-bold tracking-tight sm:text-4xl">
              Your keys. Our engine.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
              The custody model most funds won&apos;t offer you.
            </p>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {trust.map((t) => (
                <div key={t.title} className="rounded-xl border border-border bg-card p-6">
                  <span className="grid size-11 place-items-center rounded-lg border border-info/30 bg-info-soft text-info">
                    {t.icon}
                  </span>
                  <h3 className="mt-4 font-semibold">{t.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing teaser */}
        <section id="pricing" className="border-t border-b border-border/70 bg-card/30 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div>
                <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">
                  Performance-only pricing
                </h2>
                <p className="mt-4 leading-relaxed text-muted-foreground">
                  Zero management fees. Zero subscription. We earn a share of realized gains —
                  measured on-venue, from your own fills — so the incentive is exactly one thing:
                  <span className="text-foreground"> make your account compound.</span>
                </p>
                <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                  {[
                    "No management fee, ever",
                    "Settled on realized P&L, not marks",
                    "Full fee ledger visible on the desk",
                  ].map((li) => (
                    <li key={li} className="flex items-center gap-3">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--up)" strokeWidth="2" aria-hidden>
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      {li}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-brand/30 bg-gradient-to-b from-brand-soft to-transparent p-8 text-center sm:p-10">
                <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Performance fee
                </div>
                <div className="mt-3 font-mono text-6xl font-bold tracking-tight text-brand sm:text-7xl">
                  20<span className="text-3xl sm:text-4xl">%</span>
                </div>
                <div className="mt-3 text-sm text-muted-foreground">
                  of realized gains · nothing else, ever
                </div>
                <div className="mt-8">
                  <Link href="/#waitlist" className="w-full sm:w-auto">
                    <Button className="w-full sm:w-auto">Get early access</Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA + waitlist form */}
        <section id="waitlist" className="scroll-mt-20 py-16 text-center sm:py-24">
          <div className="mx-auto flex max-w-2xl flex-col items-center px-4 sm:px-6">
            <span className="mb-6 grid size-12 place-items-center rounded-xl border border-brand/40 bg-brand-soft text-brand">
              <FinMark size={26} />
            </span>
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-5xl">
              Your capital. Working every hour.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Waitlist opens in waves. Early seats get the founding rate.
            </p>
            <div className="mt-8 flex w-full justify-center">
              <WaitlistForm source="landing-final" showWallet />
            </div>
            <Link
              href="/desk"
              className="mt-6 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              View the live desk →
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/70 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center sm:px-6">
          <span className="text-sm font-semibold">{BRAND.name}</span>
          <p className="max-w-2xl text-xs leading-relaxed text-subtle-foreground">
            Trading derivatives involves substantial risk of loss. Past performance — simulated or
            live — does not guarantee future results. {BRAND.name} provides software and strategy
            execution, not investment advice.
          </p>
          <p className="text-xs text-subtle-foreground">© 2026 {BRAND.name}</p>
        </div>
      </footer>
    </div>
  );
}
