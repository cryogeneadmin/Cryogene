import type { Config } from "@/types";

export function computeVatInPence(
  subtotalInPence: number,
  vat: Config["vat"]
): number {
  if (!vat.registered) return 0;
  return Math.round(subtotalInPence * vat.rate);
}
