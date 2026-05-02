import "server-only";

/**
 * Single source of truth for the Firebase session cookie. Read by
 * lib/admin-auth.ts, lib/customer-auth.ts, and the route handlers in
 * app/api/auth/session/route.ts. NEVER write the cookie outside that route.
 */
export const SESSION_COOKIE_NAME = "__session";

/**
 * Firebase Auth recommends a cookie lifetime of at least 5 minutes and at
 * most 14 days. We use 5 days, matching the default expiresIn on
 * createSessionCookie. After this, the customer must sign in again.
 */
export const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 5;

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
};

// ---------------------------------------------------------------------------
// Single-use confirmation cookie — granted at order creation, checked on the
// confirmation page. Allows guest customers (no session) to view their own
// confirmation without exposing the page to anyone with the URL.
// ---------------------------------------------------------------------------

const CONFIRMATION_COOKIE_PREFIX = "cryogene_oc_";
const CONFIRMATION_COOKIE_MAX_AGE_SECONDS = 60 * 60; // 1 hour

export function confirmationCookieName(orderId: string): string {
  return `${CONFIRMATION_COOKIE_PREFIX}${orderId}`;
}

export const CONFIRMATION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: CONFIRMATION_COOKIE_MAX_AGE_SECONDS,
};
