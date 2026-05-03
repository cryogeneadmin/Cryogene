// app/actions/contact.ts
"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { createEnquiry } from "@/lib/enquiries";

const ContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  subject: z.string().min(1),
  message: z.string().min(10),
});

export type ContactFormState = {
  status: "idle" | "success" | "error";
  errors?: Partial<Record<"name" | "email" | "subject" | "message", string>>;
  generalError?: string;
};

// ── IP rate limiter ──────────────────────────────────────────────────────────
// In-memory; bounded to current serverless instance. Tier 2 work would move
// to Vercel KV / Upstash for cross-instance enforcement.
const ipRateLimit = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_PER_WINDOW = 3;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const existing = ipRateLimit.get(ip);
  if (!existing || existing.resetAt < now) {
    ipRateLimit.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (existing.count >= MAX_PER_WINDOW) return false;
  existing.count++;
  return true;
}

export async function submitContactForm(
  _prev: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  // ── Honeypot check ─────────────────────────────────────────────────────────
  // Real browsers never fill this hidden field; bots filling all named inputs
  // will populate it. Return a silent success so the bot gets no signal.
  const honeypot = formData.get("website");
  if (honeypot && typeof honeypot === "string" && honeypot.length > 0) {
    return { status: "success" };
  }

  // ── IP rate limit ──────────────────────────────────────────────────────────
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    "unknown";
  if (!checkRateLimit(ip)) {
    return {
      status: "error",
      generalError: "Too many requests. Please wait a minute and try again.",
    };
  }

  const parsed = ContactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    const errors: ContactFormState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof NonNullable<ContactFormState["errors"]>;
      if (field) errors[field] = issue.message;
    }
    return { status: "error", errors };
  }

  try {
    await createEnquiry(parsed.data);
    // TODO Stage 1b: send Resend confirmation email to customer
    // TODO Stage 1b: send Resend notification email to Sam
    return { status: "success" };
  } catch (err) {
    return {
      status: "error",
      generalError: err instanceof Error ? err.message : "Failed to submit enquiry",
    };
  }
}
