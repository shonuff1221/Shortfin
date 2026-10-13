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

/* ── MM desk feed (GET /api/mm — served by this app from research/data) ── */

export interface MMTotal {
  pnl: number;
  pnl_conservative: number;
  vol: number;
  fills: number;
  actions: number;
  rejects: number;
  gross_inv: number;
  quoting_now: number;
}

export interface MMMarket {
  coin: string;
  pnl: number;
  "inv$": number;
  fills: number;
  vol: number;
}

export interface MMStatus {
  mode: string;
  updated: string;
  uptime_h: number;
  halted: boolean;
  halt_reason: string;
  today_pnl: number;
  total: MMTotal;
  bp_on_vol: number;
  equity: number | null;
  reserve_spent_today: number;
  config: {
    mode: string;
    quoting: Record<string, number>;
    risk: Record<string, number | boolean>;
  };
  markets: MMMarket[];
}

export interface MMCollStatus {
  started: number;
  rows: Record<string, number>;
  last_msg: Record<string, number>;
  reconnects: number;
  coins: number;
  errors: number;
  uptime_h: number;
  stale_conns: string[];
  updated: string;
}

export interface MMFill {
  ts: string;
  coin: string;
  side: string;
  px: string;
  units: string;
  inv_after: string;
}

export interface MMResponse {
  ok: boolean;
  mode: "paper" | "live";
  status: MMStatus | null;
  daily: Record<string, string>[];
  replay: Record<string, string>[];
  collector: MMCollStatus | null;
  fills: MMFill[];
  generated: string;
}

export function fetchMM(mode: "paper" | "live") {
  return fetcher<MMResponse>(`/api/mm?mode=${mode}`);
}

/* ── user console (/api/user/*) — session-cookie auth ─────────────── */

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
    active: boolean;
    runner_status: string | null;
    status?: string; // 3d access gate: pending | approved | denied | banned
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
  runner?: RunnerInfo | null;
  venue_ttl_s: number;
  ts: number;
}

/* ── per-user grid runner (Lane 3c) ────────────────────────────── */

export type RunnerStatus = "running" | "pending" | "stopped" | "killed";

export interface RunnerInfo {
  status: RunnerStatus;
  market: string | null;
  direction: string | null;
  deployed?: { placed: number; depth: number } | null;
  realized_bps?: number | null;
  spacing_bps?: number | null;
  units_held?: number | null;
  exposure_usd?: number | null;
  last_err?: string | null;
  updated?: number | null;
  age_s?: number | null;
}

export interface AdminRunnerRow {
  address: string;
  role: string;
  tier: string;
  strategy: string | null;
  agent_address: string | null;
  agent_status: string | null;
  active: boolean;
  runner_status: string | null;
  updated_at: string;
  runner: RunnerInfo | null;
}

export function activateRunner(active: boolean) {
  return poster<{ ok: boolean; active: boolean }>("/api/user/activate", { active });
}

export function fetchAdminRunners() {
  return fetcher<{ runners: AdminRunnerRow[]; ts: number }>("/api/admin/runners");
}

/* ── admin user management (3d) ───────────────────────────────── */

export type UserStatus = "pending" | "approved" | "denied" | "banned";

export interface TradingGuard {
  blocked: boolean;
  reasons: string[];
}

export interface AdminUserRow {
  address: string;
  role: string;
  tier: string;
  strategy: string | null;
  agent_address: string | null;
  agent_status: string | null;
  active: boolean;
  runner_status: string | null;
  status: UserStatus;
  created_at: string;
  updated_at: string;
  runner: RunnerInfo | null;
  trading: TradingGuard;
}

export function fetchAdminUsers() {
  return fetcher<{ users: AdminUserRow[]; ts: number }>("/api/admin/users");
}

/** POST a status change; on 409 the API detail is an object — surface its
 *  reasons (trading guard) in the thrown Error message for the panel. */
export async function setUserStatus(address: string, status: UserStatus): Promise<{ ok: true; status: UserStatus }> {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/admin/users/${address}/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ status }),
  });
  if (res.status === 401) throw new Error("unauthorized");
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { detail?: unknown };
    const d = body?.detail;
    if (d && typeof d === "object" && d !== null) {
      const det = d as { error?: string; reasons?: string[] };
      const why = Array.isArray(det.reasons) && det.reasons.length ? ` (${det.reasons.join("; ")})` : "";
      throw new Error(`${det.error ?? `api ${res.status}`}${why}`);
    }
    throw new Error(typeof d === "string" ? d : `api ${res.status}`);
  }
  return res.json() as Promise<{ ok: true; status: UserStatus }>;
}

export function deactivateUser(address: string) {
  return poster<{ ok: boolean; address: string; active: boolean }>(
    `/api/admin/users/${address}/deactivate`,
    {},
  );
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
