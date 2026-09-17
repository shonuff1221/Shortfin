/** Same-origin app base — published by next.config (env) from the computed
 *  deploy basePath, so client and server always agree on every target. */
export const APP_BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "/platform";

/** Brain API base (apps/api): same-origin through the rewrites by default.
 *  NEXT_PUBLIC_API_URL overrides for direct local dev — but auth is NEVER
 *  affected by it (see AUTH_URL): auth routes live in THIS app. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? APP_BASE;

/** Auth routes always resolve same-origin — immune to NEXT_PUBLIC_API_URL. */
export const AUTH_URL = APP_BASE;

const TOKEN_KEY = "shortfin.desk.token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token.trim());
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

/** SWR fetcher: attaches bearer token; throws on non-2xx with status. */
export async function fetcher<T>(path: string): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) throw new Error("unauthorized");
  if (!res.ok) throw new Error(`api ${res.status}`);
  return res.json() as Promise<T>;
}

/** POST helper (token + JSON body). Throws Error("unauthorized") on 401,
 *  Error("rate-limited") on 429, Error("api <code>") otherwise. */
export async function poster<T>(path: string, body: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (res.status === 401) throw new Error("unauthorized");
  if (res.status === 429) throw new Error("rate-limited");
  if (!res.ok) throw new Error(`api ${res.status}`);
  return res.json() as Promise<T>;
}

export async function joinWaitlist(body: { email: string; wallet?: string; source: string }) {
  return poster<{ status: "added" | "duplicate" }>("/api/waitlist", body);
}

/* ── API payload types (mirror apps/api) ─────────────────────────── */

export interface Position {
  coin: string;
  dex: string;
  szi: number;
  entry_px: string | null;
  position_value: number;
  u_pnl: number;
  liquidation_px: string | null;
}

export interface Fill {
  time: number;
  coin: string;
  dex: string | null;
  dir: string;
  px: string;
  sz: string;
  closedPnl: string | null;
  fee: string | null;
}

export interface Positions {
  account_value: number;
  usdc: number;
  allocated_margin: number;
  unrealized_pnl: number;
  positions: Position[];
  fills_recent: Fill[];
  fills_24h: number;
  rts_24h: number;
  fees_24h: number;
  realized_24h: number;
  volume_24h: number;
}

export interface GridPosition {
  szi: number;
  entry_px: string | null;
  u_pnl: number;
  position_value: number;
  /** true = venue read failed; this is the last successfully-fetched position */
  stale?: boolean;
  stale_age_s?: number;
}

export interface GridCard {
  market: string;
  dex: string;
  unknown?: boolean;
  state: {
    buys_placed?: Record<string, boolean>;
    sells_placed?: Record<string, boolean>;
    fills_buy?: number;
    fills_sell?: number;
    realized_bps?: number;
    worst_pot_bps?: number;
  };
  placed_buy_rungs: number;
  ladder_depth: number;
  /** Fleet liveness: true buys placed / ladder depth (from state file) */
  deployed?: { placed: number; depth: number };
  /** grid runner log shows "CAP backoff" within the last 10 min */
  cap_backoff?: boolean;
  /** unix ts (s) of the last "FILL " line in the grid log tail, null if none */
  last_activity?: number | null;
  /** venue position with last-good fallback; null = no read ever succeeded */
  position?: GridPosition | null;
  resting_buys: number[];
  resting_sells: number[];
  /** Active rung-spacing override (bps) from data/lab/SPACING_* — null = session auto */
  spacing_override: number | null;
  direction: {
    dir: string;
    reason: string;
    drift_1h?: number;
    drift_4h?: number;
    confidence?: number;
  };
}

export interface Grids {
  markets: GridCard[];
  lineup: { markets: string[]; updated: number; reason?: string } | null;
  lineup_reason?: string | null;
  lineup_updated?: number | null;
}

export interface RotationEvent {
  /** unix ts (s) of the "registry →" line */
  ts: number;
  markets: string[];
  reason: string;
}

export interface Rotations {
  events: RotationEvent[];
  ts: number;
}


export interface LabMarket {
  drift24h: number | null;
  range24h: number | null;
  oscillating: boolean | null;
  best_spacing: number | null;
  best_net_bps_day: number | null;
  ours: boolean;
  our_realized_24h?: number;
}

export interface Lab {
  ts: number;
  markets: Record<string, LabMarket>;
  correlated_dump: boolean;
}

