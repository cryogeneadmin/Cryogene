// lib/admin-auth.ts
import "server-only";
import { cookies } from "next/headers";
import { getAdminAuthSdk } from "@/lib/firebase/admin";

export async function isAdminRequest(): Promise<boolean> {
  // Dev bypass for Stage 1a — set ADMIN_DEV_BYPASS=1 in .env.local to unlock admin UI
  // without Firebase Auth. MUST be removed or set to 0 in production.
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.ADMIN_DEV_BYPASS === "1"
  ) {
    return true;
  }

  const auth = getAdminAuthSdk();
  if (!auth) return false;

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value;
  if (!sessionCookie) return false;

  try {
    const decoded = await auth.verifySessionCookie(sessionCookie, true);
    return decoded.admin === true;
  } catch {
    return false;
  }
}
