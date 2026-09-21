import { randomBytes } from "crypto";

/** Single-use nonce store for wallet sign-in. In-memory (single instance);
 *  TTL 5 min, capped size. Adequate for the current single-server + single
 *  Vercel-region deployment; swap to the Postgres-backed store when we add
 *  regions (noted in BUILD.md). */

const TTL_MS = 5 * 60_000;
const CAP = 1000;
const nonces = new Map<string, number>();

function sweep(): void {
  const cut = Date.now() - TTL_MS;
  for (const [k, t] of nonces) if (t < cut) nonces.delete(k);
}

export function newNonce(): string {
  if (nonces.size > CAP) sweep();
  const n = randomBytes(16).toString("hex");
  nonces.set(n, Date.now());
  return n;
}

export function consumeNonce(n: string): boolean {
  const t = nonces.get(n);
  if (t === undefined) return false;
  nonces.delete(n); // single-use
  return Date.now() - t < TTL_MS;
}
