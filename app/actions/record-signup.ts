"use server";

import { z } from "zod";
import { writeCustomerEvent } from "@/lib/customer-events";

const InputSchema = z.object({
  uid: z.string().min(1).max(128),
  email: z.string().email().max(320),
});

/**
 * Server-only emitter for auth.signup_completed. Called from the
 * /sign-up client flow AFTER signUpWithEmail resolves (the client cannot
 * use emitCustomerEvent directly because the public whitelist is
 * deliberately restricted to 3 event types — adding signup-completed
 * there would defeat the gate). This action validates input and writes
 * exactly one event.
 *
 * Returns void; signature is async because server actions must be.
 */
export async function recordSignupCompleted(input: unknown): Promise<void> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return;
  writeCustomerEvent({
    eventType: "auth.signup_completed",
    emailOverride: parsed.data.email,
    payload: { uid: parsed.data.uid, source: "sign-up-page" },
  });
}
