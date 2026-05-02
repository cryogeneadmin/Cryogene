import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";

const CHECKOUT_COOKIE = "checkout_session";

export const DeliveryDataSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  line1: z.string().min(1),
  line2: z.string().optional().nullable(),
  city: z.string().min(1),
  postcode: z.string().min(1),
  researchInstitution: z.string().optional().nullable(),
  createAccount: z.boolean(),
  // accountPassword removed — Firebase Auth user is created inline via
  // createCheckoutAccount server action during the delivery step.
  // Password never persists to any cookie or session store.
  customerUid: z.string().nullable().optional(),
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
