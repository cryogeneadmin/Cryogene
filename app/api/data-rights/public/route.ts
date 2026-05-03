// app/api/data-rights/public/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import {
  createDataRightsRequest,
  signVerificationToken,
  checkPublicFormRateLimit,
} from "@/lib/data-rights";
import { sendVerificationEmail } from "@/lib/email-templates/verification";

const InputSchema = z.object({
  type: z.enum(["access", "rectification", "erasure", "objection"]),
  email: z.string().email().max(320),
  message: z.string().max(1000).optional().default(""),
  // Honeypot — humans never fill this; bots usually do. Drop silently
  // (return ok:true) so they don't iterate on the rejection signal.
  website: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (parsed.data.website && parsed.data.website.length > 0) {
    // Honeypot tripped. Pretend success so the bot doesn't iterate.
    return NextResponse.json({ ok: true, id: "ignored" });
  }

  const hdrs = await headers();
  // Vercel + standard reverse-proxies append the real client IP as the
  // RIGHTMOST entry of x-forwarded-for. The leftmost is the chain's first
  // hop and is attacker-controllable. Use rightmost.
  const xff = hdrs.get("x-forwarded-for");
  const ip = xff
    ? xff.split(",").map((s) => s.trim()).filter(Boolean).pop() ?? null
    : null;

  if (!ip) {
    // Fail closed — without an IP we can't rate-limit, and treating unknown
    // requests as legitimate would let an abuser strip the header to bypass.
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const ipHash = createHash("sha256").update(ip).digest("hex");

  const allowed = await checkPublicFormRateLimit(ipHash);
  if (!allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  // Normalise email at creation so verification can match cleanly
  const normalisedEmail = parsed.data.email.trim().toLowerCase();

  const { id } = await createDataRightsRequest({
    type: parsed.data.type,
    source: "public",
    email: normalisedEmail,
    uid: null,
    message: parsed.data.message || null,
    preVerified: false,
  });

  const token = await signVerificationToken(id, normalisedEmail);
  // Verification links always go to the canonical production domain — never
  // preview deployments or anything env-derived. NEXT_PUBLIC_BASE_URL is
  // readable client-side and not a security boundary; if it ever drifts
  // (preview deploy, misconfig, attacker-controlled), users would receive
  // emails containing attacker-controlled hostnames. Hardcoded.
  const CANONICAL_DOMAIN = "https://cryogene.co.uk";
  const verifyUrl = `${CANONICAL_DOMAIN}/data-rights/verify/${encodeURIComponent(token)}`;

  await sendVerificationEmail({
    to: normalisedEmail,
    requestType: parsed.data.type,
    verifyUrl,
  });

  return NextResponse.json({ ok: true, id });
}
