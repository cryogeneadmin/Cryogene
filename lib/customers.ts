import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import type { Customer } from "@/types";
import { getAdminDb } from "@/lib/firebase/admin";

const LOCAL_CUSTOMERS_PATH = path.join(process.cwd(), "data", "customers.local.json");

function useSeed(): boolean {
  return getAdminDb() === null;
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
  if (useSeed()) {
    const list = await readLocal();
    return list.find((c) => c.id === id) ?? null;
  }
  const snap = await getAdminDb()!.doc(`customers/${id}`).get();
  return snap.exists ? (snap.data() as Customer) : null;
}

export async function getCustomerByEmail(email: string): Promise<Customer | null> {
  if (useSeed()) {
    const list = await readLocal();
    return list.find((c) => c.email === email) ?? null;
  }
  const snap = await getAdminDb()!
    .collection("customers")
    .where("email", "==", email)
    .limit(1)
    .get();
  return snap.empty ? null : (snap.docs[0]!.data() as Customer);
}

export async function upsertCustomer(customer: Customer): Promise<void> {
  if (useSeed()) {
    const list = await readLocal();
    const idx = list.findIndex((c) => c.id === customer.id);
    if (idx === -1) list.push(customer);
    else list[idx] = customer;
    await writeLocal(list);
    return;
  }
  await getAdminDb()!.doc(`customers/${customer.id}`).set(customer, { merge: true });
}

export async function getCustomers(limit?: number): Promise<Customer[]> {
  if (useSeed()) {
    const list = await readLocal();
    return limit ? list.slice(0, limit) : list;
  }
  let query = getAdminDb()!.collection("customers").orderBy("createdAt", "desc");
  if (limit) query = query.limit(limit);
  const snap = await query.get();
  return snap.docs.map((d) => d.data() as Customer);
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
