import type { Timestamp } from "firebase/firestore";

export type OrderStatus =
  | "pending"
  | "paid"
  | "fulfilled"
  | "cancelled"
  | "refunded";

export type Address = {
  line1: string;
  line2: string | null;
  city: string;
  postcode: string;
  /**
   * ISO 3166-1 alpha-2 country code. Phase 3 launches GB-only — Zod schemas
   * enforce GB at the validation boundary. International activation is a
   * Zod allowlist change (see spec §13: International Activation Runbook).
   */
  country: string;
};

export type OrderCustomer = {
  uid: string | null;
  email: string;
  name: string;
  phone: string | null;
  address: Address;
};

export type OrderLineItem = {
  productId: string;
  productSlug: string;
  name: string;
  sku: string;
  size: string;
  unitPriceInPence: number;
  quantity: number;
  lineTotalInPence: number;
};

export type OrderPayment = {
  provider: "stub" | "truelayer";
  providerRef: string | null;
  initiatedAt: Timestamp | Date;
  paidAt: Timestamp | Date | null;
  failedAt: Timestamp | Date | null;
  failureReason: string | null;
};

export type TrackingMilestone =
  | "collected"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "failed";

export type TrackingEvent = {
  milestone: TrackingMilestone;
  timestamp: Timestamp | Date;
  location: string | null;
  /** Raw Royal Mail webhook payload, capped at ~1KB. */
  raw: Record<string, unknown>;
};

export type OrderFulfilment = {
  carrier: "royalmail" | "sendcloud" | "shippo" | null;
  carrierOrderId: string | null;
  trackingNumber: string | null;
  labelUrl: string | null;
  printedAt: Timestamp | Date | null;
  printerStatus: "pending" | "printed" | "failed" | null;
  dispatchedAt: Timestamp | Date | null;
  customerEmailedAt: Timestamp | Date | null;
  lastError: string | null;
  trackingEvents: TrackingEvent[];
  lastTrackingStatus: TrackingMilestone | null;
};

export type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;

  customer: OrderCustomer;
  items: OrderLineItem[];

  itemsSubtotalInPence: number;
  shippingCostInPence: number;
  vatAmountInPence: number;
  totalInPence: number;
  vatRateAtPurchase: number;
  /**
   * ISO 4217 currency code. Always "GBP" at launch. Future multi-currency
   * support widens this and updates price formatters.
   */
  currencyCode: string;

  researchConfirmed: boolean;
  researchConfirmedAt: Timestamp | Date;
  ageGateConfirmed: boolean;
  ageGatePassedAt: Timestamp | Date;
  researchUseConfirmationVersion: string;
  ageGateConfirmationVersion: string;
  termsAccepted: boolean;
  termsAcceptedVersion: string;

  payment: OrderPayment;
  fulfilment: OrderFulfilment;

  adminNotes: string | null;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
};
