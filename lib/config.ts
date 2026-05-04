import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import type { Config } from "@/types";
import { getAdminDb } from "@/lib/firebase/admin";
import { isSeedMode } from "@/lib/data-mode";
import { Timestamp } from "firebase-admin/firestore";
import { cacheTag } from "next/cache";

function normalizeConfig(raw: Record<string, unknown>): Config {
  const out: Record<string, unknown> = { ...raw };
  if (out.updatedAt instanceof Timestamp) out.updatedAt = out.updatedAt.toDate();
  return out as unknown as Config;
}

const LOCAL_CONFIG_PATH = path.join(process.cwd(), "data", "config.local.json");

const DEFAULT_CONFIG: Config = {
  storeName: "Cryogene Laboratories",
  storeEmail: "hello@cryogenelaboratories.co.uk",
  storePhone: null,
  registeredAddress: "[ADDRESS TBC]",
  companyNumber: null,
  vatNumber: null,
  shipping: {
    flatRateInPence: 495,
    freeThresholdInPence: 7500,
    estimatedDispatch: "Dispatched within 1 working day",
  },
  vat: {
    registered: false,
    rate: 0.2,
    displayPricesInclusive: false,
  },
  notifications: {
    newOrderEmailTo: "orders@cryogenelaboratories.co.uk",
  },
  updatedAt: new Date(),
  updatedBy: "seed",
};

export async function getConfig(): Promise<Config> {
  "use cache";
  cacheTag("config");
  if (isSeedMode()) {
    try {
      const raw = await fs.readFile(LOCAL_CONFIG_PATH, "utf-8");
      return JSON.parse(raw) as Config;
    } catch {
      return DEFAULT_CONFIG;
    }
  }
  const db = getAdminDb()!;
  const snap = await db.doc("config/main").get();
  return snap.exists ? normalizeConfig(snap.data() as Record<string, unknown>) : DEFAULT_CONFIG;
}

export async function updateConfig(patch: Partial<Config>): Promise<void> {
  if (isSeedMode()) {
    const current = await getConfig();
    const updated = {
      ...current,
      ...patch,
      updatedAt: new Date(),
    };
    await fs.writeFile(LOCAL_CONFIG_PATH, JSON.stringify(updated, null, 2), "utf-8");
    return;
  }
  const db = getAdminDb()!;
  await db.doc("config/main").set({ ...patch, updatedAt: new Date() }, { merge: true });
}
