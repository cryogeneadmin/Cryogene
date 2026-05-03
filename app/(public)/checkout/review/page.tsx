import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getCheckoutSession } from "@/app/actions/checkout";
import { getConfig } from "@/lib/config";
import { ReviewSummary } from "@/components/storefront/checkout/ReviewSummary";
import { ReviewBasketList } from "@/components/storefront/checkout/ReviewBasketList";
import { CheckoutSteps } from "@/components/storefront/checkout/CheckoutSteps";

async function ReviewContent() {
  await connection();
  const delivery = await getCheckoutSession();
  if (!delivery) redirect("/checkout/delivery");

  const config = await getConfig();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12">
      <ReviewBasketList
        delivery={delivery}
        shippingRule={config.shipping}
        vatRule={config.vat}
      />
      <ReviewSummary
        delivery={delivery}
        estimatedDispatch={config.shipping.estimatedDispatch}
      />
    </div>
  );
}

export default function ReviewStepPage() {
  return (
    <div className="max-w-[1280px] mx-auto px-6 py-12">
      <CheckoutSteps current="review" />
      <h1 className="text-4xl mb-8">Review your order</h1>
      <Suspense>
        <ReviewContent />
      </Suspense>
    </div>
  );
}
