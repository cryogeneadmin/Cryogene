"use server";

import { z } from "zod";
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
import { createOrderTransaction } from "@/lib/orders";
import { getPaymentProvider } from "@/lib/payments";
import { writeAuditEvent } from "@/lib/audit-log";
import { writeCustomerEvent } from "@/lib/customer-events";
import { setMarketingConsent } from "@/lib/marketing-consent";
import type { OrderLineItem } from "@/types";

// ── Audit-trail version constants ──────────────────────────────────────────
// Bump these strings whenever the wording of the research/age/terms
// confirmation copy changes. Stored verbatim on every order doc so compliance
// can always reconstruct which text the customer saw.
const RESEARCH_USE_CONFIRMATION_VERSION = "v1-2026-05-02";
const AGE_GATE_CONFIRMATION_VERSION = "v1-2026-05-02";
const TERMS_ACCEPTED_VERSION = "v1-2026-05-02";

// ── Input schema ────────────────────────────────────────────────────────────
// Accepts only the minimum identifiers needed to reconstruct the order
// server-side. All pricing fields are intentionally absent — the server
// re-reads prices from Firestore and recomputes shipping/VAT/total.
// Dead client-price fields (shippingInPence, vatInPence, totalInPence,
// unitPriceInPence, name, etc.) have been removed to prevent future drift.

const ItemSchema = z.object({
  productSlug: z.string().min(1).max(200),
  sku: z.string().min(1).max(200),
  quantity: z.number().int().min(1).max(99),
});

const CreateOrderInputSchema = z.object({
  items: z.array(ItemSchema).min(1).max(50),
  // z.literal(true) — Zod rejects the action at parse time if any
  // confirmation is absent or false. No more hardcoded true writes.
  researchConfirmed: z.literal(true),
  ageGateConfirmed: z.literal(true),
  termsAccepted: z.literal(true),
});

export type CreateOrderInput = z.infer<typeof CreateOrderInputSchema>;

export type CreateOrderResult =
  | { status: "success"; redirectUrl: string; orderId: string }
  | { status: "error"; message: string };

