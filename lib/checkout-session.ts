import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { addressSchema } from "@/lib/zod/address";

const CHECKOUT_COOKIE = "checkout_session";

export const DeliveryDataSchema = addressSchema
  .extend({
    fullName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional().nullable(),
    researchInstitution: z.string().optional().nullable(),
    createAccount: z.boolean(),
    marketingOptIn: z.boolean().default(false),  // NEW — captured at checkout, written to consent on order success
    // accountPassword removed — Firebase Auth user is created inline via
    // createCheckoutAccount server action during the delivery step.
    // Password never persists to any cookie or session store.
    customerUid: z.string().nullable().optional(),
  })
  // country defaults to "GB" — form submits no country field (GB-only launch).
  // International activation: widen ALLOWED_COUNTRY_CODES and add a <select>
  // to the delivery form (see spec §13: International Activation Runbook).
  .extend({
    country: addressSchema.shape.country.default("GB"),
  });

export type DeliveryData = z.infer<typeof DeliveryDataSchema>;

export async function setCheckoutSession(data: DeliveryData): Promise<void> {
  const cookieStore = await cookies();
  const encoded = Buffer.from(JSON.stringify(data), "utf-8").toString("base64");
  cookieStore.set(CHECKOUT_COOKIE, encoded, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 30, // 30 minutes
  });
}

export async function getCheckoutSession(): Promise<DeliveryData | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(CHECKOUT_COOKIE)?.value;
  if (!value) return null;
  try {
    const decoded = Buffer.from(value, "base64").toString("utf-8");
    const parsed = DeliveryDataSchema.safeParse(JSON.parse(decoded));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function clearCheckoutSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CHECKOUT_COOKIE);
}
