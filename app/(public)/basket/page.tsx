"use client";

import Link from "next/link";
import { useBasket, formatPriceFromPence } from "@/lib/basket";
import { BasketItem } from "@/components/storefront/basket/BasketItem";

export default function BasketPage() {
  const { items, subtotalInPence } = useBasket();

  if (items.length === 0) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 py-24 text-center">
        <h1 className="text-4xl mb-4">Your basket is empty</h1>
        <p className="text-[#6B7280] mb-8">Add research products to see them here.</p>
        <Link
          href="/peptides"
          className="inline-block px-8 py-3 bg-[#0D1B3E] text-white uppercase tracking-wider text-sm hover:bg-[#162040]"
        >
          Browse research peptides
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-16">
      <h1 className="text-4xl mb-8">Your basket</h1>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-12">
        <div>
          {items.map((item) => (
            <BasketItem key={item.sku} item={item} />
          ))}
        </div>
        <div className="lg:sticky lg:top-32 self-start">
          <div className="bg-white border border-[#DDE1E7] p-6 space-y-4">
            <h2 className="font-serif text-2xl text-[#0D1B3E]">Order summary</h2>
            <div className="flex justify-between text-sm">
              <span className="text-[#6B7280]">Subtotal</span>
              <span className="font-medium">{formatPriceFromPence(subtotalInPence())}</span>
            </div>
            <p className="text-xs text-[#6B7280]">
              Shipping and VAT calculated at checkout.
            </p>
            <Link
              href="/checkout"
              className="block text-center py-3 bg-[#0D1B3E] text-white uppercase tracking-wider text-xs hover:bg-[#162040]"
            >
              Proceed to checkout
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
