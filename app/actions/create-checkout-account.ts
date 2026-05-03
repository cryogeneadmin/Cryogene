"use server";

import "server-only";
import { z } from "zod";
import { getAdminAuthSdk } from "@/lib/firebase/admin";
import { upsertCustomer } from "@/lib/customers";
import { writeCustomerEvent } from "@/lib/customer-events";
import type { Customer } from "@/types";

const InputSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(200),
});

export type CreateCheckoutAccountResult =
  | { ok: true; uid: string }
  | {
      ok: false;
      error: "auth_unavailable" | "email_exists" | "weak_password" | "invalid_input";
    };

export async function createCheckoutAccount(
  input: unknown
): Promise<CreateCheckoutAccountResult> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const auth = getAdminAuthSdk();
  if (!auth) return { ok: false, error: "auth_unavailable" };

  let uid: string;
  try {
    const user = await auth.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      emailVerified: false,
    });
    uid = user.uid;
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === "auth/email-already-exists") return { ok: false, error: "email_exists" };
    if (code === "auth/weak-password" || code === "auth/invalid-password") {
      return { ok: false, error: "weak_password" };
    }
    return { ok: false, error: "auth_unavailable" };
  }

  // Best-effort customer-doc creation. If this fails the user account is
  // still created; the customer doc gets created on first /account view.
  try {
    const now = new Date();
    const newCustomer = {
      id: uid,
      email: parsed.data.email,
      name: "",
      phone: null,
      defaultAddress: null,
      researchInstitution: null,
      marketingOptIn: false,
      orderCount: 0,
      lifetimeValueInPence: 0,
      createdAt: now,
      lastLoginAt: now,
    } as Customer;
    await upsertCustomer(newCustomer);
  } catch {
    // swallow — customer doc will be created lazily on first /account view
  }

  // Welcome-email upsell groundwork. Fire-and-forget void.
  writeCustomerEvent({
    eventType: "auth.signup_completed",
    emailOverride: parsed.data.email,
    payload: { uid, source: "checkout" },
  });

  return { ok: true, uid };
}
