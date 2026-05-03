// app/api/data-rights/objection/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCustomerSession } from "@/lib/customer-auth";
import { setMarketingConsent } from "@/lib/marketing-consent";
import { writeAuditEvent } from "@/lib/audit-log";
import { sendObjectionConfirmedEmail } from "@/lib/email-templates/marketing-objection";

const InputSchema = z.object({
  granted: z.boolean(),
  source: z.enum(["withdrawal", "post-purchase", "signup"]).default("withdrawal"),
});

export async function POST(req: NextRequest) {
  const session = await getCustomerSession();
  if (!session?.email) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await setMarketingConsent(session.uid, parsed.data.granted, parsed.data.source);

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

  // Send confirmation email only when withdrawing
  if (!parsed.data.granted) {
    await sendObjectionConfirmedEmail({ to: session.email });
  }

  return NextResponse.json({ ok: true });
}
