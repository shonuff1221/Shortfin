import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decodeSession, SESSION_COOKIE } from "@/lib/session";

/** Desk requires an authenticated ADMIN session (wallet sign-in).
 *  The existing token gate inside the desk page stays as a second layer. */
export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const session = decodeSession(jar.get(SESSION_COOKIE)?.value);
  if (!session || session.role !== "admin") {
    redirect("/");
  }
  return <>{children}</>;
}
