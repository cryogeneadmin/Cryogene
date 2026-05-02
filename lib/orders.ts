import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import type { Order, OrderStatus, Product, ProductVariant } from "@/types";
import { getAdminDb } from "@/lib/firebase/admin";
import { isSeedMode } from "@/lib/data-mode";
import { Timestamp } from "firebase-admin/firestore";
import type { DocumentReference } from "firebase-admin/firestore";

const LOCAL_ORDERS_PATH = path.join(process.cwd(), "data", "orders.local.json");
const LOCAL_COUNTERS_PATH = path.join(process.cwd(), "data", "counters.local.json");

// Firestore Admin SDK returns Timestamp class instances for date fields.
// Next.js 16 RSC cannot serialize class instances across the Server→Client
// boundary. Normalize all date fields to Date at the read boundary.
function normalizeOrder(raw: Record<string, unknown>): Order {
  const out: Record<string, unknown> = { ...raw };

  // Top-level date fields
  for (const key of ["createdAt", "updatedAt", "researchConfirmedAt", "ageGatePassedAt"] as const) {
    const v = out[key];
    if (v instanceof Timestamp) out[key] = v.toDate();
  }

  // Nested: payment sub-object
  if (out.payment && typeof out.payment === "object") {
    const payment = { ...(out.payment as Record<string, unknown>) };
    for (const key of ["initiatedAt", "paidAt", "failedAt"] as const) {
      const v = payment[key];
      if (v instanceof Timestamp) payment[key] = v.toDate();
    }
    out.payment = payment;
  }

  // Nested: fulfilment sub-object
  if (out.fulfilment && typeof out.fulfilment === "object") {
    const fulfilment = { ...(out.fulfilment as Record<string, unknown>) };
    for (const key of ["printedAt", "dispatchedAt", "customerEmailedAt"] as const) {
      const v = fulfilment[key];
      if (v instanceof Timestamp) fulfilment[key] = v.toDate();
    }
    out.fulfilment = fulfilment;
  }

  return out as unknown as Order;
}

async function readLocalOrders(): Promise<Order[]> {
  try {
    const raw = await fs.readFile(LOCAL_ORDERS_PATH, "utf-8");
    return JSON.parse(raw) as Order[];
  } catch {
    return [];
  }
}

async function writeLocalOrders(orders: Order[]): Promise<void> {
  await fs.writeFile(LOCAL_ORDERS_PATH, JSON.stringify(orders, null, 2), "utf-8");
}

async function nextOrderNumber(): Promise<string> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  if (isSeedMode()) {
    let counters: Record<string, number> = {};
    try {
      counters = JSON.parse(await fs.readFile(LOCAL_COUNTERS_PATH, "utf-8"));
    } catch {}
    counters[today] = (counters[today] ?? 0) + 1;
    await fs.writeFile(LOCAL_COUNTERS_PATH, JSON.stringify(counters), "utf-8");
    return `PPT-${today}-${String(counters[today]).padStart(4, "0")}`;
  }

  const db = getAdminDb()!;
  const counterRef = db.doc(`orderCounters/${today}`);
  const counter = await db.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef);
    const next = (snap.exists ? (snap.data()!.count as number) : 0) + 1;
    tx.set(counterRef, { count: next });
    return next;
  });
  return `PPT-${today}-${String(counter).padStart(4, "0")}`;
}

export async function createOrderRecord(order: Omit<Order, "id">): Promise<Order> {
  if (isSeedMode()) {
    const orders = await readLocalOrders();
    const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const withId = { ...order, id } as Order;
    orders.push(withId);
    await writeLocalOrders(orders);
    return withId;
  }
  const db = getAdminDb()!;
  const ref = db.collection("orders").doc();
  await ref.set({ ...order, id: ref.id });
  return { ...order, id: ref.id } as Order;
}

