# Peptide Store — Plan 2: Public Storefront

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete browsable public storefront: homepage, three category listing pages with filters, product detail pages (statically generated from seed data), basket (Zustand drawer + full page), and the static marketing pages (About, Contact, Product Information, six legal pages with review-gate frontmatter).

**Architecture:** All pages are Server Components by default. Interactive components (variant selector, basket drawer, product filters) use `'use client'` with URL query-param state where possible for SEO. Basket state lives in a Zustand store persisted to localStorage. Legal pages render from markdown files in `content/legal/` with a frontmatter-gated "placeholder" banner.

**Tech Stack:** Next.js 16 App Router, Tailwind v4, shadcn/ui primitives (from Plan 1), Zustand, `gray-matter` + `react-markdown` for markdown rendering.

**Spec reference:** `docs/superpowers/specs/2026-04-13-peptide-store-phase1-design.md` Sections 7, 8.4.

**Delivers at end of plan:** A complete browsable storefront running against the seed JSON from Plan 1. A visitor can land on the homepage, click into any of three category listings, filter and sort products, open a product detail page, select a variant, add to basket, open the basket drawer, and navigate to About/Contact/Product Information/all legal pages. Checkout is a stub route (implemented in Plan 3). No Firestore reads, no authentication, no SEO metadata beyond what Plan 1 set up.

**Testing strategy for this plan:** Manual visual verification per task. `npm run build` after each structural change. Basket state checked via browser devtools localStorage inspection.

**Assumed handoffs from Plan 1:**
- Types at `types/*.ts` (especially `Product`, `ProductVariant`, `ProductCategory`)
- `lib/products.ts` data layer with `getProducts`, `getProductBySlug`, `getFeaturedProducts`, `getAllProductSlugs`
- shadcn primitives at `components/ui/*`
- Tailwind v4 brand theme with `--color-navy`, `--color-off-white`, `--color-border-grey`, etc.
- Three font variables (Cormorant, DM Sans, JetBrains Mono) wired via next/font
- Compliance infrastructure wrapping every page via root layout
- Navbar and Footer scaffolds (will be updated in this plan)

---

## Review notes from Plan 1

> **This section is populated by Opus during the end-of-Plan-1 review.** It captures any drift, learnings, or adjustments from Plan 1 execution that Sonnet needs to know about before starting Plan 2. If this section still says "Awaiting review" when Sonnet opens this file, **STOP** and confirm with David that the Opus review has been run.

**Status:** ⏳ Awaiting review — populated after Plan 1 execution completes and David runs the Opus review.

**Package versions as installed (to be confirmed):**
- next: TBC
- tailwindcss: TBC
- shadcn: TBC
- firebase / firebase-admin: TBC

**Drift from plan (if any):** TBC

**Adjustments to Plan 2 tasks (if any):** TBC

**Unresolved issues to watch in Plan 2:** TBC

---

**Handoffs to Plan 3 (Checkout + Customer Accounts):**
- `components/basket/BasketDrawer.tsx` and `lib/basket.ts` (Zustand store)
- Product detail page calls basket store's `addItem(product, variantSku, quantity)` — Plan 3 reads from same store
- `/basket` page exists; `/checkout` is a stub that Plan 3 replaces
- Contact form Server Action writes to seed enquiries (or real Firestore if wired) — Plan 3 can read the same pattern for orders

---

## Task 1: Install dependencies for storefront (Zustand, gray-matter, react-markdown)

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Zustand, gray-matter, react-markdown, and remark-gfm**

```bash
npm install zustand gray-matter react-markdown remark-gfm
```

- [ ] **Step 2: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: install storefront dependencies (zustand, gray-matter, react-markdown, remark-gfm)"
```

---

## Task 2: Create the Zustand basket store

**Files:**
- Create: `lib/basket.ts`

- [ ] **Step 1: Write the basket store**

```typescript
"use client";

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
```

- [ ] **Step 2: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add Zustand basket store with localStorage persistence"
```

---

## Task 3: Create BasketDrawer and BasketIconButton components

**Files:**
- Create: `components/storefront/basket/BasketDrawer.tsx`
- Create: `components/storefront/basket/BasketIconButton.tsx`
- Create: `components/storefront/basket/BasketItem.tsx`

- [ ] **Step 1: Create BasketItem component**

