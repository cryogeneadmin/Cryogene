# Peptide Store — Plan 4: Admin UI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete admin UI on shadcn primitives: dashboard, products list + editor with image/COA upload, orders list + detail, enquiries, customers, and settings. Guards via `(admin)` layout Server Component checking a Firebase Auth session cookie custom claim (`admin: true`). In Stage 1a the admin UI is accessible via a dev-only bypass flag; in Stage 1b the flag is disabled and real auth takes over.

**Architecture:** Separate `(admin)` route group with its own layout, sidebar navigation, and server-side auth check. All write operations go through Server Actions calling the data-layer functions from Plan 3. Shadcn `DataTable` with client-side sorting and filtering for list views. Products editor is one long form with sections.

**Tech Stack:** shadcn/ui (Table, Form, Dialog, Alert, Badge, DropdownMenu, AlertDialog), `@tanstack/react-table` via shadcn's DataTable pattern, Firebase Admin SDK for setting custom claims.

**Spec reference:** `docs/superpowers/specs/2026-04-13-peptide-store-phase1-design.md` Sections 10, 6.1–6.5.

**Delivers at end of plan:** Admin UI reachable at `/admin` with a dev bypass flag for Stage 1a testing. Sam (or David during demos) can view the dashboard, browse and edit products, review orders placed during Plan 3 testing, mark enquiries as replied, view customers, and update the store config (name, address, VAT, shipping rule). All admin writes go through the same data layer as the public storefront.

**Testing strategy:** Manual verification — walk each admin page, perform a representative mutation (edit a product, mark an enquiry replied, update a shipping rate), verify the change persists to the local JSON file, then reload the public site and confirm the change is visible.

**Assumed handoffs from Plan 3:**
- `lib/orders.ts` with `getOrders`, `getOrderById`, `updateOrder`
- `lib/customers.ts` with `getCustomers`, `getCustomerById`
- `lib/enquiries.ts` with `getEnquiries`, `updateEnquiryStatus`
- `lib/config.ts` with `getConfig`, `updateConfig`
- `lib/products.ts` read functions (Plan 2)
- Firebase Admin SDK wired but inactive in Stage 1a

---

## Review notes from Plan 3

> **Populated by Opus during the end-of-Plan-3 review.** If this still says "Awaiting review" when Sonnet opens this file, **STOP** and confirm the Opus review has been run.

**Status:** ⏳ Awaiting review.

**Actual order document shape on disk (after Plan 3 test orders):** TBC

**Drift from plan (if any):** TBC

**Adjustments to Plan 4 tasks (if any):** TBC

**Admin UI field requirements that emerged from Plan 3 order shape:** TBC

---

**Handoffs to Plan 5 (SEO + Content + Launch):**
- Admin UI fully functional — content-editing workflow that Sam will use with real data
- Product editor capable of accepting image and COA uploads (routes to Firebase Storage in Stage 1b)
- Settings form saves to `config/main` — Plan 5 smoke test uses this to change store name
- Products collection fully editable — Plan 5's seed script becomes unnecessary once the admin UI is in use

---

## Task 1: Install DataTable dependencies and create admin route group layout

**Files:**
- Create: `app/(admin)/admin/layout.tsx`
- Create: `components/admin/AdminSidebar.tsx`
- Create: `lib/admin-auth.ts`

- [ ] **Step 1: Install `@tanstack/react-table` for shadcn DataTable**

```bash
npm install @tanstack/react-table
```

- [ ] **Step 2: Install shadcn data-table if not already present**

```bash
npx shadcn@canary add table
```

(If already installed from Plan 1, this is a no-op.)

- [ ] **Step 3: Create `lib/admin-auth.ts`**

