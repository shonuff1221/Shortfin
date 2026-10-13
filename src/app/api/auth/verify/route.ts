import { NextRequest, NextResponse } from "next/server";
import { verifyMessage, getAddress } from "viem";
import { consumeNonce } from "@/lib/nonce";
import { encodeSession, roleFor, SESSION_COOKIE, SESSION_COOKIE_OPTS } from "@/lib/session";

/** Wallet sign-in: verify a nonce-backed signature, issue an HMAC session cookie. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { address, message, signature, nonce } = body ?? {};
    if (!address || !message || !signature || !nonce) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }
    if (!consumeNonce(String(nonce))) {
      return NextResponse.json({ error: "nonce invalid, reused, or expired" }, { status: 401 });
    }
    const addr = getAddress(String(address).toLowerCase());
    const expected = `Shortfin sign-in\nnonce: ${nonce}\naddress: ${addr.toLowerCase()}`;
    if (String(message) !== expected) {
      return NextResponse.json({ error: "message mismatch" }, { status: 400 });
    }
    const ok = await verifyMessage({
      address: addr,
      message: expected,
      signature: signature as `0x${string}`,
    });
    if (!ok) {
      return NextResponse.json({ error: "signature verification failed" }, { status: 401 });
    }
    const role = roleFor(addr);
    const res = NextResponse.json({ ok: true, address: addr, role });
    res.cookies.set(
      SESSION_COOKIE,
      encodeSession({ address: addr.toLowerCase(), role, iat: Math.floor(Date.now() / 1000) }),
      SESSION_COOKIE_OPTS,
    );
    return res;
  } catch {
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
