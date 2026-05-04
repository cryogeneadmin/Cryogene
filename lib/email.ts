// lib/email.ts
import "server-only";
import { Resend } from "resend";

let cached: Resend | null = null;

export function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not configured");
  if (!cached) cached = new Resend(key);
  return cached;
}

export const FROM_ADDRESS = "Cryogene Laboratories <noreply@cryogene.co.uk>";
