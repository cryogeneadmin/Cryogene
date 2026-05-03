// app/api/data-rights/objection/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { getCustomerSession } from "@/lib/customer-auth";
import { getCustomerById } from "@/lib/customers";
import { setMarketingConsent } from "@/lib/marketing-consent";
import { writeAuditEvent } from "@/lib/audit-log";
import { sendObjectionConfirmedEmail } from "@/lib/email-templates/marketing-objection";
import { isAllowedOrigin } from "@/lib/csrf";

const InputSchema = z.object({
  granted: z.boolean(),
  source: z.enum(["withdrawal", "post-purchase", "signup"]).default("withdrawal"),
});

export async function POST(req: NextRequest) {
  const hdrs = await headers();
  if (!isAllowedOrigin(hdrs.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // session.email may be null in rare edge cases (custom token without email
  // claim). Fall back to the customer doc, matching the page's behaviour.
  const customerEmail = session.email ?? (await getCustomerById(session.uid))?.email ?? null;
  if (!customerEmail) {
    return NextResponse.json({ error: "Customer record missing email" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Persist consent first — this is the load-bearing call. If it throws,
  // we propagate the error and return 500 so the UI knows the change did
  // NOT land.
  await setMarketingConsent(session.uid, parsed.data.granted, parsed.data.source);

  // Audit + email are best-effort. Wrap in try/catch + console.warn so a
  // failure doesn't desync the UI from the persisted consent state.
  try {
    await writeAuditEvent({
      eventType: "customer.objection_received",
      target: { kind: "user", id: session.uid },
      metadata: { granted: parsed.data.granted, source: parsed.data.source },
    });
    await writeAuditEvent({
      eventType: "customer.objection_processed",
      target: { kind: "user", id: session.uid },
      metadata: { granted: parsed.data.granted, source: parsed.data.source },
    });
  } catch (err) {
    console.warn("[objection] post-consent audit emit failed:", err);
  }

  if (!parsed.data.granted) {
    try {
      await sendObjectionConfirmedEmail({ to: customerEmail });
    } catch (err) {
      console.warn("[objection] confirmation email failed:", err);
    }
  }

  return NextResponse.json({ ok: true, granted: parsed.data.granted });
}
