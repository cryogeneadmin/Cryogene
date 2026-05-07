import "server-only";
import type { Order } from "@/types/order";
import { getDispatchConfig } from "./dispatch-config";

/**
 * Compute parcel weight in grams.
 *
 * v1 uses dispatchConfig.defaultWeightGrams as a base + 20g per additional
 * line-item beyond the first. For peptides at ~5-10g per vial, defaultWeight
 * of 100g generously covers a single-vial parcel including packaging.
 *
 * Future enhancement: per-product weight on ProductVariant. Until then this
 * approximation is fine — RM Tracked 48 has a 20kg ceiling we'll never
 * approach with peptide volumes.
 */
export async function computeParcelWeightGrams(order: Order): Promise<number> {
  const config = await getDispatchConfig();
  const totalQty = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return config.defaultWeightGrams + Math.max(0, totalQty - 1) * 20;
}
