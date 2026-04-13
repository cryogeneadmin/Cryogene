// app/actions/cookie-consent.ts
"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const CONSENT_COOKIE_NAME = "cookie_consent";
const CONSENT_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export async function acceptCookies() {
  const cookieStore = await cookies();
  cookieStore.set(CONSENT_COOKIE_NAME, "accepted", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CONSENT_MAX_AGE,
  });
  revalidatePath("/");
}

export async function declineCookies() {
  const cookieStore = await cookies();
  cookieStore.set(CONSENT_COOKIE_NAME, "declined", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CONSENT_MAX_AGE,
  });
  revalidatePath("/");
}

export type ConsentState = "accepted" | "declined" | "unknown";

export async function getCookieConsent(): Promise<ConsentState> {
  const cookieStore = await cookies();
  const value = cookieStore.get(CONSENT_COOKIE_NAME)?.value;
  if (value === "accepted") return "accepted";
  if (value === "declined") return "declined";
  return "unknown";
}