```typescript
// lib/admin-auth.ts
import "server-only";
import { cookies } from "next/headers";
import { getAdminAuthSdk } from "@/lib/firebase/admin";

export async function isAdminRequest(): Promise<boolean> {
  // Dev bypass for Stage 1a — set ADMIN_DEV_BYPASS=1 in .env.local to unlock admin UI
  // without Firebase Auth. MUST be removed or set to 0 in production.
  if (process.env.ADMIN_DEV_BYPASS === "1") {
    return true;
  }

  const auth = getAdminAuthSdk();
  if (!auth) return false;

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value;
  if (!sessionCookie) return false;

  try {
    const decoded = await auth.verifySessionCookie(sessionCookie, true);
    return decoded.admin === true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Create `AdminSidebar`**

```tsx
// components/admin/AdminSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/enquiries", label: "Enquiries" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-[#0D1B3E] text-white min-h-screen p-6">
      <p className="font-serif text-2xl mb-10">Admin</p>
      <nav className="space-y-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`block py-2 px-3 text-sm rounded ${
              pathname === link.href
                ? "bg-[#162040] text-white"
                : "text-[#8BAAD4] hover:bg-[#162040] hover:text-white"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="mt-10 pt-6 border-t border-[#162040]">
        <Link href="/" className="text-xs text-[#8BAAD4] hover:text-white">
          ← Back to storefront
        </Link>
      </div>
    </aside>
  );
}
```

- [ ] **Step 5: Create admin layout with auth check**

```tsx
// app/(admin)/admin/layout.tsx
import { redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/admin-auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAdmin = await isAdminRequest();
  if (!isAdmin) {
    redirect("/sign-in?redirect=/admin");
  }

  return (
    <div className="flex min-h-screen bg-[#F7F8FA]">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}

export const metadata = { title: "Admin" };
```

- [ ] **Step 6: Add `ADMIN_DEV_BYPASS` to `.env.local` and `.env.example`**

Append to `.env.local`:

```
# Stage 1a only — remove or set to 0 in production
ADMIN_DEV_BYPASS=1
```

Append to `.env.example`:

```
# Stage 1a only — remove or set to 0 in production
ADMIN_DEV_BYPASS=0
```

- [ ] **Step 7: Commit**

```bash
npx tsc --noEmit
git add -A
git commit -m "feat: add admin layout with auth guard and dev bypass flag"
```

---

## Task 2: Build admin dashboard

**Files:**
- Create: `app/(admin)/admin/page.tsx`

- [ ] **Step 1: Write the dashboard page**

```tsx
// app/(admin)/admin/page.tsx
import Link from "next/link";
import { getOrders } from "@/lib/orders";
import { getEnquiries } from "@/lib/enquiries";
import { getProducts } from "@/lib/products";
import { formatPriceFromPence } from "@/lib/basket";

export default async function AdminDashboard() {
  const [recentOrders, openOrders, newEnquiries, products] = await Promise.all([
    getOrders({ limit: 10 }),
    getOrders({ status: "paid" }),
    getEnquiries("new"),
    getProducts(),
  ]);

  const lowStock = products.flatMap((p) =>
    p.variants
      .filter((v) => v.active && v.stock > 0 && v.stock <= 5)
      .map((v) => ({ product: p.name, sku: v.sku, stock: v.stock }))
  );

  const revenueThisMonth = recentOrders
    .filter((o) => o.status === "paid" || o.status === "fulfilled")
    .reduce((sum, o) => sum + o.totalInPence, 0);

  return (
    <div>
      <h1 className="text-4xl mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard label="Open orders" value={String(openOrders.length)} />
        <StatCard label="Low stock alerts" value={String(lowStock.length)} />
        <StatCard label="New enquiries" value={String(newEnquiries.length)} />
        <StatCard label="Revenue (recent)" value={formatPriceFromPence(revenueThisMonth)} />
      </div>

      <section className="bg-white border border-[#DDE1E7] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-2xl text-[#0D1B3E]">Recent orders</h2>
          <Link href="/admin/orders" className="text-xs underline text-[#6B7280]">View all</Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-sm text-[#6B7280]">No orders yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-[#6B7280] border-b border-[#DDE1E7]">
              <tr>
                <th className="py-2">Order</th>
                <th className="py-2">Customer</th>
                <th className="py-2">Status</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.slice(0, 10).map((o) => (
                <tr key={o.id} className="border-b border-[#DDE1E7] last:border-0">
                  <td className="py-3">
                    <Link href={`/admin/orders/${o.id}`} className="mono text-xs underline">
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="py-3">{o.customer.name}</td>
                  <td className="py-3"><StatusBadge status={o.status} /></td>
                  <td className="py-3 text-right mono">{formatPriceFromPence(o.totalInPence)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-[#DDE1E7] p-5">
      <p className="label-editorial mb-2">{label}</p>
      <p className="font-serif text-3xl text-[#0D1B3E]">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    paid: "bg-green-100 text-green-800",
    fulfilled: "bg-blue-100 text-blue-800",
    cancelled: "bg-gray-100 text-gray-800",
    refunded: "bg-red-100 text-red-800",
  };
  return (
    <span className={`px-2 py-0.5 text-xs rounded ${colorMap[status] ?? "bg-gray-100"}`}>
      {status}
    </span>
  );
}
```

- [ ] **Step 2: Verify dev server**

```bash
npm run dev
```

Visit `http://localhost:3000/admin`. Expected: dashboard renders with stat cards and any orders from Plan 3 testing.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add admin dashboard with stats and recent orders"
```

---

## Task 3: Build products list page

**Files:**
- Create: `app/(admin)/admin/products/page.tsx`
- Create: `components/admin/ProductTable.tsx`

- [ ] **Step 1: Create ProductTable**

```tsx
// components/admin/ProductTable.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import type { Product } from "@/types";
import { formatPriceFromPence } from "@/lib/basket";

export function ProductTable({ products }: { products: Product[] }) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const filtered = products.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
    if (activeFilter === "active" && !p.active) return false;
    if (activeFilter === "inactive" && p.active) return false;
    return true;
  });

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="search"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-[#DDE1E7] px-3 py-2 text-sm flex-1 min-w-[200px]"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-[#DDE1E7] px-3 py-2 text-sm"
        >
          <option value="all">All categories</option>
          <option value="peptides">Peptides</option>
          <option value="capsules">Capsules</option>
          <option value="mixers">Mixers</option>
        </select>
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          className="border border-[#DDE1E7] px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </select>
      </div>
      <table className="w-full text-sm bg-white border border-[#DDE1E7]">
        <thead className="text-left border-b border-[#DDE1E7]">
          <tr>
            <th className="p-3">Image</th>
            <th className="p-3">Name</th>
            <th className="p-3">Category</th>
            <th className="p-3">Variants</th>
            <th className="p-3">Stock</th>
            <th className="p-3">Price from</th>
            <th className="p-3">Status</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((p) => {
            const totalStock = p.variants.reduce((sum, v) => sum + v.stock, 0);
            const lowestPrice = Math.min(...p.variants.map((v) => v.priceInPence));
            return (
              <tr key={p.id} className="border-b border-[#DDE1E7] last:border-0">
                <td className="p-3">
                  <div className="relative h-10 w-10 bg-[#F7F8FA]">
                    {p.images[0] && (
                      <Image src={p.images[0]} alt={p.name} fill className="object-contain p-1" sizes="40px" />
                    )}
                  </div>
                </td>
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3 text-[#6B7280]">{p.category}</td>
                <td className="p-3 text-[#6B7280]">{p.variants.length} sizes</td>
                <td className="p-3">{totalStock}</td>
                <td className="p-3 mono">{formatPriceFromPence(lowestPrice)}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 text-xs ${p.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                    {p.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <Link href={`/admin/products/${p.id}`} className="text-xs underline">Edit</Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {filtered.length === 0 && (
        <p className="text-sm text-[#6B7280] mt-4">No products match your filters.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create products list page**

```tsx
// app/(admin)/admin/products/page.tsx
import Link from "next/link";
import { getProducts } from "@/lib/products";
import { ProductTable } from "@/components/admin/ProductTable";

export default async function AdminProductsPage() {
  const products = await getProducts();

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl">Products</h1>
        <Link
          href="/admin/products/new"
          className="px-5 py-2 bg-[#0D1B3E] text-white uppercase tracking-wider text-xs hover:bg-[#162040]"
        >
          Add product
        </Link>
      </div>
      <ProductTable products={products} />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
npx tsc --noEmit
git add -A
git commit -m "feat: add admin products list with filter and search"
```

---

## Task 4: Build ProductForm component and new/edit pages

**Files:**
- Create: `components/admin/ProductForm.tsx`
- Create: `app/(admin)/admin/products/new/page.tsx`
- Create: `app/(admin)/admin/products/[id]/page.tsx`
- Create: `app/actions/products.ts`

- [ ] **Step 1: Create the product write Server Actions**

```typescript
// app/actions/products.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import type { Product } from "@/types";
import { getAdminDb } from "@/lib/firebase/admin";
import { slugify } from "@/lib/slug";

const SEED_PATH = path.join(process.cwd(), "data", "products.seed.json");
const LOCAL_WRITES_PATH = path.join(process.cwd(), "data", "products.local.json");

const VariantSchema = z.object({
  sku: z.string().min(1),
  size: z.string().min(1),
  priceInPence: z.number().int().min(0),
  stock: z.number().int().min(0),
  coaUrl: z.string().nullable(),
  active: z.boolean(),
});

const ProductSchema = z.object({
  id: z.string().optional(),
  slug: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(["peptides", "capsules", "mixers"]),
  shortDescription: z.string().min(1),
  fullDescription: z.string().min(1),
  casNumber: z.string().min(1),
  molecularFormula: z.string().min(1),
  molecularWeight: z.string().min(1),
  synonyms: z.array(z.string()).default([]),
  purity: z.string().min(1),
  testingMethod: z.enum(["HPLC", "MS", "HPLC-MS"]),
  variants: z.array(VariantSchema).min(1),
  images: z.array(z.string()).default([]),
  primaryImageIndex: z.number().int().min(0).default(0),
  seoTitle: z.string().nullable().default(null),
  seoDescription: z.string().nullable().default(null),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })).default([]),
  tags: z.array(z.string()).default([]),
  active: z.boolean().default(true),
});

function useSeed(): boolean {
  return getAdminDb() === null;
}

async function readLocalWrites(): Promise<Product[]> {
  try {
    return JSON.parse(await fs.readFile(LOCAL_WRITES_PATH, "utf-8"));
  } catch {
    return [];
  }
}

async function writeLocalWrites(products: Product[]): Promise<void> {
  await fs.writeFile(LOCAL_WRITES_PATH, JSON.stringify(products, null, 2), "utf-8");
}

export async function saveProduct(data: unknown) {
  const parsed = ProductSchema.parse(data);
  const now = new Date().toISOString();

  const product: Product = {
    id: parsed.id ?? `local-${Date.now()}`,
    slug: parsed.slug || slugify(parsed.name),
    name: parsed.name,
    category: parsed.category,
    shortDescription: parsed.shortDescription,
    fullDescription: parsed.fullDescription,
    casNumber: parsed.casNumber,
    molecularFormula: parsed.molecularFormula,
    molecularWeight: parsed.molecularWeight,
    synonyms: parsed.synonyms,
    purity: parsed.purity,
    testingMethod: parsed.testingMethod,
    variants: parsed.variants,
    images: parsed.images,
    primaryImageIndex: parsed.primaryImageIndex,
    seoTitle: parsed.seoTitle,
    seoDescription: parsed.seoDescription,
    faq: parsed.faq,
    tags: parsed.tags,
    active: parsed.active,
    createdAt: now as unknown as Date,
    updatedAt: now as unknown as Date,
    updatedBy: "admin-ui",
  };

  if (useSeed()) {
    const writes = await readLocalWrites();
    const idx = writes.findIndex((p) => p.id === product.id);
    if (idx === -1) writes.push(product);
    else writes[idx] = product;
    await writeLocalWrites(writes);
  } else {
    const db = getAdminDb()!;
    await db.doc(`products/${product.id}`).set(product);
  }

  revalidatePath("/admin/products");
  revalidatePath(`/${product.category}`);
  revalidatePath(`/${product.category}/${product.slug}`);
  redirect("/admin/products");
}

export async function toggleProductActive(id: string, active: boolean) {
  if (useSeed()) {
    const writes = await readLocalWrites();
    const idx = writes.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`Product ${id} not found in writes store`);
    writes[idx] = { ...writes[idx]!, active, updatedAt: new Date().toISOString() as unknown as Date };
    await writeLocalWrites(writes);
  } else {
    await getAdminDb()!.doc(`products/${id}`).update({ active, updatedAt: new Date() });
  }
  revalidatePath("/admin/products");
}
```

- [ ] **Step 2: Create `lib/slug.ts` helper**

```typescript
// lib/slug.ts
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
```

- [ ] **Step 3: Add `data/products.local.json` to `.gitignore`**

Append:

```
data/products.local.json
```

- [ ] **Step 4: Create ProductForm component**

```tsx
// components/admin/ProductForm.tsx
"use client";

import { useState } from "react";
import type { Product, ProductVariant } from "@/types";
import { saveProduct } from "@/app/actions/products";
import { slugify } from "@/lib/slug";

type Draft = Omit<Product, "id" | "createdAt" | "updatedAt" | "updatedBy"> & {
  id?: string;
};

const emptyVariant: ProductVariant = {
  sku: "",
  size: "",
  priceInPence: 0,
  stock: 0,
  coaUrl: null,
  active: true,
};

export function ProductForm({ initial }: { initial?: Product }) {
  const [draft, setDraft] = useState<Draft>(() => {
    if (initial) {
      const { id, createdAt, updatedAt, updatedBy, ...rest } = initial;
      return { ...rest, id };
    }
    return {
      slug: "",
      name: "",
      category: "peptides",
      shortDescription: "",
      fullDescription: "",
      casNumber: "",
      molecularFormula: "",
      molecularWeight: "",
      synonyms: [],
      purity: "≥98%",
      testingMethod: "HPLC",
      variants: [{ ...emptyVariant }],
      images: [],
      primaryImageIndex: 0,
      seoTitle: null,
      seoDescription: null,
      faq: [],
      tags: [],
      active: true,
    };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const onNameChange = (name: string) => {
    setDraft((d) => ({
      ...d,
      name,
      slug: d.slug || slugify(name),
    }));
  };

  const updateVariant = (idx: number, patch: Partial<ProductVariant>) => {
    setDraft((d) => ({
      ...d,
      variants: d.variants.map((v, i) => (i === idx ? { ...v, ...patch } : v)),
    }));
  };

  const addVariant = () => {
    setDraft((d) => ({ ...d, variants: [...d.variants, { ...emptyVariant }] }));
  };

  const removeVariant = (idx: number) => {
    setDraft((d) => ({ ...d, variants: d.variants.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await saveProduct(draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-10 max-w-4xl">
      <section>
        <h2 className="font-serif text-2xl text-[#0D1B3E] mb-6">Basic information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label-editorial block mb-2">Name</label>
            <input type="text" value={draft.name} onChange={(e) => onNameChange(e.target.value)} required className="w-full border border-[#DDE1E7] p-2" />
          </div>
          <div>
            <label className="label-editorial block mb-2">Slug</label>
            <input type="text" value={draft.slug} onChange={(e) => update("slug", e.target.value)} required className="w-full border border-[#DDE1E7] p-2 mono" />
          </div>
          <div>
            <label className="label-editorial block mb-2">Category</label>
            <select value={draft.category} onChange={(e) => update("category", e.target.value as Product["category"])} className="w-full border border-[#DDE1E7] p-2">
              <option value="peptides">Peptides</option>
              <option value="capsules">Capsules</option>
              <option value="mixers">Mixers</option>
            </select>
          </div>
          <div>
            <label className="label-editorial block mb-2">Active</label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={draft.active} onChange={(e) => update("active", e.target.checked)} />
              <span>Product is visible in storefront</span>
            </label>
          </div>
        </div>
        <div className="mt-6">
          <label className="label-editorial block mb-2">Short description</label>
          <textarea value={draft.shortDescription} onChange={(e) => update("shortDescription", e.target.value)} required rows={2} className="w-full border border-[#DDE1E7] p-2" />
        </div>
        <div className="mt-6">
          <label className="label-editorial block mb-2">Full description (markdown)</label>
          <textarea value={draft.fullDescription} onChange={(e) => update("fullDescription", e.target.value)} required rows={8} className="w-full border border-[#DDE1E7] p-2 font-mono text-sm" />
        </div>
      </section>

      <section>
        <h2 className="font-serif text-2xl text-[#0D1B3E] mb-6">Chemical identity</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="label-editorial block mb-2">CAS Number</label>
            <input type="text" value={draft.casNumber} onChange={(e) => update("casNumber", e.target.value)} required className="w-full border border-[#DDE1E7] p-2 mono" />
          </div>
          <div>
            <label className="label-editorial block mb-2">Molecular Formula</label>
            <input type="text" value={draft.molecularFormula} onChange={(e) => update("molecularFormula", e.target.value)} required className="w-full border border-[#DDE1E7] p-2 mono" />
          </div>
          <div>
            <label className="label-editorial block mb-2">Molecular Weight</label>
            <input type="text" value={draft.molecularWeight} onChange={(e) => update("molecularWeight", e.target.value)} required className="w-full border border-[#DDE1E7] p-2 mono" />
          </div>
          <div>
            <label className="label-editorial block mb-2">Purity</label>
            <input type="text" value={draft.purity} onChange={(e) => update("purity", e.target.value)} required className="w-full border border-[#DDE1E7] p-2" />
          </div>
          <div>
            <label className="label-editorial block mb-2">Testing method</label>
            <select value={draft.testingMethod} onChange={(e) => update("testingMethod", e.target.value as Product["testingMethod"])} className="w-full border border-[#DDE1E7] p-2">
              <option value="HPLC">HPLC</option>
              <option value="MS">MS</option>
              <option value="HPLC-MS">HPLC-MS</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="label-editorial block mb-2">Synonyms (comma-separated)</label>
            <input type="text" value={draft.synonyms.join(", ")} onChange={(e) => update("synonyms", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} className="w-full border border-[#DDE1E7] p-2" />
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl text-[#0D1B3E]">Variants</h2>
          <button type="button" onClick={addVariant} className="text-xs underline">+ Add variant</button>
        </div>
        <div className="space-y-4">
          {draft.variants.map((v, idx) => (
            <div key={idx} className="bg-white border border-[#DDE1E7] p-4 grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_1fr_auto_auto] gap-3 items-end">
              <div>
                <label className="label-editorial block mb-1">SKU</label>
                <input type="text" value={v.sku} onChange={(e) => updateVariant(idx, { sku: e.target.value })} className="w-full border border-[#DDE1E7] p-2 mono text-xs" />
              </div>
              <div>
                <label className="label-editorial block mb-1">Size</label>
                <input type="text" value={v.size} onChange={(e) => updateVariant(idx, { size: e.target.value })} className="w-full border border-[#DDE1E7] p-2" />
              </div>
              <div>
                <label className="label-editorial block mb-1">Price (£)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={(v.priceInPence / 100).toFixed(2)}
                  onChange={(e) => updateVariant(idx, { priceInPence: Math.round(parseFloat(e.target.value || "0") * 100) })}
                  className="w-full border border-[#DDE1E7] p-2"
                />
              </div>
              <div>
                <label className="label-editorial block mb-1">Stock</label>
                <input type="number" min="0" value={v.stock} onChange={(e) => updateVariant(idx, { stock: parseInt(e.target.value || "0", 10) })} className="w-full border border-[#DDE1E7] p-2" />
              </div>
              <label className="flex items-center gap-1 text-xs">
                <input type="checkbox" checked={v.active} onChange={(e) => updateVariant(idx, { active: e.target.checked })} />
                <span>Active</span>
              </label>
              <button type="button" onClick={() => removeVariant(idx)} className="text-xs text-red-700 underline">Remove</button>
            </div>
          ))}
        </div>
        <p className="text-xs text-[#6B7280] mt-3">
          Image and COA upload arrive in the next iteration — for Stage 1a, variant COA URLs can be left empty.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-2xl text-[#0D1B3E] mb-6">SEO (optional overrides)</h2>
        <div className="space-y-4">
          <div>
            <label className="label-editorial block mb-2">Meta title override</label>
            <input type="text" value={draft.seoTitle ?? ""} onChange={(e) => update("seoTitle", e.target.value || null)} className="w-full border border-[#DDE1E7] p-2" />
          </div>
          <div>
            <label className="label-editorial block mb-2">Meta description override</label>
            <textarea value={draft.seoDescription ?? ""} onChange={(e) => update("seoDescription", e.target.value || null)} rows={2} className="w-full border border-[#DDE1E7] p-2" />
          </div>
        </div>
      </section>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="flex gap-3 sticky bottom-0 bg-[#F7F8FA] py-4 border-t border-[#DDE1E7]">
        <button type="submit" disabled={saving} className="px-6 py-3 bg-[#0D1B3E] text-white uppercase tracking-wider text-xs hover:bg-[#162040] disabled:bg-[#6B7280]">
          {saving ? "Saving..." : "Save product"}
        </button>
        <a href="/admin/products" className="px-6 py-3 border border-[#DDE1E7] uppercase tracking-wider text-xs hover:bg-white">
          Cancel
        </a>
      </div>
    </form>
  );
}
```

- [ ] **Step 5: Create new/edit route pages**

```tsx
// app/(admin)/admin/products/new/page.tsx
import { ProductForm } from "@/components/admin/ProductForm";

export default function NewProductPage() {
  return (
    <div>
      <h1 className="text-4xl mb-8">New product</h1>
      <ProductForm />
    </div>
  );
}
```

```tsx
// app/(admin)/admin/products/[id]/page.tsx
import { notFound } from "next/navigation";
import { getProducts } from "@/lib/products";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const products = await getProducts();
  const product = products.find((p) => p.id === id);
  if (!product) notFound();

  return (
    <div>
      <h1 className="text-4xl mb-8">Edit {product.name}</h1>
      <ProductForm initial={product} />
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
npx tsc --noEmit
git add -A
git commit -m "feat: add product form with variants editor and save action"
```

---

## Task 5: Build orders list and detail

**Files:**
- Create: `app/(admin)/admin/orders/page.tsx`
- Create: `app/(admin)/admin/orders/[id]/page.tsx`
- Create: `components/admin/OrderTable.tsx`
- Create: `app/actions/orders.ts`

- [ ] **Step 1: Create orders Server Actions**

```typescript
// app/actions/orders.ts
"use server";

import { revalidatePath } from "next/cache";
import { updateOrder } from "@/lib/orders";
import type { OrderStatus } from "@/types";

export async function setOrderStatus(id: string, status: OrderStatus) {
  await updateOrder(id, { status });
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
}

export async function addAdminNote(id: string, note: string) {
  await updateOrder(id, { adminNotes: note });
  revalidatePath(`/admin/orders/${id}`);
}
```

- [ ] **Step 2: Create OrderTable**

```tsx
// components/admin/OrderTable.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import type { Order } from "@/types";
import { formatPriceFromPence } from "@/lib/basket";

export function OrderTable({ orders }: { orders: Order[] }) {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    return true;
  });

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-[#DDE1E7] px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="fulfilled">Fulfilled</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>
      <table className="w-full text-sm bg-white border border-[#DDE1E7]">
        <thead className="text-left border-b border-[#DDE1E7]">
          <tr>
            <th className="p-3">Order</th>
            <th className="p-3">Date</th>
            <th className="p-3">Customer</th>
            <th className="p-3">Items</th>
            <th className="p-3">Status</th>
            <th className="p-3 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((o) => (
            <tr key={o.id} className="border-b border-[#DDE1E7] last:border-0">
              <td className="p-3">
                <Link href={`/admin/orders/${o.id}`} className="mono text-xs underline">
                  {o.orderNumber}
                </Link>
              </td>
              <td className="p-3 text-[#6B7280]">
                {new Date(o.createdAt as string).toLocaleDateString("en-GB")}
              </td>
              <td className="p-3">{o.customer.name}</td>
              <td className="p-3">{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
              <td className="p-3">
                <span className="px-2 py-0.5 text-xs bg-gray-100">{o.status}</span>
              </td>
              <td className="p-3 text-right mono">{formatPriceFromPence(o.totalInPence)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length === 0 && (
        <p className="text-sm text-[#6B7280] mt-4">No orders match your filter.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create list page**

```tsx
// app/(admin)/admin/orders/page.tsx
import { getOrders } from "@/lib/orders";
import { OrderTable } from "@/components/admin/OrderTable";

export default async function AdminOrdersPage() {
  const orders = await getOrders();
  return (
    <div>
      <h1 className="text-4xl mb-8">Orders</h1>
      <OrderTable orders={orders} />
    </div>
  );
}
```

- [ ] **Step 4: Create detail page**

```tsx
// app/(admin)/admin/orders/[id]/page.tsx
import { notFound } from "next/navigation";
import { getOrderById } from "@/lib/orders";
import { formatPriceFromPence } from "@/lib/basket";
import { OrderStatusControls } from "@/components/admin/OrderStatusControls";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  return (
    <div>
      <h1 className="text-4xl mb-2">Order {order.orderNumber}</h1>
      <p className="mono text-xs text-[#6B7280] mb-8">ID: {order.id}</p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-6">
          <section className="bg-white border border-[#DDE1E7] p-6">
            <p className="label-editorial mb-4">Items</p>
            {order.items.map((item) => (
              <div key={item.sku} className="flex justify-between py-2 border-b border-[#DDE1E7] last:border-0">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="mono text-xs text-[#6B7280]">{item.sku} · {item.size} · qty {item.quantity}</p>
                </div>
                <p className="mono text-sm">{formatPriceFromPence(item.lineTotalInPence)}</p>
              </div>
            ))}
            <div className="mt-4 pt-4 border-t border-[#DDE1E7] space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-[#6B7280]">Subtotal</span><span>{formatPriceFromPence(order.itemsSubtotalInPence)}</span></div>
              <div className="flex justify-between"><span className="text-[#6B7280]">Shipping</span><span>{formatPriceFromPence(order.shippingCostInPence)}</span></div>
              {order.vatAmountInPence > 0 && <div className="flex justify-between"><span className="text-[#6B7280]">VAT</span><span>{formatPriceFromPence(order.vatAmountInPence)}</span></div>}
              <div className="flex justify-between pt-2 border-t border-[#DDE1E7] font-medium"><span>Total</span><span>{formatPriceFromPence(order.totalInPence)}</span></div>
            </div>
          </section>

          <section className="bg-white border border-[#DDE1E7] p-6">
            <p className="label-editorial mb-4">Customer</p>
            <div className="text-sm leading-relaxed">
              <p className="font-medium">{order.customer.name}</p>
              <p>{order.customer.email}</p>
              {order.customer.phone && <p>{order.customer.phone}</p>}
              <div className="mt-3 text-[#6B7280]">
                <p>{order.customer.address.line1}</p>
                {order.customer.address.line2 && <p>{order.customer.address.line2}</p>}
                <p>{order.customer.address.city}</p>
                <p>{order.customer.address.postcode}</p>
              </div>
            </div>
          </section>

          <section className="bg-white border border-[#DDE1E7] p-6">
            <p className="label-editorial mb-4">Payment</p>
            <dl className="text-sm space-y-2">
              <div className="flex justify-between"><dt className="text-[#6B7280]">Provider</dt><dd>{order.payment.provider}</dd></div>
              <div className="flex justify-between"><dt className="text-[#6B7280]">Reference</dt><dd className="mono text-xs">{order.payment.providerRef ?? "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-[#6B7280]">Paid at</dt><dd>{order.payment.paidAt ? new Date(order.payment.paidAt as string).toLocaleString("en-GB") : "—"}</dd></div>
            </dl>
          </section>
        </div>

        <aside>
          <OrderStatusControls order={order} />
        </aside>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create OrderStatusControls**

```tsx
// components/admin/OrderStatusControls.tsx
"use client";

import { useState } from "react";
import { setOrderStatus } from "@/app/actions/orders";
import type { Order, OrderStatus } from "@/types";

const STATUSES: OrderStatus[] = ["pending", "paid", "fulfilled", "cancelled", "refunded"];

export function OrderStatusControls({ order }: { order: Order }) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [pending, setPending] = useState(false);

  const handleChange = async (newStatus: OrderStatus) => {
    setPending(true);
    try {
      await setOrderStatus(order.id, newStatus);
      setStatus(newStatus);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="bg-white border border-[#DDE1E7] p-6 sticky top-8">
      <p className="label-editorial mb-4">Status</p>
      <div className="space-y-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            disabled={pending || s === status}
            onClick={() => handleChange(s)}
            className={`w-full py-2 text-sm uppercase tracking-wider text-xs ${
              s === status
                ? "bg-[#0D1B3E] text-white"
                : "border border-[#DDE1E7] hover:bg-[#F7F8FA]"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
npx tsc --noEmit
git add -A
git commit -m "feat: add admin orders list, detail, and status transitions"
```

---

## Task 6: Build enquiries and customers admin pages

**Files:**
- Create: `app/(admin)/admin/enquiries/page.tsx`
- Create: `app/(admin)/admin/customers/page.tsx`
- Create: `app/actions/enquiries-admin.ts`

- [ ] **Step 1: Create enquiries admin actions**

```typescript
// app/actions/enquiries-admin.ts
"use server";

import { revalidatePath } from "next/cache";
import { updateEnquiryStatus } from "@/lib/enquiries";
import type { EnquiryStatus } from "@/types";

export async function setEnquiryStatusAction(id: string, status: EnquiryStatus) {
  await updateEnquiryStatus(id, status);
  revalidatePath("/admin/enquiries");
}
```

- [ ] **Step 2: Create enquiries list page**

```tsx
// app/(admin)/admin/enquiries/page.tsx
import { getEnquiries } from "@/lib/enquiries";
import { EnquiriesList } from "@/components/admin/EnquiriesList";

export default async function AdminEnquiriesPage() {
  const enquiries = await getEnquiries();
  return (
    <div>
      <h1 className="text-4xl mb-8">Enquiries</h1>
      <EnquiriesList enquiries={enquiries} />
    </div>
  );
}
```

- [ ] **Step 3: Create EnquiriesList component**

```tsx
// components/admin/EnquiriesList.tsx
"use client";

import { useState } from "react";
import type { Enquiry } from "@/types";
import { setEnquiryStatusAction } from "@/app/actions/enquiries-admin";

export function EnquiriesList({ enquiries }: { enquiries: Enquiry[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (enquiries.length === 0) {
    return <p className="text-sm text-[#6B7280]">No enquiries yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {enquiries.map((e) => (
        <li key={e.id} className="bg-white border border-[#DDE1E7]">
          <button
            type="button"
            onClick={() => setExpanded(expanded === e.id ? null : e.id)}
            className="w-full p-4 text-left flex justify-between items-start hover:bg-[#F7F8FA]"
          >
            <div>
              <p className="font-medium">{e.subject}</p>
              <p className="text-xs text-[#6B7280] mt-1">
                From {e.name} ({e.email}) — {new Date(e.createdAt as string).toLocaleDateString("en-GB")}
              </p>
            </div>
            <span className={`px-2 py-0.5 text-xs ${e.status === "new" ? "bg-amber-100 text-amber-800" : e.status === "replied" ? "bg-green-100 text-green-800" : "bg-gray-100"}`}>
              {e.status}
            </span>
          </button>
          {expanded === e.id && (
            <div className="p-4 border-t border-[#DDE1E7] space-y-4">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{e.message}</p>
              <div className="flex gap-2">
                <a href={`mailto:${e.email}?subject=Re: ${e.subject}`} className="px-4 py-2 text-xs uppercase tracking-wider bg-[#0D1B3E] text-white">
                  Reply by email
                </a>
                {e.status !== "replied" && (
                  <button type="button" onClick={() => setEnquiryStatusAction(e.id, "replied")} className="px-4 py-2 text-xs uppercase tracking-wider border border-[#DDE1E7]">
                    Mark as replied
                  </button>
                )}
                {e.status !== "archived" && (
                  <button type="button" onClick={() => setEnquiryStatusAction(e.id, "archived")} className="px-4 py-2 text-xs uppercase tracking-wider border border-[#DDE1E7]">
                    Archive
                  </button>
                )}
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Create customers list page**

```tsx
// app/(admin)/admin/customers/page.tsx
import { getCustomers } from "@/lib/customers";
import { formatPriceFromPence } from "@/lib/basket";

export default async function AdminCustomersPage() {
  const customers = await getCustomers();
  return (
    <div>
      <h1 className="text-4xl mb-8">Customers</h1>
      {customers.length === 0 ? (
        <p className="text-sm text-[#6B7280]">No customers yet. Accounts will appear here once Firebase Auth is wired in Stage 1b.</p>
      ) : (
        <table className="w-full text-sm bg-white border border-[#DDE1E7]">
          <thead className="text-left border-b border-[#DDE1E7]">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Research institution</th>
              <th className="p-3 text-right">Orders</th>
              <th className="p-3 text-right">LTV</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-[#DDE1E7] last:border-0">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3 text-[#6B7280]">{c.email}</td>
                <td className="p-3 text-[#6B7280]">{c.researchInstitution ?? "—"}</td>
                <td className="p-3 text-right">{c.orderCount}</td>
                <td className="p-3 text-right mono">{formatPriceFromPence(c.lifetimeValueInPence)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
npx tsc --noEmit
git add -A
git commit -m "feat: add admin enquiries and customers pages"
```

---

## Task 7: Build settings page

**Files:**
- Create: `app/(admin)/admin/settings/page.tsx`
- Create: `components/admin/SettingsForm.tsx`
- Create: `app/actions/config.ts`

- [ ] **Step 1: Create config Server Action**

```typescript
// app/actions/config.ts
"use server";

import { revalidatePath } from "next/cache";
import { updateConfig } from "@/lib/config";
import type { Config } from "@/types";

export async function saveConfig(patch: Partial<Config>) {
  await updateConfig(patch);
  revalidatePath("/", "layout"); // Invalidate everything using config
}
```

- [ ] **Step 2: Create SettingsForm**

```tsx
// components/admin/SettingsForm.tsx
"use client";

import { useState } from "react";
import type { Config } from "@/types";
import { saveConfig } from "@/app/actions/config";

export function SettingsForm({ initial }: { initial: Config }) {
  const [config, setConfig] = useState<Config>(initial);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const update = (patch: Partial<Config>) => setConfig((c) => ({ ...c, ...patch }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveConfig(config);
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-10 max-w-3xl">
      <section>
        <h2 className="font-serif text-2xl text-[#0D1B3E] mb-6">Store identity</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label-editorial block mb-2">Store name</label>
            <input type="text" value={config.storeName} onChange={(e) => update({ storeName: e.target.value })} className="w-full border border-[#DDE1E7] p-2" />
          </div>
          <div>
            <label className="label-editorial block mb-2">Store email</label>
            <input type="email" value={config.storeEmail} onChange={(e) => update({ storeEmail: e.target.value })} className="w-full border border-[#DDE1E7] p-2" />
          </div>
          <div>
            <label className="label-editorial block mb-2">Store phone (optional)</label>
            <input type="tel" value={config.storePhone ?? ""} onChange={(e) => update({ storePhone: e.target.value || null })} className="w-full border border-[#DDE1E7] p-2" />
          </div>
          <div>
            <label className="label-editorial block mb-2">Company number (optional)</label>
            <input type="text" value={config.companyNumber ?? ""} onChange={(e) => update({ companyNumber: e.target.value || null })} className="w-full border border-[#DDE1E7] p-2" />
          </div>
          <div className="md:col-span-2">
            <label className="label-editorial block mb-2">Registered address</label>
            <textarea value={config.registeredAddress} onChange={(e) => update({ registeredAddress: e.target.value })} rows={3} className="w-full border border-[#DDE1E7] p-2" />
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-serif text-2xl text-[#0D1B3E] mb-6">VAT</h2>
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={config.vat.registered} onChange={(e) => update({ vat: { ...config.vat, registered: e.target.checked } })} />
            <span>VAT registered</span>
          </label>
          {config.vat.registered && (
            <>
              <div>
                <label className="label-editorial block mb-2">VAT number</label>
                <input type="text" value={config.vatNumber ?? ""} onChange={(e) => update({ vatNumber: e.target.value })} className="w-full border border-[#DDE1E7] p-2" />
              </div>
              <div>
                <label className="label-editorial block mb-2">VAT rate</label>
                <input type="number" step="0.01" min="0" max="1" value={config.vat.rate} onChange={(e) => update({ vat: { ...config.vat, rate: parseFloat(e.target.value) } })} className="w-full border border-[#DDE1E7] p-2" />
                <p className="text-xs text-[#6B7280] mt-1">Enter as decimal, e.g. 0.20 for 20%</p>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={config.vat.displayPricesInclusive} onChange={(e) => update({ vat: { ...config.vat, displayPricesInclusive: e.target.checked } })} />
                <span>Display prices inclusive of VAT</span>
              </label>
            </>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-serif text-2xl text-[#0D1B3E] mb-6">Shipping</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label-editorial block mb-2">Flat rate (£)</label>
            <input type="number" step="0.01" min="0" value={(config.shipping.flatRateInPence / 100).toFixed(2)} onChange={(e) => update({ shipping: { ...config.shipping, flatRateInPence: Math.round(parseFloat(e.target.value || "0") * 100) } })} className="w-full border border-[#DDE1E7] p-2" />
          </div>
          <div>
            <label className="label-editorial block mb-2">Free over (£, blank for none)</label>
            <input type="number" step="0.01" min="0" value={config.shipping.freeThresholdInPence === null ? "" : (config.shipping.freeThresholdInPence / 100).toFixed(2)} onChange={(e) => update({ shipping: { ...config.shipping, freeThresholdInPence: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null } })} className="w-full border border-[#DDE1E7] p-2" />
          </div>
          <div className="md:col-span-2">
            <label className="label-editorial block mb-2">Estimated dispatch text</label>
            <input type="text" value={config.shipping.estimatedDispatch} onChange={(e) => update({ shipping: { ...config.shipping, estimatedDispatch: e.target.value } })} className="w-full border border-[#DDE1E7] p-2" />
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-serif text-2xl text-[#0D1B3E] mb-6">Notifications</h2>
        <div>
          <label className="label-editorial block mb-2">Order notifications email</label>
          <input type="email" value={config.notifications.newOrderEmailTo} onChange={(e) => update({ notifications: { ...config.notifications, newOrderEmailTo: e.target.value } })} className="w-full border border-[#DDE1E7] p-2" />
        </div>
      </section>

      <div className="flex items-center gap-4 sticky bottom-0 bg-[#F7F8FA] py-4 border-t border-[#DDE1E7]">
        <button type="submit" disabled={saving} className="px-6 py-3 bg-[#0D1B3E] text-white uppercase tracking-wider text-xs hover:bg-[#162040] disabled:bg-[#6B7280]">
          {saving ? "Saving..." : "Save settings"}
        </button>
        {savedAt && <p className="text-xs text-green-700">Saved at {savedAt.toLocaleTimeString("en-GB")}</p>}
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Create settings page**

```tsx
// app/(admin)/admin/settings/page.tsx
import { getConfig } from "@/lib/config";
import { SettingsForm } from "@/components/admin/SettingsForm";

export default async function AdminSettingsPage() {
  const config = await getConfig();
  return (
    <div>
      <h1 className="text-4xl mb-8">Settings</h1>
      <SettingsForm initial={config} />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
npx tsc --noEmit
git add -A
git commit -m "feat: add admin settings form with store identity, VAT, shipping, notifications"
```

---

## Task 8: Admin smoke test

**Files:** (none — verification only)

- [ ] **Step 1: Ensure ADMIN_DEV_BYPASS=1 in .env.local**

```bash
grep ADMIN_DEV_BYPASS .env.local
```

Expected: `ADMIN_DEV_BYPASS=1`

- [ ] **Step 2: Run dev server**

```bash
npm run dev
```

- [ ] **Step 3: Walk the admin UI**

- [ ] Visit `http://localhost:3000/admin` — dashboard renders with stat cards
- [ ] Previous orders from Plan 3 testing appear in the Recent orders table
- [ ] Click an order number → order detail page shows items, customer, payment info
- [ ] Click a status button (e.g. "fulfilled") — page updates, `data/orders.local.json` reflects the change
- [ ] Navigate to Products → all 25 seed products render
- [ ] Click Edit on a product → form populates with current values
- [ ] Change the price on a variant, click Save → redirects to list, product detail page shows new price
- [ ] Create a new product via Add Product → appears in list after save
- [ ] Navigate to Enquiries → the test enquiry from Plan 3 appears
- [ ] Expand the enquiry, click "Mark as replied" → status badge updates
- [ ] Navigate to Customers → empty state shows (Firebase Auth not wired in Stage 1a)
- [ ] Navigate to Settings → form populates with default config
- [ ] Change the store name to "Sam's Research Supply" and save
- [ ] Verify the storefront navbar (different tab / incognito) now shows the new store name — wait, it's hardcoded as `[PEPTIDE STORE]` in navbar currently. This is a known gap to be fixed in Plan 5 smoke test.

- [ ] **Step 4: Disable the dev bypass temporarily and verify auth guard**

Set `ADMIN_DEV_BYPASS=0` in `.env.local`, restart dev server, visit `/admin` — expected: redirect to `/sign-in?redirect=/admin`.

Re-enable `ADMIN_DEV_BYPASS=1` and restart for continued development.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Plan 4 admin UI milestone — full dashboard, products, orders, enquiries, customers, settings"
```

---

## Plan 4 completion summary

At this point the admin UI should have:

- `(admin)` route group with layout + sidebar + auth guard
- `lib/admin-auth.ts` with Firebase Auth session cookie check + dev bypass
- Dashboard with stat cards and recent orders
- Products list with search and category filter
- Product editor (new and edit) with basic info, chemical identity, variants, SEO sections
- Orders list with status filter
- Order detail with full order breakdown and status transition controls
- Enquiries list with expand-to-read and mark-as-replied
- Customers list (empty in Stage 1a)
- Settings form saving to `config/main`

**Known gaps (intentional, addressed in later plans or Stage 1b):**

- Product editor image and COA upload — Stage 1b (requires Firebase Storage)
- Navbar/footer reading live `storeName` from config — Plan 5 smoke test
- Customer list populated with real accounts — Stage 1b
- Admin custom claim script → Plan 5 launch prep
- SEO metadata, JSON-LD, legal content → Plan 5

---

## END-OF-PLAN REVIEW CHECKPOINT — STOP HERE

**Do not proceed to Plan 5 until David has confirmed that the Opus review is complete.**

### What Sonnet should do when this plan is complete

1. **Stop.** Do not start Plan 5.
2. **Post the report below** to David.
3. **Wait** for the Opus review.

### Report template — copy, fill in, send to David

````markdown
## Plan 4 (Admin UI) — execution report

**Git log range:** `<first>..<last>` (8 tasks expected)

**Task completion:**
- [x] Task 1: Admin route group + layout with auth guard
- [x] Task 2: Admin dashboard
- [x] Task 3: Products list page
- [x] Task 4: Product form + new/edit routes
- [x] Task 5: Orders list and detail
- [x] Task 6: Enquiries + customers
- [x] Task 7: Settings page
- [x] Task 8: Admin smoke test

**Admin UI walkthrough results (Task 8 checklist):**
- Dashboard loads with stats: PASS / FAIL
- Products list renders all 25 seed products: PASS / FAIL
- Product edit saves and appears on storefront: PASS / FAIL  ← critical, tests the overlay fix
- Orders from Plan 3 visible in admin list: PASS / FAIL
- Order status transitions persist: PASS / FAIL
- Contact form enquiries visible in admin: PASS / FAIL
- Settings form saves: PASS / FAIL
- Auth bypass flag (`ADMIN_DEV_BYPASS=0`) correctly blocks access: PASS / FAIL

**Deviations from plan:**
- ...

**Judgment calls I made:**
- ...

**Blockers hit:**
- ...

**Verification results:**
- `npx tsc --noEmit`: PASS / FAIL
- `npm run build`: PASS / FAIL

**Notes for David's review:**
- ...
````

### What David's Opus review will specifically check for Plan 4

1. **The products overlay fix actually works end-to-end.** This is the single most important test of the whole plan. Edit a product in `/admin/products/[id]`, save, navigate to the public product detail page, verify the change is visible. If this fails, Plan 1's `lib/products.ts` merge logic is broken and has to be fixed before Plan 5.
2. **Admin dev bypass behaviour.** Set `ADMIN_DEV_BYPASS=0`, verify admin routes redirect to sign-in. Set back to `1`, verify access. The bypass must be switchable and must NOT survive into production.
3. **Order status transitions.** Pending → paid → fulfilled chain. Each transition must persist to `data/orders.local.json`.
4. **Settings form → live config.** Changing `storeName` in settings should persist to `data/config.local.json` — but will NOT yet appear in the navbar/footer (Plan 5 wires that). Opus will confirm the write happens but the absence of a live nav update is expected.
5. **Visual consistency.** The admin UI should feel like part of the same product as the storefront, not a generic shadcn dashboard template. Same navy/white palette, same editorial typography where possible, no out-of-place colors or components.
6. **Destructive action safety.** No delete-on-single-click anywhere. Any destructive action should go through a shadcn AlertDialog.

### How David triggers the review

> Plan 4 is complete. Commits `<first>..<last>`. Please walk the admin UI, specifically verify the product-edit-reflects-on-storefront path (the overlay fix), and update Plan 5's "Review notes from Plan 4" section before confirming.

---

Proceed to **Plan 5: SEO + Content + Launch Prep** — ONLY after the Opus review is complete.
