// app/actions/age-gate.ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const AGE_COOKIE_NAME = "age_verified";
const AGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function confirmAgeGate() {
  const cookieStore = await cookies();
  cookieStore.set(AGE_COOKIE_NAME, "1", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AGE_COOKIE_MAX_AGE,
  });
  redirect("/");
}

export async function leaveSite() {
  redirect("https://www.google.com");
}

export async function isAgeVerified(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(AGE_COOKIE_NAME)?.value === "1";
}
