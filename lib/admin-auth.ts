// lib/admin-auth.ts
import "server-only";
import { cookies } from "next/headers";
import { getAdminAuthSdk } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME } from "@/lib/auth-cookies";

export async function isAdminRequest(): Promise<boolean> {
  // Dev bypass for Stage 1a — set ADMIN_DEV_BYPASS=1 in .env.local to unlock admin UI
  // without Firebase Auth. MUST be removed or set to 0 in production.
  const DEV_BYPASS_ALLOWED =
    process.env.NODE_ENV !== "production" &&
    process.env.ADMIN_DEV_BYPASS === "1" &&
    !process.env.VERCEL; // Vercel always sets VERCEL=1
  if (DEV_BYPASS_ALLOWED) return true;

  const auth = getAdminAuthSdk();
  if (!auth) return false;

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return false;

  try {
    const decoded = await auth.verifySessionCookie(sessionCookie, true);
    return decoded.admin === true;
  } catch {
    return false;
  }
}

export async function assertAdmin(): Promise<void> {
  const allowed = await isAdminRequest();
  if (!allowed) {
    throw new Error("Unauthorised");
  }
}
