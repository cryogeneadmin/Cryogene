import { Suspense } from "react";
import { connection } from "next/server";
import { DeliveryForm } from "@/components/storefront/checkout/DeliveryForm";
import { CheckoutBasketSummary } from "@/components/storefront/checkout/CheckoutBasketSummary";
import { getCheckoutSession } from "@/app/actions/checkout";
import { getConfig } from "@/lib/config";

async function DeliveryContent() {
  await connection();
  const existing = await getCheckoutSession();
  const config = await getConfig();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12 items-start">
      <DeliveryForm initialData={existing ?? undefined} />
      <CheckoutBasketSummary
        shippingFlatRateInPence={config.shipping.flatRateInPence}
      />
    </div>
  );
}

export default function DeliveryStepPage() {
  return (
    <div className="max-w-[1280px] mx-auto px-6 py-12">
      <p className="label-editorial mb-4">Checkout — Step 1 of 2</p>
      <h1 className="text-4xl mb-8">Delivery details</h1>
      <Suspense>
        <DeliveryContent />
      </Suspense>
    </div>
  );
}