```tsx
// components/storefront/basket/BasketItem.tsx
"use client";

import Image from "next/image";
import { useBasket, formatPriceFromPence, type BasketItem as BasketItemType } from "@/lib/basket";

export function BasketItem({ item }: { item: BasketItemType }) {
  const { updateQuantity, removeItem } = useBasket();

  return (
    <div className="flex gap-4 py-4 border-b border-[#DDE1E7]">
      <div className="relative h-20 w-20 bg-[#F7F8FA] flex-shrink-0">
        {item.primaryImage && (
          <Image
            src={item.primaryImage}
            alt={item.name}
            fill
            className="object-contain"
            sizes="80px"
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-serif text-lg text-[#0D1B3E] truncate">{item.name}</p>
        <p className="mono text-xs text-[#6B7280]">{item.sku} · {item.size}</p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => updateQuantity(item.sku, item.quantity - 1)}
              aria-label="Decrease quantity"
              className="w-7 h-7 border border-[#DDE1E7] hover:bg-[#F7F8FA] text-sm"
            >
              −
            </button>
            <span className="w-8 text-center text-sm">{item.quantity}</span>
            <button
              type="button"
              onClick={() => updateQuantity(item.sku, item.quantity + 1)}
              aria-label="Increase quantity"
              className="w-7 h-7 border border-[#DDE1E7] hover:bg-[#F7F8FA] text-sm"
            >
              +
            </button>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">
              {formatPriceFromPence(item.unitPriceInPence * item.quantity)}
            </p>
            <button
              type="button"
              onClick={() => removeItem(item.sku)}
              className="text-xs text-[#6B7280] hover:text-[#0D1B3E] underline"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create BasketDrawer component**

```tsx
// components/storefront/basket/BasketDrawer.tsx
"use client";

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
  const { isOpen, closeDrawer, items, subtotalInPence } = useBasket();

  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && closeDrawer()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl text-[#0D1B3E]">
            Your basket
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto -mx-6 px-6 mt-4">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-serif text-xl text-[#0D1B3E] mb-2">
                Your basket is empty
              </p>
              <p className="text-sm text-[#6B7280] mb-6">
                Add research products to see them here.
              </p>
              <Link
                href="/peptides"
                onClick={closeDrawer}
                className="inline-block px-6 py-2 bg-[#0D1B3E] text-white uppercase tracking-wider text-xs hover:bg-[#162040]"
              >
                Browse peptides
              </Link>
            </div>
          ) : (
            items.map((item) => <BasketItem key={item.sku} item={item} />)
          )}
        </div>
        {items.length > 0 && (
          <SheetFooter className="border-t border-[#DDE1E7] pt-4 flex-col gap-3">
            <div className="flex justify-between w-full text-base">
              <span className="text-[#6B7280]">Subtotal</span>
              <span className="font-medium">
                {formatPriceFromPence(subtotalInPence())}
              </span>
            </div>
            <p className="text-xs text-[#6B7280] text-left w-full">
              Shipping and VAT calculated at checkout.
            </p>
            <Link
              href="/basket"
              onClick={closeDrawer}
              className="block w-full text-center py-3 border border-[#DDE1E7] hover:bg-[#F7F8FA] uppercase tracking-wider text-xs"
            >
              View basket
            </Link>
            <Link
              href="/checkout"
              onClick={closeDrawer}
              className="block w-full text-center py-3 bg-[#0D1B3E] text-white uppercase tracking-wider text-xs hover:bg-[#162040]"
            >
              Proceed to checkout
            </Link>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 3: Create BasketIconButton component**

```tsx
// components/storefront/basket/BasketIconButton.tsx
"use client";

import { useBasket } from "@/lib/basket";

export function BasketIconButton() {
  const { openDrawer, itemCount } = useBasket();
  const count = itemCount();

  return (
    <button
      type="button"
      onClick={openDrawer}
      aria-label={`Open basket (${count} items)`}
      className="label-editorial hover:text-[#0D1B3E] transition-colors flex items-center gap-2"
    >
      <span>Basket</span>
      {count > 0 && (
        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-[#0D1B3E] text-white text-[10px]">
          {count}
        </span>
      )}
    </button>
  );
}
```

- [ ] **Step 4: Wire BasketIconButton and BasketDrawer into the Navbar**

Open `components/storefront/layout/Navbar.tsx` and replace the Basket link with the `BasketIconButton`. Also mount the `BasketDrawer` so it's available on every page.

```tsx
import Link from "next/link";
import { BasketIconButton } from "@/components/storefront/basket/BasketIconButton";
import { BasketDrawer } from "@/components/storefront/basket/BasketDrawer";

const navLinks = [
  { href: "/peptides", label: "Peptides" },
  { href: "/capsules", label: "Capsules" },
  { href: "/mixers", label: "Mixers" },
  { href: "/product-information", label: "Product Info" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  return (
    <>
      <nav className="sticky top-9 z-30 bg-white border-b border-[#DDE1E7]">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-serif text-[#0D1B3E] tracking-tight">
            [PEPTIDE STORE]
          </Link>
          <ul className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="label-editorial hover:text-[#0D1B3E] transition-colors">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-4">
            <BasketIconButton />
          </div>
        </div>
      </nav>
      <BasketDrawer />
    </>
  );
}
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

Expected: successful build.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add basket drawer, item component, and navbar integration"
```

---

## Task 4: Create ProductCard component

**Files:**
- Create: `components/storefront/products/ProductCard.tsx`

- [ ] **Step 1: Write ProductCard**

```tsx
// components/storefront/products/ProductCard.tsx
import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/types";
import { formatPriceFromPence } from "@/lib/basket";

export function ProductCard({ product }: { product: Product }) {
  const lowestPriceVariant = product.variants.reduce((lowest, v) =>
    v.priceInPence < lowest.priceInPence ? v : lowest
  );
  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
  const primaryImage = product.images[product.primaryImageIndex] ?? product.images[0];

  return (
    <Link
      href={`/${product.category}/${product.slug}`}
      className="group block border border-[#DDE1E7] bg-white hover:border-[#0D1B3E] transition-colors"
    >
      <div className="relative aspect-square bg-[#F7F8FA] overflow-hidden">
        {primaryImage && (
          <Image
            src={primaryImage}
            alt={`${product.name} research peptide ${lowestPriceVariant.size} vial`}
            fill
            className="object-contain p-6"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        )}
      </div>
      <div className="p-5 border-t border-[#DDE1E7]">
        <h3 className="font-serif text-xl text-[#0D1B3E] leading-tight mb-1">
          {product.name}
        </h3>
        <p className="mono text-[11px] text-[#6B7280] mb-3">
          CAS {product.casNumber}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#333333]">
            From {formatPriceFromPence(lowestPriceVariant.priceInPence)}
          </span>
          <span className="label-editorial text-[11px]">
            {product.purity} purity
          </span>
        </div>
        {totalStock === 0 && (
          <p className="text-xs text-red-700 mt-2">Out of stock</p>
        )}
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Configure `next.config.ts` for image handling**

Open `next.config.ts` and ensure `images` config allows local SVGs (which are served from `/public`) and remote HTTPS Firebase Storage URLs:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add ProductCard component with next/image and editorial layout"
```

---

## Task 5: Create ProductFilters and ProductListingPage components

**Files:**
- Create: `components/storefront/products/ProductFilters.tsx`
- Create: `components/storefront/products/ProductListingPage.tsx`

- [ ] **Step 1: Create ProductFilters (client component, reads/writes URL query params)**

```tsx
// components/storefront/products/ProductFilters.tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

type FilterOptions = {
  sizes: string[];
  testingMethods: string[];
};

export function ProductFilters({ sizes, testingMethods }: FilterOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSizes = searchParams.get("sizes")?.split(",").filter(Boolean) ?? [];
  const currentMethods = searchParams.get("methods")?.split(",").filter(Boolean) ?? [];
  const inStockOnly = searchParams.get("instock") === "1";

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const toggleSize = (size: string) => {
    const next = currentSizes.includes(size)
      ? currentSizes.filter((s) => s !== size)
      : [...currentSizes, size];
    updateParam("sizes", next.join(","));
  };

  const toggleMethod = (method: string) => {
    const next = currentMethods.includes(method)
      ? currentMethods.filter((m) => m !== method)
      : [...currentMethods, method];
    updateParam("methods", next.join(","));
  };

  return (
    <aside className="space-y-8 pr-6">
      <div>
        <p className="label-editorial mb-3">Size</p>
        <ul className="space-y-2">
          {sizes.map((size) => (
            <li key={size}>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentSizes.includes(size)}
                  onChange={() => toggleSize(size)}
                  className="accent-[#0D1B3E]"
                />
                <span>{size}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="label-editorial mb-3">Testing Method</p>
        <ul className="space-y-2">
          {testingMethods.map((method) => (
            <li key={method}>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentMethods.includes(method)}
                  onChange={() => toggleMethod(method)}
                  className="accent-[#0D1B3E]"
                />
                <span>{method}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => updateParam("instock", e.target.checked ? "1" : null)}
            className="accent-[#0D1B3E]"
          />
          <span>In stock only</span>
        </label>
      </div>
      {(currentSizes.length > 0 || currentMethods.length > 0 || inStockOnly) && (
        <button
          type="button"
          onClick={() => router.replace(pathname, { scroll: false })}
          className="text-xs underline text-[#6B7280] hover:text-[#0D1B3E]"
        >
          Clear filters
        </button>
      )}
    </aside>
  );
}
```

- [ ] **Step 2: Create ProductListingPage (Server Component)**

```tsx
// components/storefront/products/ProductListingPage.tsx
import Link from "next/link";
import { getProducts } from "@/lib/products";
import type { ProductCategory, Product } from "@/types";
import { ProductCard } from "./ProductCard";
import { ProductFilters } from "./ProductFilters";

type ListingPageProps = {
  category: ProductCategory;
  categoryLabel: string;
  categoryDescription: string;
  searchParams: { [key: string]: string | undefined };
};

function applyFilters(
  products: Product[],
  params: ListingPageProps["searchParams"]
): Product[] {
  const sizes = params.sizes?.split(",").filter(Boolean) ?? [];
  const methods = params.methods?.split(",").filter(Boolean) ?? [];
  const inStockOnly = params.instock === "1";
  const sort = params.sort ?? "newest";

  let filtered = products.filter((p) => {
    if (sizes.length > 0) {
      const productSizes = p.variants.map((v) => v.size);
      if (!sizes.some((s) => productSizes.includes(s))) return false;
    }
    if (methods.length > 0 && !methods.includes(p.testingMethod)) {
      return false;
    }
    if (inStockOnly) {
      const totalStock = p.variants.reduce((sum, v) => sum + v.stock, 0);
      if (totalStock === 0) return false;
    }
    return true;
  });

  if (sort === "name-asc") {
    filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === "price-asc") {
    filtered = [...filtered].sort((a, b) => {
      const aPrice = Math.min(...a.variants.map((v) => v.priceInPence));
      const bPrice = Math.min(...b.variants.map((v) => v.priceInPence));
      return aPrice - bPrice;
    });
  } else if (sort === "price-desc") {
    filtered = [...filtered].sort((a, b) => {
      const aPrice = Math.min(...a.variants.map((v) => v.priceInPence));
      const bPrice = Math.min(...b.variants.map((v) => v.priceInPence));
      return bPrice - aPrice;
    });
  }
  return filtered;
}

export async function ProductListingPage({
  category,
  categoryLabel,
  categoryDescription,
  searchParams,
}: ListingPageProps) {
  const allProducts = await getProducts({ category, activeOnly: true });
  const filtered = applyFilters(allProducts, searchParams);

  const availableSizes = Array.from(
    new Set(allProducts.flatMap((p) => p.variants.map((v) => v.size)))
  ).sort();
  const availableMethods = Array.from(
    new Set(allProducts.map((p) => p.testingMethod))
  );

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-12">
      <nav aria-label="Breadcrumb" className="label-editorial mb-6">
        <Link href="/" className="hover:text-[#0D1B3E]">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-[#0D1B3E]">{categoryLabel}</span>
      </nav>
      <h1 className="text-5xl mb-3 leading-tight">{categoryLabel}</h1>
      <p className="text-lg text-[#6B7280] max-w-2xl mb-12">{categoryDescription}</p>
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
        <ProductFilters sizes={availableSizes} testingMethods={availableMethods} />
        <div>
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-[#6B7280]">
              {filtered.length} {filtered.length === 1 ? "product" : "products"}
            </p>
          </div>
          {filtered.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-[#DDE1E7]">
              <p className="font-serif text-2xl text-[#0D1B3E] mb-2">No products match your filters</p>
              <p className="text-sm text-[#6B7280]">Try clearing some filters to see more results.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add ProductListingPage and ProductFilters with URL query-param state"
```

---

## Task 6: Create the three category route wrappers

**Files:**
- Create: `app/(public)/peptides/page.tsx`
- Create: `app/(public)/capsules/page.tsx`
- Create: `app/(public)/mixers/page.tsx`
- Create: `app/(public)/layout.tsx`

- [ ] **Step 1: Create the `(public)` route group layout (pass-through)**

```tsx
// app/(public)/layout.tsx
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
```

- [ ] **Step 2: Create `/peptides` route**

```tsx
// app/(public)/peptides/page.tsx
import { ProductListingPage } from "@/components/storefront/products/ProductListingPage";

export default async function PeptidesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  return (
    <ProductListingPage
      category="peptides"
      categoryLabel="Research Peptides"
      categoryDescription="HPLC-tested peptide compounds supplied with a Certificate of Analysis for every batch. Sold strictly for laboratory research use."
      searchParams={params}
    />
  );
}

export const metadata = {
  title: "Research Peptides",
  description:
    "Research-grade peptides for UK laboratories. Every compound HPLC-tested with a downloadable Certificate of Analysis. For laboratory research use only.",
};
```

- [ ] **Step 3: Create `/capsules` route**

```tsx
// app/(public)/capsules/page.tsx
import { ProductListingPage } from "@/components/storefront/products/ProductListingPage";

export default async function CapsulesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  return (
    <ProductListingPage
      category="capsules"
      categoryLabel="Research Capsules"
      categoryDescription="Research-grade capsule formulations supplied with a Certificate of Analysis for every batch. Sold strictly for laboratory research use."
      searchParams={params}
    />
  );
}

export const metadata = {
  title: "Research Capsules",
  description:
    "Research-grade capsules for UK laboratories. Every formulation tested and documented. For laboratory research use only.",
};
```

- [ ] **Step 4: Create `/mixers` route**

```tsx
// app/(public)/mixers/page.tsx
import { ProductListingPage } from "@/components/storefront/products/ProductListingPage";

export default async function MixersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  return (
    <ProductListingPage
      category="mixers"
      categoryLabel="Mixers & Solvents"
      categoryDescription="Laboratory-grade bacteriostatic water and sterile saline for reconstitution in research protocols. For laboratory research use only."
      searchParams={params}
    />
  );
}

export const metadata = {
  title: "Mixers & Solvents",
  description:
    "Laboratory-grade mixers and solvents for UK research. Bacteriostatic water and sterile saline for reconstitution in research contexts.",
};
```

- [ ] **Step 5: Verify dev server**

```bash
npm run dev
```

Visit `http://localhost:3000/peptides`, `/capsules`, `/mixers` and confirm the listing pages render with the seeded products.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add category listing routes for peptides, capsules, mixers"
```

---

## Task 7: Create VariantSelector component

**Files:**
- Create: `components/storefront/products/VariantSelector.tsx`

- [ ] **Step 1: Write VariantSelector**

```tsx
// components/storefront/products/VariantSelector.tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Product, ProductVariant } from "@/types";
import { useBasket, formatPriceFromPence } from "@/lib/basket";

export function VariantSelector({ product }: { product: Product }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { addItem, openDrawer } = useBasket();

  const initialSize = searchParams.get("size");
  const initialVariant =
    product.variants.find((v) => v.size === initialSize && v.active) ??
    product.variants.find((v) => v.active) ??
    product.variants[0];

  const [selectedSku, setSelectedSku] = useState<string>(initialVariant.sku);
  const selected: ProductVariant =
    product.variants.find((v) => v.sku === selectedSku) ?? initialVariant;

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (selected.size !== searchParams.get("size")) {
      params.set("size", selected.size);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [selected.size, router, pathname, searchParams]);

  const handleAdd = () => {
    addItem(product, selected.sku, 1);
    openDrawer();
  };

  const outOfStock = selected.stock === 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="label-editorial mb-2">Size</p>
        <div className="flex flex-wrap gap-2">
          {product.variants.map((variant) => {
            const isSelected = variant.sku === selectedSku;
            const unavailable = !variant.active || variant.stock === 0;
            return (
              <button
                key={variant.sku}
                type="button"
                onClick={() => !unavailable && setSelectedSku(variant.sku)}
                disabled={unavailable}
                className={`px-5 py-2 border text-sm transition-colors ${
                  isSelected
                    ? "bg-[#0D1B3E] text-white border-[#0D1B3E]"
                    : unavailable
                    ? "border-[#DDE1E7] text-[#6B7280] line-through cursor-not-allowed"
                    : "border-[#DDE1E7] hover:border-[#0D1B3E]"
                }`}
                aria-pressed={isSelected}
              >
                {variant.size}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className="text-3xl font-medium text-[#0D1B3E]">
          {formatPriceFromPence(selected.priceInPence)}
        </p>
        {selected.stock > 0 && selected.stock <= 5 && (
          <p className="text-xs text-amber-700 mt-1">
            Low stock — {selected.stock} remaining
          </p>
        )}
        {outOfStock && (
          <p className="text-xs text-red-700 mt-1">Out of stock</p>
        )}
      </div>
      <button
        type="button"
        onClick={handleAdd}
        disabled={outOfStock}
        className="w-full py-4 bg-[#0D1B3E] text-white uppercase tracking-wider text-sm hover:bg-[#162040] disabled:bg-[#6B7280] disabled:cursor-not-allowed"
      >
        {outOfStock ? "Out of stock" : "Add to basket"}
      </button>
      {selected.coaUrl && (
        <a
          href={selected.coaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-3 border border-[#DDE1E7] text-center uppercase tracking-wider text-xs hover:bg-[#F7F8FA]"
        >
          Download Certificate of Analysis
        </a>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add variant selector with URL query sync and basket integration"
```

---

## Task 8: Create ProductDetail, ResearchDisclaimerCallout, ProductFAQ components

**Files:**
- Create: `components/storefront/products/ResearchDisclaimerCallout.tsx`
- Create: `components/storefront/products/ProductFAQ.tsx`
- Create: `components/storefront/products/ProductDetail.tsx`

- [ ] **Step 1: Create ResearchDisclaimerCallout**

```tsx
// components/storefront/products/ResearchDisclaimerCallout.tsx
export function ResearchDisclaimerCallout() {
  return (
    <div className="bg-[#FFF3CD] border border-[#E6C97A] p-5 mt-6">
      <p className="label-editorial text-[#6A4D00] mb-2">
        Laboratory research use only
      </p>
      <p className="text-sm text-[#6A4D00] leading-relaxed">
        Not for human or animal consumption. Sold exclusively for use in
        controlled laboratory research settings.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create ProductFAQ**

```tsx
// components/storefront/products/ProductFAQ.tsx
import type { ProductFaqItem } from "@/types";

export function ProductFAQ({ items }: { items: ProductFaqItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mt-16">
      <h2 className="text-3xl mb-8">Research FAQ</h2>
      <div className="space-y-8">
        {items.map((item, idx) => (
          <div key={idx} className="border-b border-[#DDE1E7] pb-8 last:border-0">
            <h3 className="font-serif text-xl text-[#0D1B3E] mb-3">
              {item.question}
            </h3>
            <p className="text-[#333333] leading-relaxed">{item.answer}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Create ProductDetail**

```tsx
// components/storefront/products/ProductDetail.tsx
import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/types";
import { VariantSelector } from "./VariantSelector";
import { ResearchDisclaimerCallout } from "./ResearchDisclaimerCallout";
import { ProductFAQ } from "./ProductFAQ";
import { ProductCard } from "./ProductCard";
import { getProducts } from "@/lib/products";

export async function ProductDetail({ product }: { product: Product }) {
  const primaryImage = product.images[product.primaryImageIndex] ?? product.images[0];
  const categoryLabel =
    product.category === "peptides"
      ? "Research Peptides"
      : product.category === "capsules"
      ? "Research Capsules"
      : "Mixers & Solvents";

  const related = (await getProducts({ category: product.category, activeOnly: true }))
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-12">
      <nav aria-label="Breadcrumb" className="label-editorial mb-6">
        <Link href="/" className="hover:text-[#0D1B3E]">Home</Link>
        <span className="mx-2">/</span>
        <Link href={`/${product.category}`} className="hover:text-[#0D1B3E]">
          {categoryLabel}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[#0D1B3E]">{product.name}</span>
      </nav>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
          <div className="relative aspect-square bg-[#F7F8FA] border border-[#DDE1E7]">
            {primaryImage && (
              <Image
                src={primaryImage}
                alt={`${product.name} research peptide vial`}
                fill
                className="object-contain p-12"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            )}
          </div>
        </div>
        <div>
          <p className="label-editorial mb-2">{categoryLabel}</p>
          <h1 className="text-5xl leading-tight mb-4">{product.name}</h1>
          <p className="mono text-sm text-[#6B7280] mb-6">
            CAS {product.casNumber} · {product.molecularFormula} · {product.molecularWeight}
          </p>
          <div className="flex gap-3 mb-8">
            <div className="px-3 py-1 border border-[#DDE1E7]">
              <p className="label-editorial text-[10px] mb-0.5">Purity</p>
              <p className="text-sm">{product.purity}</p>
            </div>
            <div className="px-3 py-1 border border-[#DDE1E7]">
              <p className="label-editorial text-[10px] mb-0.5">Tested</p>
              <p className="text-sm">{product.testingMethod}</p>
            </div>
          </div>
          <VariantSelector product={product} />
          <ResearchDisclaimerCallout />
        </div>
      </div>

      <section className="mt-16 max-w-3xl">
        <h2 className="text-3xl mb-6">About {product.name}</h2>
        <div className="prose prose-lg max-w-none text-[#333333] leading-relaxed">
          {product.fullDescription.split("\n\n").map((para, i) => (
            <p key={i} className="mb-4">{para}</p>
          ))}
        </div>
      </section>

      <section className="mt-16 max-w-3xl">
        <h2 className="text-3xl mb-6">Chemical information</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 border-t border-[#DDE1E7] pt-6">
          <div><dt className="label-editorial">CAS Number</dt><dd className="mono">{product.casNumber}</dd></div>
          <div><dt className="label-editorial">Molecular Formula</dt><dd className="mono">{product.molecularFormula}</dd></div>
          <div><dt className="label-editorial">Molecular Weight</dt><dd className="mono">{product.molecularWeight}</dd></div>
          <div><dt className="label-editorial">Purity</dt><dd>{product.purity}</dd></div>
          <div><dt className="label-editorial">Testing Method</dt><dd>{product.testingMethod}</dd></div>
          {product.synonyms.length > 0 && (
            <div className="sm:col-span-2"><dt className="label-editorial">Synonyms</dt><dd>{product.synonyms.join(", ")}</dd></div>
          )}
        </dl>
      </section>

      <ProductFAQ items={product.faq} />

      {related.length > 0 && (
        <section className="mt-24">
          <h2 className="text-3xl mb-8">Other research peptides</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add product detail component with variant selector, FAQ, related"
```

---

## Task 9: Create product detail dynamic routes with generateStaticParams

**Files:**
- Create: `app/(public)/peptides/[slug]/page.tsx`
- Create: `app/(public)/capsules/[slug]/page.tsx`
- Create: `app/(public)/mixers/[slug]/page.tsx`

- [ ] **Step 1: Create helper for the detail route factory**

Create `app/(public)/peptides/[slug]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { getProductBySlug, getProducts } from "@/lib/products";
import { ProductDetail } from "@/components/storefront/products/ProductDetail";

export async function generateStaticParams() {
  const products = await getProducts({ category: "peptides", activeOnly: true });
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || product.category !== "peptides") return {};
  return {
    title: `${product.name} — Research Peptide`,
    description: `Research-grade ${product.name} (CAS ${product.casNumber}, ${product.molecularFormula}). HPLC-tested, ${product.purity} purity. Certificate of Analysis included. For laboratory research use only.`,
  };
}

export default async function PeptideDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || product.category !== "peptides") notFound();
  return <ProductDetail product={product} />;
}
```

- [ ] **Step 2: Create the equivalent for `/capsules/[slug]`**

```tsx
// app/(public)/capsules/[slug]/page.tsx
import { notFound } from "next/navigation";
import { getProductBySlug, getProducts } from "@/lib/products";
import { ProductDetail } from "@/components/storefront/products/ProductDetail";

export async function generateStaticParams() {
  const products = await getProducts({ category: "capsules", activeOnly: true });
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || product.category !== "capsules") return {};
  return {
    title: `${product.name} — Research Capsule`,
    description: `Research-grade ${product.name}. ${product.purity} purity, ${product.testingMethod} tested. Certificate of Analysis included. For laboratory research use only.`,
  };
}

export default async function CapsuleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || product.category !== "capsules") notFound();
  return <ProductDetail product={product} />;
}
```

- [ ] **Step 3: Create `/mixers/[slug]`**

```tsx
// app/(public)/mixers/[slug]/page.tsx
import { notFound } from "next/navigation";
import { getProductBySlug, getProducts } from "@/lib/products";
import { ProductDetail } from "@/components/storefront/products/ProductDetail";

export async function generateStaticParams() {
  const products = await getProducts({ category: "mixers", activeOnly: true });
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || product.category !== "mixers") return {};
  return {
    title: `${product.name} — Laboratory Mixer`,
    description: `${product.name} for laboratory research. ${product.purity} purity, ${product.testingMethod} tested. For laboratory research use only.`,
  };
}

export default async function MixerDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || product.category !== "mixers") notFound();
  return <ProductDetail product={product} />;
}
```

- [ ] **Step 4: Verify build generates all detail pages statically**

```bash
npm run build
```

Expected: build logs show each product slug being statically generated, e.g. `/peptides/bpc-157 (SSG)`, `/peptides/tb-500 (SSG)`, etc.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add SSG product detail routes for all three categories"
```

---

## Task 10: Create homepage with hero, categories, trust row, featured, research framing

**Files:**
- Modify: `app/(public)/page.tsx` (move from `app/page.tsx`)
- Delete: `app/page.tsx` (replaced by `(public)/page.tsx`)

- [ ] **Step 1: Move the homepage into the `(public)` route group**

```bash
mv app/page.tsx app/\(public\)/page.tsx
```

- [ ] **Step 2: Replace contents with the full homepage**

```tsx
// app/(public)/page.tsx
import Link from "next/link";
import Image from "next/image";
import { getFeaturedProducts } from "@/lib/products";
import { ProductCard } from "@/components/storefront/products/ProductCard";

export default async function HomePage() {
  const featured = await getFeaturedProducts(6);

  return (
    <div>
      {/* Hero */}
      <section className="max-w-[1280px] mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div>
          <p className="label-editorial mb-4">UK Research Supply</p>
          <h1 className="text-5xl md:text-6xl leading-tight mb-6">
            Research-grade peptides,
            <br />
            documented to the batch.
          </h1>
          <p className="text-lg text-[#333333] leading-relaxed mb-8 max-w-xl">
            HPLC-tested compounds with a downloadable Certificate of Analysis
            for every SKU. Supplied strictly for laboratory research use.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/peptides"
              className="px-8 py-3 bg-[#0D1B3E] text-white uppercase tracking-wider text-sm hover:bg-[#162040] text-center"
            >
              Shop peptides
            </Link>
            <Link
              href="/about"
              className="px-8 py-3 border border-[#DDE1E7] text-[#0D1B3E] uppercase tracking-wider text-sm hover:bg-[#F7F8FA] text-center"
            >
              Our testing process
            </Link>
          </div>
        </div>
        <div className="relative aspect-square bg-[#F7F8FA] border border-[#DDE1E7]">
          <Image
            src="/placeholder-vial.svg"
            alt="Research peptide vial on white background"
            fill
            className="object-contain p-16"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-[1280px] mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { slug: "peptides", label: "Research Peptides", description: "HPLC-tested peptide compounds for laboratory research." },
            { slug: "capsules", label: "Research Capsules", description: "Encapsulated formulations supplied with batch documentation." },
            { slug: "mixers", label: "Mixers & Solvents", description: "Laboratory-grade bacteriostatic water and sterile saline." },
          ].map((cat) => (
            <Link
              key={cat.slug}
              href={`/${cat.slug}`}
              className="block bg-white border border-[#DDE1E7] p-8 hover:border-[#0D1B3E] transition-colors"
            >
              <p className="label-editorial mb-3">Category</p>
              <h2 className="font-serif text-2xl text-[#0D1B3E] mb-3">{cat.label}</h2>
              <p className="text-sm text-[#6B7280] mb-4">{cat.description}</p>
              <p className="label-editorial text-[#0D1B3E]">View all →</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Trust row */}
      <section className="bg-white border-y border-[#DDE1E7] py-12">
        <div className="max-w-[1280px] mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: "HPLC Tested", value: "Every batch" },
            { label: "≥98% Purity", value: "Documented on COA" },
            { label: "UK Research Grade", value: "Sourced and tested in Britain" },
            { label: "Certificate of Analysis", value: "Downloadable for every SKU" },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <p className="label-editorial mb-2">{item.label}</p>
              <p className="text-sm text-[#6B7280]">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="max-w-[1280px] mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl">Recently added</h2>
          <Link href="/peptides" className="label-editorial hover:text-[#0D1B3E]">
            View all peptides →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Research framing */}
      <section className="max-w-[1280px] mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl mb-6">Supplied for research. Documented for rigour.</h2>
        <p className="max-w-3xl mx-auto text-[#333333] leading-relaxed mb-6">
          Every product sold on this site is intended exclusively for use in
          controlled laboratory research settings. We publish a Certificate of
          Analysis for every batch, supplied with every order, so that the
          researchers who rely on our compounds have the documentation they need.
          None of our products is sold for human or veterinary consumption.
        </p>
        <Link href="/legal/research-use" className="label-editorial hover:text-[#0D1B3E]">
          Read our research-use policy →
        </Link>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Verify dev server**

```bash
npm run dev
```

Visit `http://localhost:3000` — full homepage should render with all five sections.

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: successful build.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: build full homepage with hero, categories, trust, featured, research framing"
```

---

## Task 11: Create basket page and stub checkout route

**Files:**
- Create: `app/(public)/basket/page.tsx`
- Create: `app/(public)/checkout/page.tsx`

- [ ] **Step 1: Create basket page**

```tsx
// app/(public)/basket/page.tsx
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
```

- [ ] **Step 2: Create stub checkout route**

```tsx
// app/(public)/checkout/page.tsx
export default function CheckoutStubPage() {
  return (
    <div className="max-w-xl mx-auto px-6 py-24 text-center">
      <h1 className="text-4xl mb-4">Checkout</h1>
      <p className="text-[#6B7280]">
        The full checkout flow (delivery, research confirmation, stub payment,
        confirmation) is implemented in Plan 3. This page is a placeholder for now.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Verify typecheck and dev server**

```bash
npx tsc --noEmit
npm run dev
```

Visit `/basket` with and without items in the basket.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add basket page and stub checkout route"
```

---

## Task 12: Create About, Contact, Product Information pages

**Files:**
- Create: `app/(public)/about/page.tsx`
- Create: `app/(public)/contact/page.tsx`
- Create: `app/(public)/product-information/page.tsx`
- Create: `app/actions/contact.ts`

- [ ] **Step 1: Create About page with placeholder content**

```tsx
// app/(public)/about/page.tsx
export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <p className="label-editorial mb-4">About</p>
      <h1 className="text-5xl mb-8 leading-tight">Research supply, done carefully.</h1>
      <div className="prose prose-lg max-w-none text-[#333333] leading-relaxed space-y-6">
        <p className="text-xl">
          [DRAFT — TO BE ADAPTED BY SAM] We supply research-grade peptides,
          capsules, and laboratory mixers to researchers across the United
          Kingdom. Every product we sell is intended exclusively for controlled
          laboratory research and is supplied with a Certificate of Analysis.
        </p>
        <h2 className="text-3xl mt-12">Our approach</h2>
        <p>
          [DRAFT] We work with compounds that appear in current research
          literature, source them from manufacturers we have vetted for
          documentation and process quality, and verify purity before releasing
          any batch for sale. This section will be drafted in Plan 5 and
          reviewed by Sam's solicitor before launch.
        </p>
        <h2 className="text-3xl mt-12">Our testing process</h2>
        <p>
          [DRAFT] Every batch we receive is independently tested by HPLC (high-
          performance liquid chromatography) before being listed for sale. The
          Certificate of Analysis for each variant is available for download
          from its product page.
        </p>
        <h2 className="text-3xl mt-12">Our commitment to research use</h2>
        <p>
          [DRAFT] We do not sell products for human or veterinary consumption,
          and we do not provide dosage guidance, therapeutic claims, or
          application advice. Our customers are researchers; our role is to
          supply them with documented research-grade compounds.
        </p>
      </div>
    </div>
  );
}

export const metadata = {
  title: "About",
  description: "Who we are, our testing process, and our commitment to research use.",
};
```

- [ ] **Step 2: Create Contact form Server Action**

```typescript
// app/actions/contact.ts
"use server";

import { z } from "zod";

const ContactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export type ContactFormState = {
  status: "idle" | "success" | "error";
  errors?: Partial<Record<"name" | "email" | "subject" | "message", string>>;
  generalError?: string;
};

export async function submitContactForm(
  _prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const parsed = ContactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    const errors: ContactFormState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof NonNullable<ContactFormState["errors"]>;
      if (field) errors[field] = issue.message;
    }
    return { status: "error", errors };
  }

  // TODO in Plan 3: write to Firestore enquiries collection via Admin SDK
  // TODO in Plan 3: send Resend confirmation email to customer
  // TODO in Plan 3: send Resend notification email to Sam

  console.log("[Contact form submission]", parsed.data);
  return { status: "success" };
}
```

- [ ] **Step 3: Install zod**

```bash
npm install zod
```

- [ ] **Step 4: Create Contact page**

```tsx
// app/(public)/contact/page.tsx
"use client";

import { useActionState } from "react";
import { submitContactForm, type ContactFormState } from "@/app/actions/contact";

const initialState: ContactFormState = { status: "idle" };

export default function ContactPage() {
  const [state, formAction, pending] = useActionState(submitContactForm, initialState);

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <p className="label-editorial mb-4">Contact</p>
      <h1 className="text-5xl mb-4 leading-tight">Get in touch</h1>
      <p className="text-lg text-[#6B7280] mb-12">
        Questions about our products, COAs, shipping, or anything else — send
        us a message and we'll respond within one working day.
      </p>

      {state.status === "success" ? (
        <div className="bg-[#DCFCE7] border border-[#166534] p-6">
          <p className="label-editorial text-[#166534] mb-2">Message received</p>
          <p className="text-sm text-[#166534]">
            Thanks for getting in touch. We'll reply to the email address you
            provided within one working day.
          </p>
        </div>
      ) : (
        <form action={formAction} className="space-y-6">
          <div>
            <label htmlFor="name" className="label-editorial block mb-2">Name</label>
            <input id="name" name="name" type="text" required className="w-full border border-[#DDE1E7] p-3" />
            {state.errors?.name && <p className="text-xs text-red-700 mt-1">{state.errors.name}</p>}
          </div>
          <div>
            <label htmlFor="email" className="label-editorial block mb-2">Email</label>
            <input id="email" name="email" type="email" required className="w-full border border-[#DDE1E7] p-3" />
            {state.errors?.email && <p className="text-xs text-red-700 mt-1">{state.errors.email}</p>}
          </div>
          <div>
            <label htmlFor="subject" className="label-editorial block mb-2">Subject</label>
            <input id="subject" name="subject" type="text" required className="w-full border border-[#DDE1E7] p-3" />
            {state.errors?.subject && <p className="text-xs text-red-700 mt-1">{state.errors.subject}</p>}
          </div>
          <div>
            <label htmlFor="message" className="label-editorial block mb-2">Message</label>
            <textarea id="message" name="message" rows={6} required className="w-full border border-[#DDE1E7] p-3" />
            {state.errors?.message && <p className="text-xs text-red-700 mt-1">{state.errors.message}</p>}
          </div>
          {state.status === "error" && state.generalError && (
            <p className="text-sm text-red-700">{state.generalError}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="px-8 py-3 bg-[#0D1B3E] text-white uppercase tracking-wider text-sm hover:bg-[#162040] disabled:bg-[#6B7280]"
          >
            {pending ? "Sending..." : "Send message"}
          </button>
        </form>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create Product Information page**

```tsx
// app/(public)/product-information/page.tsx
export default function ProductInformationPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <p className="label-editorial mb-4">Product Information</p>
      <h1 className="text-5xl mb-8 leading-tight">Product information and labelling</h1>
      <div className="prose prose-lg max-w-none text-[#333333] leading-relaxed space-y-6">
        <p className="text-xl">
          [DRAFT — TO BE FULLY WRITTEN IN PLAN 5] This page explains our
          product categories, testing standards, how to read a Certificate of
          Analysis, and what "research use only" means in practice.
        </p>
        <h2 className="text-3xl mt-12">Product categories</h2>
        <p>[DRAFT] Peptides, capsules, and mixers explained.</p>
        <h2 className="text-3xl mt-12">How HPLC testing works</h2>
        <p>[DRAFT] High-performance liquid chromatography overview.</p>
        <h2 className="text-3xl mt-12">How to read a Certificate of Analysis</h2>
        <p>[DRAFT] Fields on a COA and what each means.</p>
        <h2 className="text-3xl mt-12">What "research use only" means</h2>
        <p>[DRAFT] The legal framework and our position.</p>
      </div>
    </div>
  );
}

export const metadata = {
  title: "Product Information",
  description:
    "Product categories, testing standards, how to read a Certificate of Analysis, and what research use only means.",
};
```

- [ ] **Step 6: Verify build**

```bash
npm run build
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add About, Contact (with Server Action), Product Information pages"
```

---

## Task 13: Create LegalPage component and six legal routes with review gate

**Files:**
- Create: `content/legal/terms.md`
- Create: `content/legal/privacy.md`
- Create: `content/legal/cookies.md`
- Create: `content/legal/refunds.md`
- Create: `content/legal/shipping.md`
- Create: `content/legal/research-use.md`
- Create: `components/storefront/legal/LegalPage.tsx`
- Create: `app/(public)/legal/[slug]/page.tsx`

- [ ] **Step 1: Create the content directory and six placeholder markdown files**

```bash
mkdir -p content/legal
```

Create `content/legal/terms.md`:

```markdown
---
slug: terms
title: Terms and Conditions
updated: 2026-04-13
reviewed: false
---

# Terms and Conditions

**[PLACEHOLDER — PENDING SOLICITOR REVIEW]**

This document will contain the full Terms and Conditions for the site,
drafted based on industry-standard UK e-commerce and research-chemical
supplier templates. The full draft will be written in Plan 5 and reviewed
by Sam's solicitor before launch.

Provisions to be included:

- UK law jurisdiction
- Research-only warranty language
- Limitation of liability
- Prohibited uses clause
- Age verification requirement
- Returns and refund policy reference
- Dispute resolution
```

Create `content/legal/privacy.md`:

```markdown
---
slug: privacy
title: Privacy Policy
updated: 2026-04-13
reviewed: false
---

# Privacy Policy

**[PLACEHOLDER — PENDING SOLICITOR REVIEW]**

This document will contain the full Privacy Policy for the site, drafted
to be GDPR-compliant with Firebase named as the data processor. The full
draft will be written in Plan 5.

Provisions to be included:

- Data controller identity (Sam's business)
- Lawful basis for each data collection point
- Data subject rights (access, rectification, erasure, portability)
- Retention periods for customer and order data
- International data transfers (Firebase in europe-west2)
- Cookie usage reference
- ICO registration reference
```

Create `content/legal/cookies.md`:

```markdown
---
slug: cookies
title: Cookie Policy
updated: 2026-04-13
reviewed: false
---

# Cookie Policy

**[PLACEHOLDER — PENDING SOLICITOR REVIEW]**

This document will explain the cookies we use and how visitors can manage
their preferences. The full draft will be written in Plan 5.

Cookies used by this site:

- `age_verified` — strictly necessary, records age gate confirmation
- `cookie_consent` — strictly necessary, records cookie preferences
- Firebase Auth session cookies — strictly necessary for logged-in users
- Vercel Analytics — only loaded with explicit consent
```

Create `content/legal/refunds.md`:

```markdown
---
slug: refunds
title: Refund and Returns Policy
updated: 2026-04-13
reviewed: false
---

# Refund and Returns Policy

**[PLACEHOLDER — PENDING SOLICITOR REVIEW]**

This document will set out our refund and returns policy, drafted to
reflect that research chemicals cannot be accepted back for safety and
chain-of-custody reasons. The full draft will be written in Plan 5.

Provisions to be included:

- No returns or refunds on opened or dispatched research chemicals
- 14-day cancellation right for unopened orders under the UK Consumer
  Contracts Regulations 2013
- Damaged-in-transit claims procedure
- Process for reporting incorrect items received
```

Create `content/legal/shipping.md`:

```markdown
---
slug: shipping
title: Shipping Policy
updated: 2026-04-13
reviewed: false
---

# Shipping Policy

**[PLACEHOLDER — PENDING SOLICITOR REVIEW]**

This document will explain our shipping policies including dispatch
timelines, carriers, and tracking. The full draft will be written in Plan 5.

To be confirmed with Sam:

- Dispatch timeframe (e.g. "within 1 working day of payment")
- Carrier (Royal Mail, Sendcloud, or Shippo — TBD in Phase 3)
- Tracking information provision
- UK-only shipping in Phase 1
```

Create `content/legal/research-use.md`:

```markdown
---
slug: research-use
title: Research Use Only Statement
updated: 2026-04-13
reviewed: false
---

# Research Use Only Statement

**[PLACEHOLDER — PENDING SOLICITOR REVIEW]**

This document will contain our plain-language statement on research use
only, explaining what we do and do not claim for our products. The full
draft will be written in Plan 5 and is the most important legal page on
the site.

Provisions to be included:

- Explicit statement that all products are for laboratory research use
- Explicit disclaimer that products are not for human or animal consumption
- No therapeutic claims, no dosage guidance, no clinical statements
- Our commitment to sourcing and testing documentation
- Who our customers are (researchers, labs, institutions)
- Legal framework under which we operate
```

- [ ] **Step 2: Create LegalPage component**

```tsx
// components/storefront/legal/LegalPage.tsx
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { notFound } from "next/navigation";

type LegalFrontmatter = {
  slug: string;
  title: string;
  updated: string;
  reviewed: boolean;
};

export async function getLegalPage(slug: string): Promise<{
  frontmatter: LegalFrontmatter;
  content: string;
} | null> {
  const filePath = path.join(process.cwd(), "content", "legal", `${slug}.md`);
  try {
    const file = await fs.readFile(filePath, "utf-8");
    const { data, content } = matter(file);
    return {
      frontmatter: data as LegalFrontmatter,
      content,
    };
  } catch {
    return null;
  }
}

export async function getAllLegalSlugs(): Promise<string[]> {
  const dir = path.join(process.cwd(), "content", "legal");
  const files = await fs.readdir(dir);
  return files.filter((f) => f.endsWith(".md")).map((f) => f.replace(".md", ""));
}

export async function LegalPage({ slug }: { slug: string }) {
  const page = await getLegalPage(slug);
  if (!page) notFound();

  const { frontmatter, content } = page;

  return (
    <article className="max-w-3xl mx-auto px-6 py-16">
      {!frontmatter.reviewed && (
        <div className="bg-[#FFF3CD] border border-[#E6C97A] p-4 mb-8">
          <p className="label-editorial text-[#6A4D00] mb-1">
            ⚠️ Placeholder — pending solicitor review
          </p>
          <p className="text-xs text-[#6A4D00]">
            This page contains draft text based on industry-standard templates.
            It has not been reviewed by a UK regulatory solicitor and must not
            be relied upon as legal advice. Replace before launch.
          </p>
        </div>
      )}
      <p className="label-editorial mb-4">Legal</p>
      <h1 className="text-5xl mb-2 leading-tight">{frontmatter.title}</h1>
      <p className="text-sm text-[#6B7280] mb-12">
        Last updated: {frontmatter.updated}
      </p>
      <div className="prose prose-lg max-w-none text-[#333333] leading-[1.75]">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </article>
  );
}
```

- [ ] **Step 3: Create dynamic legal route**

```tsx
// app/(public)/legal/[slug]/page.tsx
import { LegalPage, getAllLegalSlugs, getLegalPage } from "@/components/storefront/legal/LegalPage";

export async function generateStaticParams() {
  const slugs = await getAllLegalSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getLegalPage(slug);
  if (!page) return {};
  return { title: page.frontmatter.title };
}

export default async function LegalSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <LegalPage slug={slug} />;
}
```

- [ ] **Step 4: Verify build generates all six legal pages**

```bash
npm run build
```

Expected: build logs show `/legal/terms`, `/legal/privacy`, `/legal/cookies`, `/legal/refunds`, `/legal/shipping`, `/legal/research-use` all generated.

- [ ] **Step 5: Visual verification**

```bash
npm run dev
```

Visit `/legal/terms`, confirm the placeholder banner renders prominently at the top with the amber colour. Repeat for the other five pages.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add legal pages with markdown content and review-gate banner"
```

---

## Task 14: End-to-end storefront smoke test

**Files:** (none — verification only)

- [ ] **Step 1: Run dev server**

```bash
npm run dev
```

- [ ] **Step 2: Walk the full storefront and tick each item after visual confirmation**

- [ ] Homepage loads with hero, category cards, trust row, 6 featured products, research framing paragraph
- [ ] Clicking "Shop peptides" navigates to `/peptides` with listing
- [ ] Filter by size (e.g. 5mg) reduces the product grid correctly; URL reflects filter as `?sizes=5mg`
- [ ] Filter by testing method reduces the grid; URL reflects it as `?methods=HPLC`
- [ ] In-stock-only toggle works; URL reflects it as `?instock=1`
- [ ] Clicking a product card navigates to the detail page
- [ ] Product detail page shows breadcrumb, gallery, chemistry data row in mono, variant selector, price, add to basket button, research disclaimer, full description, chemical info block, FAQ, related products
- [ ] Clicking a variant updates the price and updates the URL query param `?size=5mg`
- [ ] Sharing the URL with `?size=5mg` and visiting in a fresh browser session lands on the same variant selected
- [ ] Clicking "Add to basket" opens the basket drawer with the item visible
- [ ] Quantity + and − buttons update the quantity and subtotal
- [ ] Remove button removes the item
- [ ] Closing the drawer and opening the basket icon re-shows the basket
- [ ] `/basket` page renders full-width with same items
- [ ] `/checkout` shows the stub placeholder
- [ ] `/about` renders with placeholder content
- [ ] `/contact` form accepts input; submitting with valid fields shows success state
- [ ] Submitting with invalid fields (e.g. missing email) shows field errors
- [ ] `/product-information` renders with placeholder content
- [ ] `/legal/terms` renders the placeholder banner at top + content below
- [ ] All six legal routes render correctly
- [ ] Navbar stays sticky below compliance banner across all pages
- [ ] Footer appears at the bottom of every page with four columns
- [ ] Cookie consent banner no longer appears (consent was given in Plan 1)

- [ ] **Step 3: Run production build**

```bash
npm run build
```

Expected: successful build. All product detail pages statically generated.

- [ ] **Step 4: Commit the milestone**

```bash
git add -A
git commit -m "feat: Plan 2 storefront milestone — full browsable public site against seed data"
```

---

## Plan 2 completion summary

At this point the storefront should have:

- Zustand basket store with localStorage persistence
- BasketDrawer, BasketItem, BasketIconButton wired into navbar
- ProductCard with next/image and editorial layout
- ProductFilters with URL query-param state (sizes, testing method, in-stock)
- ProductListingPage shared component
- Three category routes (peptides, capsules, mixers) using the shared component
- VariantSelector with URL query sync and basket integration
- ResearchDisclaimerCallout, ProductFAQ, ProductDetail components
- Three dynamic product detail routes with `generateStaticParams`
- Full homepage with hero, category cards, trust row, featured products, research framing
- Basket page (`/basket`)
- Stub checkout route (`/checkout`)
- About, Contact (with Server Action stub), Product Information pages
- LegalPage component with frontmatter gate
- Six legal pages with placeholder markdown content and review-gate banners
- End-to-end storefront smoke test passed

**Known gaps (intentional, addressed in later plans):**

- Contact form Server Action logs to console only → Plan 3 writes to Firestore and sends Resend emails
- Checkout is a stub placeholder → Plan 3 builds the full flow
- No customer accounts, no Firebase Auth wiring → Plan 3
- No admin UI → Plan 4
- No JSON-LD, no metadata beyond basic titles, no sitemap → Plan 5
- Legal pages are placeholders awaiting full drafts → Plan 5
- Product images are all the placeholder SVG → replaced in Phase 3

---

## END-OF-PLAN REVIEW CHECKPOINT — STOP HERE

**Do not proceed to Plan 3 until David has confirmed that the Opus review is complete.**

### What Sonnet should do when this plan is complete

1. **Stop.** Do not start Plan 3.
2. **Post the report below** to David in the conversation.
3. **Wait** for David to run the Opus review and confirm before moving on.

### Report template — copy, fill in, send to David

````markdown
## Plan 2 (Storefront) — execution report

**Git log range:** `<first-commit-hash>..<last-commit-hash>` (14 tasks expected)

**Task completion:**
- [x] Task 1: Install storefront dependencies
- [x] Task 2: Zustand basket store
- [x] Task 3: BasketDrawer / BasketItem / BasketIconButton
- [x] Task 4: ProductCard
- [x] Task 5: ProductFilters + ProductListingPage
- [x] Task 6: Category route wrappers
- [x] Task 7: VariantSelector
- [x] Task 8: ProductDetail + ResearchDisclaimerCallout + ProductFAQ
- [x] Task 9: Product detail SSG routes
- [x] Task 10: Homepage
- [x] Task 11: Basket page + stub checkout route
- [x] Task 12: About / Contact / Product Information pages
- [x] Task 13: LegalPage + six legal routes
- [x] Task 14: End-to-end storefront smoke test

**Deviations from plan:**
- ...

**Judgment calls I made:**
- ...

**Blockers hit:**
- ...

**Verification results:**
- `npx tsc --noEmit`: PASS / FAIL
- `npm run build`: PASS / FAIL
- Storefront smoke test (Task 14 checklist): every item PASS / any FAIL

**Notes for David's review:**
- ...
````

### What David's Opus review will specifically check for Plan 2

1. **Visual taste check.** The single most important subjective review of the whole project. Does the homepage *feel* boutique-editorial (Cormorant serif headlines, small-caps labels, hairline borders, square buttons, no drop shadows) or does it feel like a clean-but-generic Shopify template in navy? This is the decision point for whether to tune the visual language before Plan 3 and Plan 4 build more surface on top of it. If it needs work, better to fix now than to fix everywhere later.
2. **Product detail page layout.** Chemistry data row in mono, variant selector, research disclaimer callout, FAQ section, related products. Each of these has to be right because Plan 5's SEO work references the same DOM structure for JSON-LD extraction.
3. **Filter URL state.** Plan 2's filters store state in URL query params. Opus will test: do filters survive a reload? Do shareable URLs land on the same filtered view? Does the canonical URL still point back to the bare category (not the filtered variant) for SEO?
4. **Basket flow end-to-end.** Add to basket → drawer opens → quantity update works → subtotal recomputes → remove works → /basket full page shows same state → state survives refresh via localStorage.
5. **Emergent utilities or patterns.** Any helper functions, component patterns, or utility types that emerged during Plan 2 execution should be noted so Plan 3 can reuse them rather than reinventing.
6. **Any file or type name drift.** If component names, prop shapes, or import paths differ from what Plan 2 specified, Plan 3's code blocks need updating to match.

### How David triggers the review

> Plan 2 is complete. Commits `<first>..<last>`. Please read the execution report, review the storefront visually (especially homepage and a product detail page), update Plan 3's "Review notes from Plan 2" section with any drift or taste adjustments, and confirm readiness to proceed.

---

Proceed to **Plan 3: Checkout + Customer Accounts** — ONLY after the Opus review is complete.
