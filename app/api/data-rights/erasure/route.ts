// app/api/data-rights/erasure/route.ts
import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-auth";
import { createDataRightsRequest } from "@/lib/data-rights";

export async function POST() {
  const session = await getCustomerSession();
  if (!session?.email) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const { id } = await createDataRightsRequest({
    type: "erasure",
    source: "account",
    email: session.email,
    uid: session.uid,
    message: null,
    preVerified: true,
  });
  return NextResponse.json({ ok: true, id });
}
