import Link from "next/link";
import type { Order, Config } from "@/types";
import { formatPriceFromPence } from "@/lib/basket";

export function ConfirmationContent({
  order,
  config,
  isStub,
}: {
  order: Order;
  config: Config;
  isStub: boolean;
}) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      {isStub && (
        <div className="bg-[#FFF3CD] border border-[#E6C97A] p-4 mb-8">
          <p className="label-editorial text-[#6A4D00] mb-1">Stage 1 stub payment</p>
          <p className="text-xs text-[#6A4D00]">
            This is a Phase 1 test confirmation. The real TrueLayer Pay by Bank
            integration will be added in Phase 2. No money has been charged.
          </p>
        </div>
      )}
      <p className="label-editorial mb-4">Order confirmed</p>
      <h1 className="text-5xl mb-3 leading-tight">Thank you, {order.customer.name.split(" ")[0]}.</h1>
      <p className="mono text-sm text-[#6B7280] mb-12">Order {order.orderNumber}</p>

      <div className="bg-white border border-[#DDE1E7] p-6 mb-8">
        <p className="label-editorial mb-4">Your order</p>
        <div className="space-y-3">
          {order.items.map((item, i) => (
            <div key={`${item.sku}-${i}`} className="flex justify-between text-sm">
              <span>{item.name} · {item.size} · qty {item.quantity}</span>
              <span className="mono">{formatPriceFromPence(item.lineTotalInPence)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-[#DDE1E7] space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-[#6B7280]">Subtotal</span><span>{formatPriceFromPence(order.itemsSubtotalInPence)}</span></div>
          <div className="flex justify-between"><span className="text-[#6B7280]">Shipping</span><span>{formatPriceFromPence(order.shippingCostInPence)}</span></div>
          {order.vatAmountInPence > 0 && (
            <div className="flex justify-between"><span className="text-[#6B7280]">VAT</span><span>{formatPriceFromPence(order.vatAmountInPence)}</span></div>
          )}
          <div className="flex justify-between pt-2 border-t border-[#DDE1E7] font-medium"><span>Total</span><span>{formatPriceFromPence(order.totalInPence)}</span></div>
        </div>
      </div>

      <div className="bg-white border border-[#DDE1E7] p-6 mb-8">
        <p className="label-editorial mb-2">Delivering to</p>
        <div className="text-sm leading-relaxed">
          <p>{order.customer.name}</p>
          <p>{order.customer.address.line1}</p>
          {order.customer.address.line2 && <p>{order.customer.address.line2}</p>}
          <p>{order.customer.address.city}</p>
          <p>{order.customer.address.postcode}</p>
        </div>
        <p className="text-xs text-[#6B7280] mt-4">
          {config.shipping.estimatedDispatch}. You&apos;ll receive tracking details
          when your order is dispatched.
        </p>
      </div>

      <div className="bg-[#FFF3CD] border border-[#E6C97A] p-5 mb-8">
        <p className="label-editorial text-[#6A4D00] mb-2">Research use reminder</p>
        <p className="text-sm text-[#6A4D00] leading-relaxed">
          Your order is supplied exclusively for laboratory research use and is
          not for human or veterinary consumption.
        </p>
      </div>

      {order.customer.uid === null && (
        <div className="bg-white border border-[#DDE1E7] p-6">
          <p className="font-serif text-xl text-[#0D1B3E] mb-2">Want this to be easier next time?</p>
          <p className="text-sm text-[#6B7280] mb-4">
            Set a password and we&apos;ll save your delivery details for your next
            order. You&apos;ll also be able to see this order in your account history
            and download the Certificate of Analysis whenever you need it.
          </p>
          <p className="text-xs text-[#6B7280] mb-4">
            Stage 1a note: Retroactive account creation will be added once
            Firebase Auth is wired in Stage 1b.
          </p>
        </div>
      )}

      <div className="mt-8">
        <Link href="/peptides" className="label-editorial hover:text-[#0D1B3E]">
          ← Continue browsing peptides
        </Link>
      </div>
    </div>
  );
}
