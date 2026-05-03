"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useBasket, formatPriceFromPence } from "@/lib/basket";

export function CheckoutBasketSummary({
  shippingFlatRateInPence,
}: {
  shippingFlatRateInPence: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { items, subtotalInPence } = useBasket();

  if (!mounted) {
    return (
      <div className="bg-white border border-border p-6 sticky top-32">
        <p className="label-editorial mb-4">Order summary</p>
        <p className="text-sm text-muted">Loading basket…</p>
      </div>
    );
  }

  const subtotal = subtotalInPence();

  if (items.length === 0) {
    return (
      <div className="bg-white border border-border p-6 sticky top-32">
        <p className="label-editorial mb-4">Order summary</p>
        <p className="text-sm text-muted mb-4">
          Your basket is empty.
        </p>
        <Link
          href="/peptides"
          className="block w-full text-center py-2 border border-navy text-navy uppercase tracking-wider text-xs hover:bg-navy hover:text-white transition-colors"
        >
          Browse research peptides
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white border border-border p-6 sticky top-32 space-y-5">
      <p className="label-editorial">Order summary</p>
      <ul className="space-y-4 list-none p-0 max-h-80 overflow-y-auto">
        {items.map((item) => (
          <li key={item.sku} className="flex gap-3 items-start">
            <div className="relative w-14 h-14 bg-offwhite border border-border shrink-0">
              {item.primaryImage && (
                <Image
                  src={item.primaryImage}
                  alt={item.name}
                  fill
                  className="object-contain p-1"
                  sizes="56px"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-navy truncate">{item.name}</p>
              <p className="text-xs mono text-muted">
                {item.size} · ×{item.quantity}
              </p>
            </div>
            <p className="text-sm font-medium text-navy whitespace-nowrap">
              {formatPriceFromPence(item.unitPriceInPence * item.quantity)}
            </p>
          </li>
        ))}
      </ul>
      <div className="pt-4 border-t border-border space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted">Subtotal</span>
          <span className="text-navy">
            {formatPriceFromPence(subtotal)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted">Shipping</span>
          <span className="text-navy">
            {formatPriceFromPence(shippingFlatRateInPence)}
          </span>
        </div>
        <div className="flex justify-between text-base pt-2 border-t border-border mt-2">
          <span className="text-navy">Total</span>
          <span className="font-medium text-navy">
            {formatPriceFromPence(subtotal + shippingFlatRateInPence)}
          </span>
        </div>
        <p className="text-[11px] text-muted pt-1">
          VAT calculated at the review step if applicable.
        </p>
      </div>
    </div>
  );
}
