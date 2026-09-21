import { createHmac, timingSafeEqual } from "crypto";

/** HMAC-signed cookie sessions — wallet-native, zero-dependency.
 *  Identity = verified wallet address. Secret from SESSION_SECRET env.
 *  Swap-upgradeable to Better Auth later without touching callers. */

const SECRET = process.env.SESSION_SECRET ?? "dev-only-insecure";
export const SESSION_COOKIE = "shortfin_session";
const MAX_AGE_S = 30 * 86400;

export type Session = { address: string; role: "admin" | "user"; iat: number };

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function encodeSession(s: Session): string {
  const payload = Buffer.from(JSON.stringify(s)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(token?: string | null): Session | null {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  const expected = sign(payload);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const s = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    if (!s?.address || !s?.role) return null;
    if (Date.now() / 1000 - s.iat > MAX_AGE_S) return null;
    return s;
  } catch {
    return null;
  }
}

export function roleFor(address: string): "admin" | "user" {
  const admins = (process.env.ADMIN_ADDRS ?? "")
    .split(",").map((a) => a.trim().toLowerCase()).filter(Boolean);
  return admins.includes(address.toLowerCase()) ? "admin" : "user";
}

export const SESSION_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_S,
};
