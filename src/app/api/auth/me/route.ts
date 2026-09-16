import { NextResponse } from "next/server";
import { decodeSession, SESSION_COOKIE } from "@/lib/session";

export async function GET(req: Request) {
  const cookie = req.headers.get("cookie") ?? "";
  const token = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.split("=")
    .slice(1)
    .join("=");
  const session = decodeSession(token);
  if (!session) return NextResponse.json({ error: "no session" }, { status: 401 });
  return NextResponse.json({ address: session.address, role: session.role });
}
