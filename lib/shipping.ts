import type { Config } from "@/types";

export function computeShippingInPence(
  subtotalInPence: number,
  shipping: Config["shipping"]
): number {
  if (
    shipping.freeThresholdInPence !== null &&
    subtotalInPence >= shipping.freeThresholdInPence
  ) {
    return 0;
  }
  return shipping.flatRateInPence;
}
