// app/api/data-rights/erasure/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getCustomerSession } from "@/lib/customer-auth";
import { createDataRightsRequest, findOpenRequestForCustomer } from "@/lib/data-rights";
import { getCustomerById } from "@/lib/customers";
import { isAllowedOrigin } from "@/lib/csrf";

export async function POST() {
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

  const existing = await findOpenRequestForCustomer(session.uid, "erasure");
  if (existing) {
    return NextResponse.json({ ok: true, id: existing.id, deduped: true });
  }

  const { id } = await createDataRightsRequest({
    type: "erasure",
    source: "account",
    email: customerEmail,
    uid: session.uid,
    message: null,
    preVerified: true,
  });
  return NextResponse.json({ ok: true, id });
}
