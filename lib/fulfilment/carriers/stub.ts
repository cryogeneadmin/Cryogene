import "server-only";
import type { CarrierAdapter, ShipmentInput, ShipmentResult } from "./types";

const FAIL_NEXT_FLAG = "STUB_CARRIER_FAIL_NEXT";

export const stubCarrier: CarrierAdapter = {
  async createShipment(input: ShipmentInput): Promise<ShipmentResult> {
    if (process.env[FAIL_NEXT_FLAG] === "1") {
      // Reset so the next call succeeds — useful for one-shot failure simulation.
      delete process.env[FAIL_NEXT_FLAG];
      throw new Error("Stub carrier: simulated failure (STUB_CARRIER_FAIL_NEXT=1)");
    }
    const trackingNumber = `STUBTRACK${input.orderId.slice(0, 6).toUpperCase()}`;
    return {
      carrierOrderId: `stub-${input.orderId}`,
      trackingNumber,
      labelPdfUrl: "/dev-fixtures/sample-label.pdf",
    };
  },

  async voidShipment(carrierOrderId: string): Promise<void> {
    console.log(`[stubCarrier] voidShipment(${carrierOrderId}) — no-op`);
  },

  async subscribeTracking({ trackingNumber, webhookUrl }): Promise<void> {
    console.log(`[stubCarrier] subscribeTracking(${trackingNumber}, ${webhookUrl}) — no-op`);
  },
};
