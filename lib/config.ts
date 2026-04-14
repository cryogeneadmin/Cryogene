import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import type { Config } from "@/types";
import { getAdminDb } from "@/lib/firebase/admin";

const LOCAL_CONFIG_PATH = path.join(process.cwd(), "data", "config.local.json");

const DEFAULT_CONFIG: Config = {
  storeName: "Cryogene",
  storeEmail: "hello@cryogene.co.uk",
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
    newOrderEmailTo: "orders@cryogene.co.uk",
  },
  updatedAt: new Date() as unknown as Date,
  updatedBy: "seed",
};

export async function getConfig(): Promise<Config> {
  const db = getAdminDb();
  if (!db) {
    try {
      const raw = await fs.readFile(LOCAL_CONFIG_PATH, "utf-8");
      return JSON.parse(raw) as Config;
    } catch {
      return DEFAULT_CONFIG;
    }
  }
  const snap = await db.doc("config/main").get();
  return snap.exists ? (snap.data() as Config) : DEFAULT_CONFIG;
}

export async function updateConfig(patch: Partial<Config>): Promise<void> {
  const db = getAdminDb();
  if (!db) {
    const current = await getConfig();
    const updated = {
      ...current,
      ...patch,
      updatedAt: new Date(),
    };
    await fs.writeFile(LOCAL_CONFIG_PATH, JSON.stringify(updated, null, 2), "utf-8");
    return;
  }
  await db.doc("config/main").set({ ...patch, updatedAt: new Date() }, { merge: true });
}
