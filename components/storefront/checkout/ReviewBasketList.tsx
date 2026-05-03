"use client";

import { useBasket, formatPriceFromPence } from "@/lib/basket";
import { computeShippingInPence } from "@/lib/shipping";
import { computeVatInPence } from "@/lib/vat";
import { ResearchConfirmCheckbox } from "./ResearchConfirmCheckbox";
import type { Config } from "@/types";
import type { DeliveryData } from "@/lib/checkout-session";

export function ReviewBasketList({
  delivery,
  shippingRule,
  vatRule,
}: {
  delivery: DeliveryData;
  shippingRule: Config["shipping"];
  vatRule: Config["vat"];
}) {
  const { items, subtotalInPence } = useBasket();
  const subtotal = subtotalInPence();
  const shipping = computeShippingInPence(subtotal, shippingRule);
  const vat = computeVatInPence(subtotal + shipping, vatRule);
  const total = subtotal + shipping + vat;

  if (items.length === 0) {
    return (
      <div className="border border-dashed border-border p-8 text-center">
        <p className="font-serif text-xl text-navy mb-2">Your basket is empty</p>
        <p className="text-sm text-muted">Add items to your basket before checking out.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.sku} className="flex justify-between py-3 border-b border-border">
            <div>
              <p className="font-serif text-lg text-navy">{item.name}</p>
              <p className="mono text-xs text-muted">{item.sku} · {item.size} · qty {item.quantity}</p>
            </div>
            <p className="text-sm font-medium">
              {formatPriceFromPence(item.unitPriceInPence * item.quantity)}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-6 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>{formatPriceFromPence(subtotal)}</span></div>
        <div className="flex justify-between"><span className="text-muted">Shipping</span><span>{formatPriceFromPence(shipping)}</span></div>
        {vatRule.registered && (
          <div className="flex justify-between"><span className="text-muted">VAT ({(vatRule.rate * 100).toFixed(0)}%)</span><span>{formatPriceFromPence(vat)}</span></div>
        )}
        <div className="flex justify-between pt-3 border-t border-border text-lg font-medium">
          <span>Total</span><span>{formatPriceFromPence(total)}</span>
        </div>
      </div>
      <ResearchConfirmCheckbox />
    </div>
  );
}
