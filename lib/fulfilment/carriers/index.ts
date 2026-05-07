import "server-only";
import type { CarrierAdapter } from "./types";
import { stubCarrier } from "./stub";
import { royalMailCarrier } from "./royalmail";
import { sendcloudCarrier } from "./sendcloud";
import { shippoCarrier } from "./shippo";
import { getDispatchConfig } from "@/lib/fulfilment/dispatch-config";

let warnedOnce = false;

export async function getCarrier(): Promise<CarrierAdapter> {
  const platform = process.env.COURIER_PLATFORM ?? "stub";
  const config = await getDispatchConfig();

  if (platform === "stub") return stubCarrier;

  if (platform === "royalmail") {
    const hasKey = !!process.env.ROYALMAIL_CLICK_AND_DROP_API_KEY;
    if (hasKey && config.enabled) {
      return royalMailCarrier;
    }
    if (!warnedOnce) {
      const reason = !hasKey
        ? "ROYALMAIL_CLICK_AND_DROP_API_KEY missing"
        : "config.enabled=false";
      console.warn(
        `Carrier selector: COURIER_PLATFORM=royalmail but ${reason} — falling back to stub`
      );
      warnedOnce = true;
    }
    return stubCarrier;
  }

  if (platform === "sendcloud") return sendcloudCarrier;
  if (platform === "shippo") return shippoCarrier;

  if (!warnedOnce) {
    console.warn(`Carrier selector: unknown COURIER_PLATFORM=${platform} — using stub`);
    warnedOnce = true;
  }
  return stubCarrier;
}

export type { CarrierAdapter, ShipmentInput, ShipmentResult, CustomsDeclaration } from "./types";
