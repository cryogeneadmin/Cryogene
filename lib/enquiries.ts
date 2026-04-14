import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import type { Enquiry, EnquiryStatus } from "@/types";
import { getAdminDb } from "@/lib/firebase/admin";
import { isSeedMode } from "@/lib/data-mode";

const LOCAL_ENQUIRIES_PATH = path.join(process.cwd(), "data", "enquiries.local.json");

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
  const db = getAdminDb()!;
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
  let query = getAdminDb()!.collection("enquiries").orderBy("createdAt", "desc");
  if (status) query = query.where("status", "==", status);
  const snap = await query.get();
  return snap.docs.map((d) => d.data() as Enquiry);
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
  await getAdminDb()!.doc(`enquiries/${id}`).update({ status });
}
