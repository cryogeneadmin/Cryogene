import Link from "next/link";
import type { DeliveryData } from "@/lib/checkout-session";

export function ReviewSummary({
  delivery,
  estimatedDispatch,
}: {
  delivery: DeliveryData;
  estimatedDispatch: string;
}) {
  return (
    <div className="bg-white border border-border p-6 space-y-5 sticky top-32">
      <div>
        <p className="label-editorial mb-2">Delivering to</p>
        <div className="text-sm text-body-grey leading-relaxed">
          <p>{delivery.fullName}</p>
          <p>{delivery.email}</p>
          <p>{delivery.line1}</p>
          {delivery.line2 && <p>{delivery.line2}</p>}
          <p>{delivery.city}</p>
          <p>{delivery.postcode}</p>
          <p>United Kingdom</p>
        </div>
        <Link href="/checkout/delivery" className="text-xs underline text-muted mt-2 inline-block">
          Edit delivery details
        </Link>
      </div>
      <div className="pt-4 border-t border-border">
        <p className="label-editorial mb-2">Dispatch</p>
        <p className="text-sm text-muted">{estimatedDispatch}</p>
      </div>
    </div>
  );
}