export interface DirectionEntry {
  dir: string;
  reason: string;
  drift_1h?: number;
  drift_4h?: number;
  our_pnl_1h?: number;
  our_rts_1h?: number;
  confidence?: number;
}

export interface Pulse {
  date: string;
  time: string;
  text: string;
}

export interface Summary {
  ts: number;
  age_s: number | null;
  ok: boolean;
  equity: number;
  equity_source: string;
  realized_24h: number;
  fees_24h: number;
  fills_24h: number;
  rts_24h: number;
  volume_24h: number;
  issues: string[];
  markets: Record<string, { buys: number; exits: number; szi: number; upnl: number }>;
}

/* ── write surface (/api/operate + /api/actions) ───────────────────── */

export const OPERATE_CANDIDATES = [
  "io:ANTH",
  "xyz:CL",
  "io:SNDK",
  "xyz:SKHX",
  "io:NBIS",
  "xyz:MU",
] as const;

export interface OperateCandidate {
  market: string;
  frozen: boolean;
  in_lineup: boolean;
}

export interface Operate {
  candidates: OperateCandidate[];
  lineup: { markets: string[]; updated: number; reason?: string } | null;
  ts: number;
}

export type DeskAction = "rotate" | "freeze" | "unfreeze" | "kill" | "spacing";

export const SPACING_CHOICES = [5, 8, 10] as const;

export interface ActionResult {
  ok: boolean;
  action: DeskAction;
  args: { market?: string; markets?: string[]; bps?: number | null };
  note?: string;
  exit_code: number | null;
  output: string;
  elapsed_s: number;
}

export function runAction(body: {
  action: DeskAction;
  market?: string;
  markets?: string[];
  bps?: number | null;
}) {
  return poster<ActionResult>("/api/actions", body);
}

/* ── user console (/api/user/*) — session-cookie auth ─────────────── */

export interface StrategyOption {
  id: string;
  name: string;
  spacing_bps: number;
  tagline: string;
  risk_note: string;
}

export interface UserProfile {
  user: {
    address: string;
    role: "admin" | "user";
    tier: string;
    strategy: string | null;
    agent_address: string | null;
    agent_status: string | null;
    created_at: string;
    updated_at: string;
  };
  strategies: StrategyOption[];
  fee_note: string;
  vault_ready: boolean;
}

export interface UserAccountData {
  address: string;
  equity: number;
  allocated_margin: number;
  unrealized_pnl: number;
  positions: Position[];
  fills_24h: number;
  realized_24h: number;
  fees_24h: number;
  fills_recent: Fill[];
  venue_ttl_s: number;
  ts: number;
}

export function saveUserStrategy(strategy: string) {
  return poster<{ ok: true; strategy: string }>("/api/user/strategy", { strategy });
}

export function generateAgentKey() {
  return poster<{ agent_address: string; agent_status: string }>("/api/user/agent", {});
}

export function markAgentApproved() {
  return poster<{ ok: boolean; agent_status: string }>("/api/user/agent/approved", {});
}

export function fmtAddress(a: string): string {
  return a.slice(0, 6) + "…" + a.slice(-4);
}

/* ── formatting helpers (shared, deterministic) ───────────────────── */

export const fmtUsd = (n: number | null | undefined, digits = 2) =>
  n == null
    ? "—"
    : `${n < 0 ? "−" : ""}$${Math.abs(n).toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })}`;

export const fmtNum = (n: number | null | undefined, digits = 0) =>
  n == null ? "—" : n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const fmtPnl = (n: number | null | undefined, digits = 2) =>
  n == null ? "—" : `${n > 0 ? "+" : n < 0 ? "−" : ""}$${Math.abs(n).toFixed(digits)}`;

export const fmtTime = (ms: number | null | undefined) =>
  ms == null
    ? "—"
    : new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

/** Relative time for API unix-SECOND timestamps ("just now", "4m ago", "3h ago"). */
export const fmtAgo = (tsSec: number | null | undefined, nowMs: number = Date.now()): string => {
  if (tsSec == null) return "—";
  const s = Math.max(0, Math.round(nowMs / 1000 - tsSec));
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export const pnlClass = (n: number | null | undefined) =>
  n == null ? "text-muted-foreground" : n > 0 ? "text-up" : n < 0 ? "text-down" : "text-muted-foreground";
