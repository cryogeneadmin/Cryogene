import "server-only";
import type { CarrierAdapter } from "./types";

export const shippoCarrier: CarrierAdapter = {
  async createShipment() {
    throw new Error("Shippo carrier not implemented — see upsell 3.5");
  },
  async voidShipment() {
    throw new Error("Shippo carrier not implemented — see upsell 3.5");
  },
  async subscribeTracking() {
    throw new Error("Shippo carrier not implemented — see upsell 3.5");
  },
};
