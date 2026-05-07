import "server-only";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runBatch } from "@/app/actions/fulfilment";
import { isAdminRequest } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const headerSecret = request.headers.get("X-Dispatch-Batch-Secret") ?? "";
  const expectedSecret = process.env.DISPATCH_BATCH_SECRET ?? "";

  let isScheduled = false;
  if (expectedSecret && headerSecret) {
    const a = Buffer.from(headerSecret);
    const b = Buffer.from(expectedSecret);
    if (a.length === b.length && timingSafeEqual(a, b)) {
      isScheduled = true;
    }
  }

  let triggeredBy: "schedule" | "admin" = "schedule";

  if (!isScheduled) {
    // Manual "Run batch now" button — admin session required.
    const allowed = await isAdminRequest();
    if (!allowed) {
      return NextResponse.json({ error: "unauthorised" }, { status: 401 });
    }
    triggeredBy = "admin";
  }

  // runBatch resolves actor from session via writeAuditEvent for the audit
  // record. The DispatchBatchRun.triggeredByActor field is left null/null
  // here because admin-auth.ts doesn't expose decoded session details. Future
  // enhancement: extract uid/email from the verified session cookie.
  const result = await runBatch({ triggeredBy });
  return NextResponse.json(result);
}
