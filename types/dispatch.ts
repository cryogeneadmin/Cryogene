import type { Timestamp } from "firebase/firestore";
import type { Address } from "./order";

/**
 * Royal Mail GB service codes used at launch. International codes added
 * via upsell 3.4. Verify against current Click & Drop API documentation
 * before committing — Royal Mail occasionally renames codes.
 */
export const ROYAL_MAIL_GB_SERVICES = {
  TPN24: { label: "Tracked 24", maxKg: 20 },
  TPN48: { label: "Tracked 48", maxKg: 20 },
} as const;

export type RoyalMailServiceCode = keyof typeof ROYAL_MAIL_GB_SERVICES;

export type DispatchConfig = {
  enabled: boolean;
  returnAddress: Address;
  senderName: string;
  defaultServiceCodeByCountry: Record<string, RoyalMailServiceCode>;
  obaAccountNumber: string;
  batchScheduleCron: string;
  batchScheduleTimezone: string;
  defaultWeightGrams: number;
  zebraPrinterDeviceId: string;
  trackingWebhookUrl: string;
};

export type ShippingRates = {
  /** Rate in pence keyed by ISO 3166-1 alpha-2 country code. */
  rates: Record<string, number>;
};

export type DispatchBatchRun = {
  id: string;
  startedAt: Timestamp | Date;
  completedAt: Timestamp | Date | null;
  triggeredBy: "schedule" | "admin";
  triggeredByActor: { uid: string | null; email: string | null };
  ordersProcessed: number;
  ordersFailed: number;
  errors: Array<{ orderId: string; orderNumber: string; message: string }>;
  durationMs: number;
};
