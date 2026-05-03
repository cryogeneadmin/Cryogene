// lib/csrf.ts
import "server-only";

const ALLOWED_ORIGINS = [
  "https://cryogene.co.uk",
  "https://www.cryogene.co.uk",
];

/**
 * Same-origin guard for state-mutating POST routes. Defense-in-depth on top
 * of the session cookie's sameSite=strict — that already prevents browser-
 * mediated CSRF, this catches non-browser direct POSTs from the wrong
 * origin (e.g. a curl-spoofed Origin from a wider campaign).
 *
 * In dev (NODE_ENV !== "production") all origins are allowed so localhost
 * and the dev-server work without ceremony.
 */
export function isAllowedOrigin(origin: string | null): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}
