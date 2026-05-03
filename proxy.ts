// proxy.ts
//
// Next.js 16 proxy (replaces middleware). Runs on every request before any
// Server Component renders.
//
// Currently does one thing: mints the cryogene_session_id httpOnly cookie
// on requests that don't have one. This means lib/customer-events.ts can
// always READ the cookie from RSCs without needing to set (which Next.js
// 16 disallows outside Server Actions / Route Handlers / middleware-or-proxy).
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "cryogene_session_id";
const SESSION_COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 12 months

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  if (!request.cookies.get(SESSION_COOKIE)) {
    response.cookies.set(SESSION_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_COOKIE_MAX_AGE,
    });
  }

  return response;
}

export const config = {
  // Match all paths except Next.js internals + static assets.
  // We DO want to mint on _next/data so client-side navigation gets a
  // session cookie, but we skip /_next/static and image optimisation
  // requests since those can't carry cookies in our flow anyway.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|avif|svg|css|js|woff|woff2)).*)",
  ],
};
