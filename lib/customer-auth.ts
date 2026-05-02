import "server-only";
import { cookies } from "next/headers";
import { getAdminAuthSdk } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME } from "@/lib/auth-cookies";

export type CustomerSession = {
  uid: string;
  email: string | null;
  admin: boolean;
};

/**
 * Server-only: returns the current customer's session, or null if not
 * signed in / cookie invalid. Use in Server Components or server actions
 * to verify ownership before rendering or mutating customer-bound data.
 */
export async function getCustomerSession(): Promise<CustomerSession | null> {
  const auth = getAdminAuthSdk();
  if (!auth) return null;
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!cookieValue) return null;
  try {
    const decoded = await auth.verifySessionCookie(cookieValue, true);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      admin: decoded.admin === true,
    };
  } catch {
    return null;
  }
}
