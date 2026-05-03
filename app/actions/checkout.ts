"use server";

import { redirect } from "next/navigation";
import { DeliveryDataSchema, setCheckoutSession, clearCheckoutSession, getCheckoutSession } from "@/lib/checkout-session";
import { createCheckoutAccount } from "@/app/actions/create-checkout-account";
import { writeCustomerEvent } from "@/lib/customer-events";

export type DeliveryFormState = {
  status: "idle" | "error";
  errors?: Record<string, string>;
  // accountError carries friendly messages for Firebase Auth failures
  accountError?: string;
};

export async function saveDeliveryStep(
  _prev: DeliveryFormState,
  formData: FormData
): Promise<DeliveryFormState> {
  const createAccount = formData.get("createAccount") === "on";

  // Parse delivery fields only — accountPassword is no longer part of the
  // session schema and must not be included.
  const parsed = DeliveryDataSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone") || null,
    line1: formData.get("line1"),
    line2: formData.get("line2") || null,
    city: formData.get("city"),
    postcode: formData.get("postcode"),
    researchInstitution: formData.get("researchInstitution") || null,
    createAccount,
    marketingOptIn: formData.get("marketingOptIn") === "on",  // NEW
    customerUid: null,
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]?.toString();
      if (field) errors[field] = issue.message;
    }
    return { status: "error", errors };
  }

  let customerUid: string | null = null;

  if (createAccount) {
    const password = formData.get("accountPassword");
    const result = await createCheckoutAccount({
      email: parsed.data.email,
      password,
    });

    if (!result.ok) {
      switch (result.error) {
        case "email_exists":
          return {
            status: "error",
            accountError:
              "An account with that email already exists. Sign in at /sign-in or use a different email.",
          };
        case "weak_password":
          return {
            status: "error",
            errors: {
              accountPassword: "Password must be at least 8 characters.",
            },
          };
        case "auth_unavailable":
        case "invalid_input":
        default:
          return {
            status: "error",
            accountError:
              "Account creation temporarily unavailable. Please try again in a moment, or continue as guest.",
          };
      }
    }

    customerUid = result.uid;
  }

  await setCheckoutSession({ ...parsed.data, customerUid });
  // Emit before redirect — the cart-recovery upsell triggers on this event.
  // Fire-and-forget void; do not await.
  writeCustomerEvent({
    eventType: "checkout.delivery_submitted",
    emailOverride: parsed.data.email,
    payload: {
      fullName: parsed.data.fullName,
      city: parsed.data.city,
      postcode: parsed.data.postcode,
      customerUid: customerUid,
      createAccount,
    },
  });
  redirect("/checkout/review");
}

export { clearCheckoutSession, getCheckoutSession };
