import "server-only";
import type { Address } from "@/types/order";
import type { RoyalMailServiceCode } from "@/types/dispatch";

export type CustomsDeclaration = {
  items: Array<{
    description: string;
    hsCode: string;
    quantity: number;
    valueInPence: number;
    weightGrams: number;
  }>;
  totalValueInPence: number;
};

export type ShipmentInput = {
  orderId: string;
  orderNumber: string;
  destinationAddress: Address;
  destinationName: string;
  destinationEmail: string;
  destinationPhone: string | null;
  senderAddress: Address;
  senderName: string;
  serviceCode: RoyalMailServiceCode;
  weightGrams: number;
  /** Required when destination country !== "GB". Null otherwise. */
  customs: CustomsDeclaration | null;
};

export type ShipmentResult = {
  carrierOrderId: string;
  trackingNumber: string;
  labelPdfUrl: string;
};

export type CarrierAdapter = {
  createShipment(input: ShipmentInput): Promise<ShipmentResult>;
  voidShipment(carrierOrderId: string): Promise<void>;
  /**
   * Subscribe an HTTPS webhook to receive tracking milestones for this shipment.
   * Fire-and-forget — failure logs but does not block label generation.
   */
  subscribeTracking(input: { trackingNumber: string; webhookUrl: string }): Promise<void>;
};