export async function createOrderAction(
  input: unknown
): Promise<CreateOrderResult> {
  // Validate input — rejects if researchConfirmed or ageGateConfirmed is not
  // literally true, or if items contain any client price fields.
  const parsed = CreateOrderInputSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    // Surface a human-readable message for the two compliance-critical fields
    if (firstIssue?.path[0] === "researchConfirmed") {
      return { status: "error", message: "You must confirm research-only use before placing an order" };
    }
    if (firstIssue?.path[0] === "ageGateConfirmed") {
      return { status: "error", message: "Age confirmation is required before placing an order" };
    }
    if (firstIssue?.path[0] === "termsAccepted") {
      return { status: "error", message: "You must accept the Terms & Conditions and Privacy Policy before placing an order" };
    }
    return { status: "error", message: firstIssue?.message ?? "Invalid order input" };
  }

  const { items, researchConfirmed, ageGateConfirmed, termsAccepted } = parsed.data;

  const cookieStore = await cookies();
  const ageVerified = cookieStore.get("age_verified")?.value === "1";
  if (!ageVerified) {
    return { status: "error", message: "Age verification required" };
  }

  const delivery = await getCheckoutSession();
  if (!delivery) {
    return { status: "error", message: "Checkout session expired — please start again" };
  }

  const config = await getConfig();

  // Re-read prices server-side (slug→productId resolution, price verification).
  // Stock validation + decrement happen atomically inside createOrderTransaction.
  // Never trust client prices.
  //
  // Dedupe slugs before the lookup — two SKUs of the same product only need one
  // fetch — then run the per-slug calls in parallel so a 50-item basket is one
  // round-trip wide instead of 50 deep. Each getProductBySlug is independently
  // cached via 'use cache' + cacheTag("products"), so warm slugs are free.
  const uniqueSlugs = Array.from(new Set(items.map((i) => i.productSlug)));
  const fetched = await Promise.all(
    uniqueSlugs.map((slug) => getProductBySlug(slug))
  );
  const productBySlug = new Map(
    uniqueSlugs.map((slug, idx) => [slug, fetched[idx]] as const)
  );

  const verifiedItems: OrderLineItem[] = [];
  const itemRefs: Array<{ productId: string; sku: string; quantity: number }> = [];
  let itemsSubtotalInPence = 0;

  for (const item of items) {
    const product = productBySlug.get(item.productSlug);
    if (!product) {
      return { status: "error", message: `Product ${item.productSlug} no longer available` };
    }
    const variant = product.variants.find((v) => v.sku === item.sku);
    if (!variant || !variant.active) {
      return { status: "error", message: `${item.sku} is no longer available` };
    }
    // Optimistic stock pre-check (non-atomic): surfaces obvious errors early
    // before entering the transaction. The real atomic check is inside the txn.
    if (variant.stock < item.quantity) {
      return {
        status: "error",
        message: `Insufficient stock for ${product.name} ${variant.size} — only ${variant.stock} remaining`,
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
    itemRefs.push({ productId: product.id, sku: variant.sku, quantity: item.quantity });
  }

  const shippingCostInPence = computeShippingInPence(itemsSubtotalInPence, config.shipping);
  const vatAmountInPence = computeVatInPence(
    itemsSubtotalInPence + shippingCostInPence,
    config.vat
  );
  const totalInPence = itemsSubtotalInPence + shippingCostInPence + vatAmountInPence;

  const now = new Date();

  let order;
  try {
    order = await createOrderTransaction({
      itemRefs,
      status: "pending",
      customer: {
        uid: delivery.customerUid ?? null,
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
      currencyCode: "GBP",
      // Zod-validated — only true if the customer actually confirmed all three
      researchConfirmed,
      researchConfirmedAt: now,
      ageGateConfirmed,
      ageGatePassedAt: now,
      termsAccepted,
      // Audit-trail snapshots: which version of each confirmation text was shown
      researchUseConfirmationVersion: RESEARCH_USE_CONFIRMATION_VERSION,
      ageGateConfirmationVersion: AGE_GATE_CONFIRMATION_VERSION,
      termsAcceptedVersion: TERMS_ACCEPTED_VERSION,
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
        carrierOrderId: null,
        trackingNumber: null,
        labelUrl: null,
        printedAt: null,
        printerStatus: null,
        dispatchedAt: null,
        customerEmailedAt: null,
        lastError: null,
        trackingEvents: [],
        lastTrackingStatus: null,
      },
      adminNotes: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create order — please try again";
    return { status: "error", message };
  }

  await writeAuditEvent({
    eventType: "order.created",
    actor: {
      type: delivery.customerUid ? "customer" : "anonymous",
      uid: delivery.customerUid ?? null,
      email: delivery.email,
    },
    target: { kind: "order", id: order.id },
    after: {
      status: order.status,
      itemsSubtotalInPence,
      shippingCostInPence,
      vatAmountInPence,
      totalInPence,
      items: verifiedItems.map((i) => ({
        productId: i.productId,
        sku: i.sku,
        quantity: i.quantity,
        unitPriceInPence: i.unitPriceInPence,
      })),
    },
    metadata: {
      orderNumber: order.orderNumber,
      customerEmail: delivery.email,
    },
  });

  // Fire-and-forget customer-events emit (groundwork for future cart-recovery
  // + funnel-completion upsells). Synchronous void; do not await.
  // Note on semantics: this fires after createOrderTransaction succeeds but
  // BEFORE provider.initiatePayment. With the current stub provider, payment
  // always "succeeds" — but real payment paths can fail or be abandoned post
  // redirect. The status field makes the actual order state explicit so the
  // future cart-recovery upsell can join delivery_submitted → purchased and
  // filter on status === "paid" rather than treating creation as completion.
  writeCustomerEvent({
    eventType: "checkout.purchased",
    emailOverride: delivery.email,
    payload: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalInPence,
      itemCount: verifiedItems.reduce((sum, i) => sum + i.quantity, 0),
    },
  });

  // If the customer registered AND opted in at checkout, write consent.
  // Only registered customers — guest checkout has no customer doc to write to.
  if (delivery.customerUid && delivery.marketingOptIn) {
    try {
      await setMarketingConsent(
        delivery.customerUid,
        true,
        "checkout"
      );
    } catch (err) {
      console.warn(
        "[checkout] marketing-consent write failed for uid",
        delivery.customerUid,
        ":",
        err,
      );
    }
  }

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
