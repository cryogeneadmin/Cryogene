import { DeliveryForm } from "@/components/storefront/checkout/DeliveryForm";
import { getCheckoutSession } from "@/app/actions/checkout";

export default async function DeliveryStepPage() {
  const existing = await getCheckoutSession();

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-12">
      <p className="label-editorial mb-4">Checkout — Step 1 of 2</p>
      <h1 className="text-4xl mb-8">Delivery details</h1>
      <DeliveryForm initialData={existing ?? undefined} />
    </div>
  );
}
