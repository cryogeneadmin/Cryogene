import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminAuthSdk } from "@/lib/firebase/admin";
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_MAX_AGE_SECONDS,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/auth-cookies";

const PostBodySchema = z.object({
  idToken: z.string().min(1).max(4096),
});

export async function POST(request: NextRequest) {
  const auth = getAdminAuthSdk();
  if (!auth) {
    return NextResponse.json(
      { error: "Auth not configured" },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PostBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  let sessionCookie: string;
  try {
    sessionCookie = await auth.createSessionCookie(parsed.data.idToken, {
      expiresIn: SESSION_COOKIE_MAX_AGE_SECONDS * 1000,
    });
  } catch {
    return NextResponse.json({ error: "Invalid ID token" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, SESSION_COOKIE_OPTIONS);
  return response;
}

export async function DELETE(request: NextRequest) {
  const auth = getAdminAuthSdk();
  if (!auth) {
    return NextResponse.json(
      { error: "Auth not configured" },
      { status: 500 }
    );
  }

  const cookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (cookieValue) {
    try {
      const decoded = await auth.verifySessionCookie(cookieValue);
      await auth.revokeRefreshTokens(decoded.uid);
    } catch {
      // Already invalid; clear the cookie anyway.
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: 0,
  });
  return response;
}
