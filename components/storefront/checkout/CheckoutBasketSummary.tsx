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
      <div className="bg-white border border-[#DDE1E7] p-6 sticky top-32">
        <p className="label-editorial mb-4">Order summary</p>
        <p className="text-sm text-[#6B7280]">Loading basket…</p>
      </div>
    );
  }

  const subtotal = subtotalInPence();

  if (items.length === 0) {
    return (
      <div className="bg-white border border-[#DDE1E7] p-6 sticky top-32">
        <p className="label-editorial mb-4">Order summary</p>
        <p className="text-sm text-[#6B7280] mb-4">
          Your basket is empty.
        </p>
        <Link
          href="/peptides"
          className="block w-full text-center py-2 border border-[#0D1B3E] text-[#0D1B3E] uppercase tracking-wider text-xs hover:bg-[#0D1B3E] hover:text-white transition-colors"
        >
          Browse research peptides
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#DDE1E7] p-6 sticky top-32 space-y-5">
      <p className="label-editorial">Order summary</p>
      <ul className="space-y-4 list-none p-0 max-h-80 overflow-y-auto">
        {items.map((item) => (
          <li key={item.sku} className="flex gap-3 items-start">
            <div className="relative w-14 h-14 bg-[#F7F8FA] border border-[#DDE1E7] shrink-0">
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
              <p className="text-sm text-[#0D1B3E] truncate">{item.name}</p>
              <p className="text-xs mono text-[#6B7280]">
                {item.size} · ×{item.quantity}
              </p>
            </div>
            <p className="text-sm font-medium text-[#0D1B3E] whitespace-nowrap">
              {formatPriceFromPence(item.unitPriceInPence * item.quantity)}
            </p>
          </li>
        ))}
      </ul>
      <div className="pt-4 border-t border-[#DDE1E7] space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-[#6B7280]">Subtotal</span>
          <span className="text-[#0D1B3E]">
            {formatPriceFromPence(subtotal)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[#6B7280]">Shipping</span>
          <span className="text-[#0D1B3E]">
            {formatPriceFromPence(shippingFlatRateInPence)}
          </span>
        </div>
        <div className="flex justify-between text-base pt-2 border-t border-[#DDE1E7] mt-2">
          <span className="text-[#0D1B3E]">Total</span>
          <span className="font-medium text-[#0D1B3E]">
            {formatPriceFromPence(subtotal + shippingFlatRateInPence)}
          </span>
        </div>
        <p className="text-[11px] text-[#6B7280] pt-1">
          VAT calculated at the review step if applicable.
        </p>
      </div>
    </div>
  );
}
