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
  country: "GB";
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

export type OrderFulfilment = {
  carrier: "royalmail" | "sendcloud" | "shippo" | null;
  trackingNumber: string | null;
  labelUrl: string | null;
  printedAt: Timestamp | Date | null;
  printerStatus: "pending" | "printed" | "failed" | null;
  dispatchedAt: Timestamp | Date | null;
  customerEmailedAt: Timestamp | Date | null;
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
