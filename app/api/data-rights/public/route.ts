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
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
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
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://cryogene.co.uk";
  const verifyUrl = `${baseUrl}/data-rights/verify/${encodeURIComponent(token)}`;

  await sendVerificationEmail({
    to: normalisedEmail,
    requestType: parsed.data.type,
    verifyUrl,
  });

  return NextResponse.json({ ok: true, id });
}
