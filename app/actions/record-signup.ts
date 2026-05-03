"use server";

import { z } from "zod";
import { writeCustomerEvent } from "@/lib/customer-events";
import { setMarketingConsent } from "@/lib/marketing-consent";

const InputSchema = z.object({
  uid: z.string().min(1).max(128),
  email: z.string().email().max(320),
  marketingOptIn: z.boolean().optional().default(false),
});

/**
 * Server-only emitter for auth.signup_completed plus optional marketing
 * consent capture. Called from the /sign-up client flow AFTER
 * signUpWithEmail resolves.
 */
export async function recordSignupCompleted(input: unknown): Promise<void> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    // Silent drop is intentional (don't expose validation errors to client)
    // but log so we can spot client/server contract drift in production.
    console.warn(
      "[record-signup] input failed validation; signup event NOT recorded:",
      parsed.error.issues,
    );
    return;
  }

  writeCustomerEvent({
    eventType: "auth.signup_completed",
    emailOverride: parsed.data.email,
    payload: { uid: parsed.data.uid, source: "sign-up-page" },
  });

  if (parsed.data.marketingOptIn) {
    try {
      await setMarketingConsent(parsed.data.uid, true, "signup");
    } catch (err) {
      console.warn(
        "[record-signup] marketing-consent write failed for uid",
        parsed.data.uid,
        ":",
        err,
      );
    }
  }
}
