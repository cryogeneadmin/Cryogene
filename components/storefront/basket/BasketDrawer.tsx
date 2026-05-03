// components/storefront/basket/BasketDrawer.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { useBasket, formatPriceFromPence } from "@/lib/basket";
import { BasketItem } from "./BasketItem";

export function BasketDrawer() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { isOpen, closeDrawer, items, subtotalInPence } = useBasket();

  if (!mounted) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && closeDrawer()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl text-navy">
            Your basket
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto -mx-6 px-6 mt-4">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-serif text-xl text-navy mb-2">
                Your basket is empty
              </p>
              <p className="text-sm text-muted mb-6">
                Add research products to see them here.
              </p>
              <Link
                href="/peptides"
                onClick={closeDrawer}
                className="inline-block px-6 py-2 bg-navy text-white uppercase tracking-wider text-xs hover:bg-mid-navy"
              >
                Browse peptides
              </Link>
            </div>
          ) : (
            items.map((item) => <BasketItem key={item.sku} item={item} />)
          )}
        </div>
        {items.length > 0 && (
          <SheetFooter className="border-t border-border pt-4 flex-col gap-3">
            <div className="flex justify-between w-full text-base">
              <span className="text-muted">Subtotal</span>
              <span className="font-medium">
                {formatPriceFromPence(subtotalInPence())}
              </span>
            </div>
            <p className="text-xs text-muted text-left w-full">
              Shipping and VAT calculated at checkout.
            </p>
            <Link
              href="/basket"
              onClick={closeDrawer}
              className="block w-full text-center py-3 border border-border hover:bg-offwhite uppercase tracking-wider text-xs"
            >
              View basket
            </Link>
            <Link
              href="/checkout"
              onClick={closeDrawer}
              className="block w-full text-center py-3 bg-navy text-white uppercase tracking-wider text-xs hover:bg-mid-navy"
            >
              Proceed to checkout
            </Link>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
