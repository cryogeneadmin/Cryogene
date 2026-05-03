"use server";

import { writeCustomerEvent } from "@/lib/customer-events";
import type { CustomerEventType } from "@/types/customer-events";

const PUBLIC_EVENT_TYPES = new Set<CustomerEventType>([
  "product.viewed",
  "basket.item_added",
  "basket.item_removed",
]);

/**
 * Public-callable subset of customer-event writes. Other event types
 * (checkout.delivery_submitted, checkout.purchased, auth.signup_completed)
 * are emitted from server-side code paths only.
 *
 * writeCustomerEvent is synchronous void; this wrapper exists only to
 * give the client a server-action handle that's hard-restricted to the
 * three public event types.
 */
export async function emitCustomerEvent(
  eventType: CustomerEventType,
  payload: Record<string, unknown>
): Promise<void> {
  if (!PUBLIC_EVENT_TYPES.has(eventType)) return;
  writeCustomerEvent({ eventType, payload });
}
