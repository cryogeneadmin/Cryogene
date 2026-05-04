// app/(admin)/admin/customers/[uid]/page.tsx
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { assertAdmin } from "@/lib/admin-auth";
import { getCustomerById } from "@/lib/customers";
import { getMarketingConsent } from "@/lib/marketing-consent";

async function CustomerDetail({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  await connection();
  await assertAdmin();
  const { uid } = await params;
  const customer = await getCustomerById(uid);
  if (!customer) notFound();
  const consent = await getMarketingConsent(uid);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl text-navy">{customer.email}</h1>
      <Link
        href={`/admin/audit-log?tk=user&tid=${uid}`}
        className="text-sm text-blue underline hover:no-underline"
      >
        View audit trail →
      </Link>
      <dl className="grid grid-cols-[160px_1fr] gap-y-1 text-sm">
        <dt className="text-muted">Name</dt>
        <dd>{customer.name || "—"}</dd>
        <dt className="text-muted">Phone</dt>
        <dd>{customer.phone ?? "—"}</dd>
        <dt className="text-muted">Orders</dt>
        <dd>{customer.orderCount}</dd>
        <dt className="text-muted">Lifetime spend</dt>
        <dd>£{(customer.lifetimeValueInPence / 100).toFixed(2)}</dd>
        <dt className="text-muted">Marketing consent</dt>
        <dd>{consent.granted ? `Granted via ${consent.source}` : "Not granted"}</dd>
      </dl>
    </div>
  );
}

export default function CustomerDetailPage(props: {
  params: Promise<{ uid: string }>;
}) {
  return (
    <div className="p-6">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <CustomerDetail params={props.params} />
      </Suspense>
    </div>
  );
}
