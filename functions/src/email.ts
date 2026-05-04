// functions/src/email.ts
import { Resend } from "resend";
import { defineSecret } from "firebase-functions/params";

export const RESEND_API_KEY = defineSecret("RESEND_API_KEY");

export function getResend(): Resend {
  return new Resend(RESEND_API_KEY.value());
}

export function fromAddress(): string {
  return "Cryogene Laboratories <noreply@cryogene.co.uk>";
}
