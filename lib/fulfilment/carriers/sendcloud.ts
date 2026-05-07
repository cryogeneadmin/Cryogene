import "server-only";
import type { CarrierAdapter } from "./types";

/**
 * Typed stub. Sendcloud activation is upsell 3.5 — multi-carrier abstraction.
 * Throwing here means a misconfigured COURIER_PLATFORM=sendcloud at runtime
 * surfaces immediately rather than silently falling through.
 */
export const sendcloudCarrier: CarrierAdapter = {
  async createShipment() {
    throw new Error("Sendcloud carrier not implemented — see upsell 3.5");
  },
  async voidShipment() {
    throw new Error("Sendcloud carrier not implemented — see upsell 3.5");
  },
  async subscribeTracking() {
    throw new Error("Sendcloud carrier not implemented — see upsell 3.5");
  },
};
