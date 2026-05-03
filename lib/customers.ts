import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import type { Customer } from "@/types";
import { getAdminDb } from "@/lib/firebase/admin";
import { isSeedMode } from "@/lib/data-mode";
import { Timestamp } from "firebase-admin/firestore";
import { cacheTag } from "next/cache";

const LOCAL_CUSTOMERS_PATH = path.join(process.cwd(), "data", "customers.local.json");

// Firestore Admin SDK returns Timestamp class instances; normalize to Date
// at the read boundary so RSC can serialize across Server→Client.
function normalizeCustomer(raw: Record<string, unknown>): Customer {
  const out: Record<string, unknown> = { ...raw };
  for (const key of ["createdAt", "lastLoginAt"] as const) {
    const v = out[key];
    if (v instanceof Timestamp) out[key] = v.toDate();
  }
  return out as unknown as Customer;
}

async function readLocal(): Promise<Customer[]> {
  try {
    return JSON.parse(await fs.readFile(LOCAL_CUSTOMERS_PATH, "utf-8"));
  } catch {
    return [];
  }
}

async function writeLocal(customers: Customer[]): Promise<void> {
  await fs.writeFile(LOCAL_CUSTOMERS_PATH, JSON.stringify(customers, null, 2), "utf-8");
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  if (isSeedMode()) {
    const list = await readLocal();
    return list.find((c) => c.id === id) ?? null;
  }
  const db = getAdminDb();
  if (!db) throw new Error("Firestore not configured");
  const snap = await db.doc(`customers/${id}`).get();
  return snap.exists ? normalizeCustomer(snap.data() as Record<string, unknown>) : null;
}

export async function getCustomerByEmail(email: string): Promise<Customer | null> {
  if (isSeedMode()) {
    const list = await readLocal();
    return list.find((c) => c.email === email) ?? null;
  }
  const db = getAdminDb();
  if (!db) throw new Error("Firestore not configured");
  const snap = await db
    .collection("customers")
    .where("email", "==", email)
    .limit(1)
    .get();
  return snap.empty ? null : normalizeCustomer(snap.docs[0]!.data() as Record<string, unknown>);
}

export async function upsertCustomer(customer: Customer): Promise<void> {
  if (isSeedMode()) {
    const list = await readLocal();
    const idx = list.findIndex((c) => c.id === customer.id);
    if (idx === -1) list.push(customer);
    else list[idx] = customer;
    await writeLocal(list);
    return;
  }
  const db = getAdminDb();
  if (!db) throw new Error("Firestore not configured");
  await db.doc(`customers/${customer.id}`).set(customer, { merge: true });
}

export async function getCustomers(limit?: number): Promise<Customer[]> {
  "use cache";
  cacheTag("customers");
  if (isSeedMode()) {
    const list = await readLocal();
    return limit ? list.slice(0, limit) : list;
  }
  const db = getAdminDb();
  if (!db) throw new Error("Firestore not configured");
  let query = db.collection("customers").orderBy("createdAt", "desc");
  if (limit) query = query.limit(limit);
  const snap = await query.get();
  return snap.docs.map((d) => normalizeCustomer(d.data() as Record<string, unknown>));
}

export async function incrementCustomerStats(
  uid: string,
  orderTotalInPence: number
): Promise<void> {
  const existing = await getCustomerById(uid);
  if (!existing) return;
  await upsertCustomer({
    ...existing,
    orderCount: existing.orderCount + 1,
    lifetimeValueInPence: existing.lifetimeValueInPence + orderTotalInPence,
  });
}
