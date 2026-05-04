// types/customer-events.ts
import type { Timestamp } from "firebase-admin/firestore";

export const ALL_CUSTOMER_EVENT_TYPES = [
  "product.viewed",
  "basket.item_added",
  "basket.item_removed",
  "checkout.delivery_submitted",
  "checkout.purchased",
  "auth.signup_completed",
] as const;

export type CustomerEventType = (typeof ALL_CUSTOMER_EVENT_TYPES)[number];

export type CustomerEvent = {
  id: string;
  createdAt: Date;
  eventType: CustomerEventType;
  sessionId: string;
  uid: string | null;
  email: string | null;
  payload: Record<string, unknown>;
};

export type CustomerEventWritable = Omit<CustomerEvent, "id" | "createdAt"> & {
  createdAt: Timestamp;
  expiresAt: Timestamp;
};
