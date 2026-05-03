import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import type { Enquiry, EnquiryStatus } from "@/types";
import { getAdminDb } from "@/lib/firebase/admin";
import { isSeedMode } from "@/lib/data-mode";
import { Timestamp } from "firebase-admin/firestore";

const LOCAL_ENQUIRIES_PATH = path.join(process.cwd(), "data", "enquiries.local.json");

// Firestore Admin SDK returns Timestamp class instances; normalize to Date
// at the read boundary so RSC can serialize across Server→Client.
function normalizeEnquiry(raw: Record<string, unknown>): Enquiry {
  const out: Record<string, unknown> = { ...raw };
  const v = out.createdAt;
  if (v instanceof Timestamp) out.createdAt = v.toDate();
  return out as unknown as Enquiry;
}

async function readLocal(): Promise<Enquiry[]> {
  try {
    return JSON.parse(await fs.readFile(LOCAL_ENQUIRIES_PATH, "utf-8"));
  } catch {
    return [];
  }
}

async function writeLocal(list: Enquiry[]): Promise<void> {
  await fs.writeFile(LOCAL_ENQUIRIES_PATH, JSON.stringify(list, null, 2), "utf-8");
}

export async function createEnquiry(
  data: Omit<Enquiry, "id" | "createdAt" | "status">
): Promise<Enquiry> {
  const enquiry: Enquiry = {
    ...data,
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: "new",
    createdAt: new Date(),
  };

  if (isSeedMode()) {
    const list = await readLocal();
    list.push(enquiry);
    await writeLocal(list);
    return enquiry;
  }
  const db = getAdminDb();
  if (!db) throw new Error("Firestore not configured");
  const ref = db.collection("enquiries").doc();
  enquiry.id = ref.id;
  await ref.set(enquiry);
  return enquiry;
}

export async function getEnquiries(status?: EnquiryStatus): Promise<Enquiry[]> {
  if (isSeedMode()) {
    const list = await readLocal();
    return status ? list.filter((e) => e.status === status) : list;
  }
  const db = getAdminDb();
  if (!db) throw new Error("Firestore not configured");
  let query = db.collection("enquiries").orderBy("createdAt", "desc");
  if (status) query = query.where("status", "==", status);
  const snap = await query.get();
  return snap.docs.map((d) => normalizeEnquiry(d.data() as Record<string, unknown>));
}

export async function updateEnquiryStatus(
  id: string,
  status: EnquiryStatus
): Promise<void> {
  if (isSeedMode()) {
    const list = await readLocal();
    const idx = list.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error(`Enquiry ${id} not found`);
    list[idx] = { ...list[idx]!, status };
    await writeLocal(list);
    return;
  }
  const db = getAdminDb();
  if (!db) throw new Error("Firestore not configured");
  await db.doc(`enquiries/${id}`).update({ status });
}
