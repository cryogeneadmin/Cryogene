"use server";

import { cookies } from "next/headers";
import { getCheckoutSession, clearCheckoutSession } from "@/lib/checkout-session";
import {
  confirmationCookieName,
  CONFIRMATION_COOKIE_OPTIONS,
} from "@/lib/auth-cookies";
import { getProductBySlug } from "@/lib/products";
import { getConfig } from "@/lib/config";
import { computeShippingInPence } from "@/lib/shipping";
import { computeVatInPence } from "@/lib/vat";
import { createOrderRecord, nextOrderNumber } from "@/lib/orders";
import { getPaymentProvider } from "@/lib/payments";
import type { BasketItem } from "@/lib/basket";
import type { Order, OrderLineItem } from "@/types";

export type CreateOrderInput = {
  items: BasketItem[];
  shippingInPence: number;
  vatInPence: number;
  totalInPence: number;
};

export type CreateOrderResult =
  | { status: "success"; redirectUrl: string; orderId: string }
  | { status: "error"; message: string };

export async function createOrderAction(
  input: CreateOrderInput
): Promise<CreateOrderResult> {
  const cookieStore = await cookies();
  const ageVerified = cookieStore.get("age_verified")?.value === "1";
  if (!ageVerified) {
    return { status: "error", message: "Age verification required" };
  }

  const delivery = await getCheckoutSession();
  if (!delivery) {
    return { status: "error", message: "Checkout session expired — please start again" };
  }

  if (input.items.length === 0) {
    return { status: "error", message: "Basket is empty" };
  }

  const config = await getConfig();

  // Re-read prices and stock server-side. Never trust client prices.
  const verifiedItems: OrderLineItem[] = [];
  let itemsSubtotalInPence = 0;

  for (const item of input.items) {
    const product = await getProductBySlug(item.productSlug);
    if (!product) {
      return { status: "error", message: `Product ${item.name} no longer available` };
    }
    const variant = product.variants.find((v) => v.sku === item.sku);
    if (!variant || !variant.active) {
      return { status: "error", message: `${item.name} (${item.size}) is no longer available` };
    }
    if (variant.stock < item.quantity) {
      return {
        status: "error",
        message: `Insufficient stock for ${item.name} ${item.size} — only ${variant.stock} remaining`,
      };
    }
    const lineTotal = variant.priceInPence * item.quantity;
    itemsSubtotalInPence += lineTotal;
    verifiedItems.push({
      productId: product.id,
      productSlug: product.slug,
      name: product.name,
      sku: variant.sku,
      size: variant.size,
      unitPriceInPence: variant.priceInPence,
      quantity: item.quantity,
      lineTotalInPence: lineTotal,
    });
  }

  const shippingCostInPence = computeShippingInPence(itemsSubtotalInPence, config.shipping);
  const vatAmountInPence = computeVatInPence(
    itemsSubtotalInPence + shippingCostInPence,
    config.vat
  );
  const totalInPence = itemsSubtotalInPence + shippingCostInPence + vatAmountInPence;

  const orderNumber = await nextOrderNumber();
  const now = new Date();

  const order = await createOrderRecord({
    orderNumber,
    status: "pending",
    customer: {
      uid: null,
      email: delivery.email,
      name: delivery.fullName,
      phone: delivery.phone ?? null,
      address: {
        line1: delivery.line1,
        line2: delivery.line2 ?? null,
        city: delivery.city,
        postcode: delivery.postcode,
        country: "GB",
      },
    },
    items: verifiedItems,
    itemsSubtotalInPence,
    shippingCostInPence,
    vatAmountInPence,
    totalInPence,
    vatRateAtPurchase: config.vat.rate,
    researchConfirmed: true,
    researchConfirmedAt: now,
    ageGatePassedAt: now,
    payment: {
      provider: "stub",
      providerRef: null,
      initiatedAt: now,
      paidAt: null,
      failedAt: null,
      failureReason: null,
    },
    fulfilment: {
      carrier: null,
      trackingNumber: null,
      labelUrl: null,
      printedAt: null,
      printerStatus: null,
      dispatchedAt: null,
      customerEmailedAt: null,
    },
    adminNotes: null,
    createdAt: now,
    updatedAt: now,
  });

  const provider = getPaymentProvider();
  const payment = await provider.initiatePayment(order);

  await clearCheckoutSession();

  // Set a short-TTL capability cookie so the guest can view their own
  // confirmation page. httpOnly + SameSite=Strict prevents exfiltration.
  cookieStore.set(
    confirmationCookieName(order.id),
    "1",
    CONFIRMATION_COOKIE_OPTIONS
  );

  return {
    status: "success",
    redirectUrl: payment.redirectUrl,
    orderId: order.id,
  };
}
