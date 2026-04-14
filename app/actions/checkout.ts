"use server";

import { redirect } from "next/navigation";
import { DeliveryDataSchema, setCheckoutSession, clearCheckoutSession, getCheckoutSession } from "@/lib/checkout-session";

export type DeliveryFormState = {
  status: "idle" | "error";
  errors?: Record<string, string>;
};

export async function saveDeliveryStep(
  _prev: DeliveryFormState,
  formData: FormData
): Promise<DeliveryFormState> {
  const createAccount = formData.get("createAccount") === "on";
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
    accountPassword: createAccount ? formData.get("accountPassword") : null,
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]?.toString();
      if (field) errors[field] = issue.message;
    }
    return { status: "error", errors };
  }

  await setCheckoutSession(parsed.data);
  redirect("/checkout/review");
}

export { clearCheckoutSession, getCheckoutSession };
