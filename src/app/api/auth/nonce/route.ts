import { NextResponse } from "next/server";
import { newNonce } from "@/lib/nonce";

export async function GET() {
  return NextResponse.json({ nonce: newNonce() });
}
