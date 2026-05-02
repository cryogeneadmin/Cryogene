import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import type { Order, OrderStatus } from "@/types";
import { getAdminDb } from "@/lib/firebase/admin";
import { isSeedMode } from "@/lib/data-mode";

const LOCAL_ORDERS_PATH = path.join(process.cwd(), "data", "orders.local.json");
const LOCAL_COUNTERS_PATH = path.join(process.cwd(), "data", "counters.local.json");

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
  return snap.docs.map((d) => d.data() as Order);
}

export async function getOrderById(id: string): Promise<Order | null> {
  if (isSeedMode()) {
    const orders = await readLocalOrders();
    return orders.find((o) => o.id === id) ?? null;
  }
  const db = getAdminDb()!;
  const snap = await db.doc(`orders/${id}`).get();
  return snap.exists ? (snap.data() as Order) : null;
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
