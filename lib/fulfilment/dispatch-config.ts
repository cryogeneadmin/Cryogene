import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import type { DispatchConfig } from "@/types/dispatch";

const DEFAULT_CONFIG: DispatchConfig = {
  enabled: false,
  returnAddress: { line1: "", line2: null, city: "", postcode: "", country: "GB" },
  senderName: "Cryogene Laboratories",
  defaultServiceCodeByCountry: { GB: "TPN48" },
  obaAccountNumber: "",
  batchScheduleCron: "0 13 * * 1-5",
  batchScheduleTimezone: "Europe/London",
  defaultWeightGrams: 100,
  zebraPrinterDeviceId: "",
  trackingWebhookUrl: "",
};

export async function getDispatchConfig(): Promise<DispatchConfig> {
  const db = getAdminDb();
  if (!db) return DEFAULT_CONFIG;
  const snap = await db.collection("config").doc("dispatch").get();
  if (!snap.exists) return DEFAULT_CONFIG;
  const data = snap.data() ?? {};
  return { ...DEFAULT_CONFIG, ...data } as DispatchConfig;
}