export async function getOrders(options?: {
  customerUid?: string;
  status?: OrderStatus;
  limit?: number;
}): Promise<Order[]> {
  if (isSeedMode()) {
    let results = await readLocalOrders();
    if (options?.customerUid) {
      results = results.filter((o) => o.customer.uid === options.customerUid);
    }
    if (options?.status) {
      results = results.filter((o) => o.status === options.status);
    }
    if (options?.limit) {
      results = results.slice(0, options.limit);
    }
    return results.sort((a, b) => {
      const bTime = b.createdAt instanceof Date
        ? (b.createdAt as Date).getTime()
        : new Date((b.createdAt as unknown as string)).getTime();
      const aTime = a.createdAt instanceof Date
        ? (a.createdAt as Date).getTime()
        : new Date((a.createdAt as unknown as string)).getTime();
      return bTime - aTime;
    });
  }
  const db = getAdminDb()!;
  let query = db.collection("orders").orderBy("createdAt", "desc");
  if (options?.customerUid) {
    query = query.where("customer.uid", "==", options.customerUid);
  }
  if (options?.status) {
    query = query.where("status", "==", options.status);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  const snap = await query.get();
  return snap.docs.map((d) => normalizeOrder(d.data() as Record<string, unknown>));
}

export async function getOrderById(id: string): Promise<Order | null> {
  if (isSeedMode()) {
    const orders = await readLocalOrders();
    return orders.find((o) => o.id === id) ?? null;
  }
  const db = getAdminDb()!;
  const snap = await db.doc(`orders/${id}`).get();
  return snap.exists ? normalizeOrder(snap.data() as Record<string, unknown>) : null;
}

export async function updateOrder(id: string, patch: Partial<Order>): Promise<void> {
  if (isSeedMode()) {
    const orders = await readLocalOrders();
    const idx = orders.findIndex((o) => o.id === id);
    if (idx === -1) throw new Error(`Order ${id} not found`);
    orders[idx] = { ...orders[idx], ...patch, updatedAt: new Date() } as Order;
    await writeLocalOrders(orders);
    return;
  }
  const db = getAdminDb()!;
  await db.doc(`orders/${id}`).update({ ...patch, updatedAt: new Date() });
}

export { nextOrderNumber };

// ---------------------------------------------------------------------------
// Transactional order creation with atomic stock decrement
// ---------------------------------------------------------------------------

type OrderItemRef = { productId: string; sku: string; quantity: number };

type CreateOrderTransactionInput = Omit<Order, "id" | "orderNumber" | "createdAt" | "updatedAt"> & {
  itemRefs: OrderItemRef[];
};

export async function createOrderTransaction(
  input: CreateOrderTransactionInput
): Promise<Order> {
  if (isSeedMode()) {
    // Seed mode: no real txn, fall back to existing behaviour
    const orderNumber = await nextOrderNumber();
    const orders = await readLocalOrders();
    const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const { itemRefs, ...orderFields } = input;
    void itemRefs;
    const order = {
      ...orderFields,
      id,
      orderNumber,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Order;
    orders.push(order);
    await writeLocalOrders(orders);
    return order;
  }

  const db = getAdminDb();
  if (!db) throw new Error("Firestore not configured");

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const counterRef = db.doc(`orderCounters/${today}`);
  const orderRef = db.collection("orders").doc();

  const productRefs = input.itemRefs.map((i) =>
    db.doc(`products/${i.productId}`)
  );

  return db.runTransaction(async (tx) => {
    // Read-phase
    const productSnaps = await tx.getAll(...productRefs);
    const counterSnap = await tx.get(counterRef);

    const productUpdates: Array<{
      ref: DocumentReference;
      newVariants: ProductVariant[];
    }> = [];

    for (let i = 0; i < input.itemRefs.length; i++) {
      const item = input.itemRefs[i]!;
      const productSnap = productSnaps[i];
      if (!productSnap || !productSnap.exists) {
        throw new Error(`Product ${item.productId} no longer exists`);
      }
      const product = productSnap.data() as Product;
      const variantIndex = product.variants.findIndex(
        (v) => v.sku === item.sku
      );
      if (variantIndex === -1) {
        throw new Error(`Variant ${item.sku} no longer exists`);
      }
      const variant = product.variants[variantIndex]!;
      if (!variant.active) {
        throw new Error(`${product.name} (${variant.size}) is no longer active`);
      }
      if (variant.stock < item.quantity) {
        throw new Error(
          `Only ${variant.stock} of ${product.name} (${variant.size}) remain in stock`
        );
      }

      const newVariants = [...product.variants];
      newVariants[variantIndex] = {
        ...variant,
        stock: variant.stock - item.quantity,
      };
      productUpdates.push({ ref: productSnap.ref, newVariants });
    }

    const currentCount = counterSnap.exists
      ? (counterSnap.data()!.count as number)
      : 0;
    const newCount = currentCount + 1;
    const orderNumber = `PPT-${today}-${String(newCount).padStart(4, "0")}`;

    // Write-phase
    for (const update of productUpdates) {
      tx.update(update.ref, { variants: update.newVariants });
    }
    tx.set(counterRef, { count: newCount });

    const { itemRefs, ...orderFields } = input;
    void itemRefs;
    const orderDoc = {
      ...orderFields,
      id: orderRef.id,
      orderNumber,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Order;
    tx.set(orderRef, orderDoc);

    return orderDoc;
  });
}
