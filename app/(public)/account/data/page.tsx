// app/(public)/account/data/page.tsx
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-auth";
import { getCustomerById } from "@/lib/customers";
import { getMarketingConsent } from "@/lib/marketing-consent";
import { AccountDataClient } from "./AccountDataClient";
import { SkeletonRows } from "@/components/ui/Skeleton";

async function AccountDataContent() {
  await connection();
  const session = await getCustomerSession();
  if (!session) redirect("/sign-in?redirect=/account/data");

  const customer = await getCustomerById(session.uid);
  const consent = await getMarketingConsent(session.uid);

  return (
    <AccountDataClient
      customerEmail={session.email ?? customer?.email ?? ""}
      orderCount={customer?.orderCount ?? 0}
      createdAt={customer?.createdAt ? new Date(customer.createdAt as Date).toISOString() : null}
      marketingGranted={consent.granted}
    />
  );
}

export default function AccountDataPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="font-serif text-4xl text-navy mb-3">Data &amp; privacy</h1>
      <p className="text-muted mb-8">
        See a summary of the data we hold on you, exercise your UK GDPR rights,
        and manage your marketing email preferences.
      </p>
      <Suspense fallback={<SkeletonRows count={5} />}>
        <AccountDataContent />
      </Suspense>
    </div>
  );
}
