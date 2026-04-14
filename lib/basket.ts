import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@/types";

export type BasketItem = {
  productId: string;
  productSlug: string;
  name: string;
  sku: string;
  size: string;
  unitPriceInPence: number;
  quantity: number;
  primaryImage: string;
};

type BasketState = {
  items: BasketItem[];
  isOpen: boolean;
  addItem: (product: Product, sku: string, quantity: number) => void;
  removeItem: (sku: string) => void;
  updateQuantity: (sku: string, quantity: number) => void;
  clearBasket: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  itemCount: () => number;
  subtotalInPence: () => number;
};

export const useBasket = create<BasketState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (product, sku, quantity) => {
        const variant = product.variants.find((v) => v.sku === sku);
        if (!variant) {
          console.warn(`addItem called with unknown sku: ${sku}`);
          return;
        }
        const existing = get().items.find((i) => i.sku === sku);
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.sku === sku ? { ...i, quantity: i.quantity + quantity } : i
            ),
          });
        } else {
          set({
            items: [
              ...get().items,
              {
                productId: product.id,
                productSlug: product.slug,
                name: product.name,
                sku: variant.sku,
                size: variant.size,
                unitPriceInPence: variant.priceInPence,
                quantity,
                primaryImage: product.images[product.primaryImageIndex] ?? product.images[0] ?? "",
              },
            ],
          });
        }
      },

      removeItem: (sku) =>
        set({ items: get().items.filter((i) => i.sku !== sku) }),

      updateQuantity: (sku, quantity) => {
        if (quantity <= 0) {
          get().removeItem(sku);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.sku === sku ? { ...i, quantity } : i
          ),
        });
      },

      clearBasket: () => set({ items: [] }),

      openDrawer: () => set({ isOpen: true }),
      closeDrawer: () => set({ isOpen: false }),

      itemCount: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),
      subtotalInPence: () =>
        get().items.reduce(
          (sum, item) => sum + item.unitPriceInPence * item.quantity,
          0
        ),
    }),
    {
      name: "peptide_basket_v1",
      version: 1,
    }
  )
);

export function formatPriceFromPence(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}
