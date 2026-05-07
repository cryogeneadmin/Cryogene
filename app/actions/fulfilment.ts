// app/actions/fulfilment.ts
"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { assertAdmin } from "@/lib/admin-auth";
import { writeAuditEvent } from "@/lib/audit-log";
import { getCarrier } from "@/lib/fulfilment/carriers";
import { getPrinter } from "@/lib/fulfilment/printers";
import { getDispatchConfig } from "@/lib/fulfilment/dispatch-config";
import { computeParcelWeightGrams } from "@/lib/fulfilment/weight";
import { sendOrderDispatchedEmail } from "@/lib/email-templates/order-dispatched";
import { ROYAL_MAIL_GB_SERVICES } from "@/types/dispatch";
import type { RoyalMailServiceCode, DispatchBatchRun } from "@/types/dispatch";
import type { Order } from "@/types";

const orderIdSchema = z.string().min(1).max(128);

const serviceCodeSchema = z.enum(
  Object.keys(ROYAL_MAIL_GB_SERVICES) as [RoyalMailServiceCode, ...RoyalMailServiceCode[]]
);

function requireDb() {
  const db = getAdminDb();
  if (!db) throw new Error("Firestore admin SDK not configured");
  return db;
}

/**
 * Generate a shipping label for a paid order.
 *
 * `_trustedCaller: true` skips the admin-session assertion. Use only from
 * within other server-only code paths that have already authenticated the
 * caller (e.g. `runBatch` triggered by the schedule with a verified shared
 * secret). Callers from UI/route handlers MUST omit this flag.
 */
export async function generateLabel(
  orderId: string,
  opts: { serviceCode?: RoyalMailServiceCode; _trustedCaller?: boolean } = {}
): Promise<{ trackingNumber: string; alreadyGenerated: boolean }> {
  if (!opts._trustedCaller) await assertAdmin();
  const validatedId = orderIdSchema.parse(orderId);
  const validatedService = opts.serviceCode
    ? serviceCodeSchema.parse(opts.serviceCode)
    : undefined;

  const db = requireDb();
  const config = await getDispatchConfig();

  const orderRef = db.collection("orders").doc(validatedId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) throw new Error("Order not found");
  const order = { id: orderSnap.id, ...orderSnap.data() } as Order;

  if (order.status !== "paid") {
    throw new Error(
      `Order ${order.orderNumber} is ${order.status}, not paid — cannot generate label`
    );
  }
  if (order.fulfilment.trackingNumber) {
    return { trackingNumber: order.fulfilment.trackingNumber, alreadyGenerated: true };
  }

  // Reset previous failed state for retry case before re-attempting.
  if (order.fulfilment.printerStatus === "failed") {
    await orderRef.update({
      "fulfilment.printerStatus": null,
      "fulfilment.lastError": null,
    });
  }

  const serviceCode =
    validatedService ??
    config.defaultServiceCodeByCountry[order.customer.address.country] ??
    "TPN48";

  const carrier = await getCarrier();
  const printer = await getPrinter();
  const weightGrams = await computeParcelWeightGrams(order);

  // Step 1: create shipment at carrier (durable carrier-side state).
  const shipment = await carrier.createShipment({
    orderId: order.id,
    orderNumber: order.orderNumber,
    destinationAddress: order.customer.address,
    destinationName: order.customer.name,
    destinationEmail: order.customer.email,
    destinationPhone: order.customer.phone,
    senderAddress: config.returnAddress,
    senderName: config.senderName,
    serviceCode,
    weightGrams,
    customs: null, // GB-only at launch — international upsell populates this
  });

  // Step 2: persist label fields BEFORE printing — DB write durability.
  await orderRef.update({
    "fulfilment.carrier": "royalmail",
    "fulfilment.carrierOrderId": shipment.carrierOrderId,
    "fulfilment.trackingNumber": shipment.trackingNumber,
    "fulfilment.labelUrl": shipment.labelPdfUrl,
    "fulfilment.printerStatus": "pending",
    "fulfilment.printedAt": null,
    "fulfilment.lastError": null,
    updatedAt: Timestamp.now(),
  });

  // Step 3: send to printer. Failure leaves carrier label intact for retry.
  let printErrored = false;
  try {
    await printer.printPdf({ pdfUrl: shipment.labelPdfUrl, orderId: order.id });
    await orderRef.update({
      "fulfilment.printerStatus": "printed",
      "fulfilment.printedAt": Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  } catch (err) {
    printErrored = true;
    const message = err instanceof Error ? err.message : String(err);
    await orderRef.update({
      "fulfilment.printerStatus": "failed",
      "fulfilment.lastError": message,
      updatedAt: Timestamp.now(),
    });
  }

  // Step 4: subscribe tracking webhook (fire-and-forget).
  if (config.trackingWebhookUrl) {
    carrier
      .subscribeTracking({
        trackingNumber: shipment.trackingNumber,
        webhookUrl: config.trackingWebhookUrl,
      })
      .catch((err) => console.warn("subscribeTracking failed:", err));
  }

  // Step 5: audit.
  await writeAuditEvent({
    eventType: "order.label_generated",
    target: { kind: "order", id: order.id },
    metadata: {
      orderNumber: order.orderNumber,
      carrier: "royalmail",
      trackingNumber: shipment.trackingNumber,
      serviceCode,
      labelPdfUrl: shipment.labelPdfUrl,
      printError: printErrored ? "see fulfilment.lastError" : null,
    },
  });

  revalidatePath("/admin/dispatch");
  revalidatePath(`/admin/orders/${order.id}`);

  return { trackingNumber: shipment.trackingNumber, alreadyGenerated: false };
}

export async function voidLabel(
  orderId: string,
  opts: { reason?: string } = {}
): Promise<void> {
  await assertAdmin();
  const validatedId = orderIdSchema.parse(orderId);
  const reason = opts.reason ? z.string().max(500).parse(opts.reason) : null;

  const db = requireDb();
  const orderRef = db.collection("orders").doc(validatedId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) throw new Error("Order not found");
  const order = { id: orderSnap.id, ...orderSnap.data() } as Order;

  if (!order.fulfilment.trackingNumber || !order.fulfilment.carrierOrderId) {
    throw new Error("No label to void");
  }
  if (order.fulfilment.dispatchedAt) {
    throw new Error("Cannot void: order already dispatched — use refund flow");
  }

  const carrier = await getCarrier();
  const voidedTrackingNumber = order.fulfilment.trackingNumber;
  await carrier.voidShipment(order.fulfilment.carrierOrderId);

  await orderRef.update({
    "fulfilment.carrierOrderId": null,
    "fulfilment.trackingNumber": null,
    "fulfilment.labelUrl": null,
    "fulfilment.printerStatus": null,
    "fulfilment.printedAt": null,
    "fulfilment.lastError": null,
    updatedAt: Timestamp.now(),
  });

  await writeAuditEvent({
    eventType: "order.label_voided",
    target: { kind: "order", id: order.id },
    metadata: {
      orderNumber: order.orderNumber,
      voidedTrackingNumber,
      reason,
    },
  });

  revalidatePath("/admin/dispatch");
  revalidatePath(`/admin/orders/${order.id}`);
}

export async function markDispatched(orderId: string): Promise<void> {
  await assertAdmin();
  await markDispatchedInternal(orderId);
}

/**
 * Internal mark-dispatched used by both `markDispatched` (admin-gated) and
 * `markBatchDispatched` (which has already gated). No admin assertion here —
 * caller is responsible.
 */
async function markDispatchedInternal(orderId: string): Promise<void> {
  const validatedId = orderIdSchema.parse(orderId);
  const db = requireDb();
  const orderRef = db.collection("orders").doc(validatedId);

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) throw new Error("Order not found");
    const order = { id: snap.id, ...snap.data() } as Order;
    if (order.fulfilment.printerStatus !== "printed") {
      throw new Error("Cannot mark dispatched: label not printed");
    }
    if (order.fulfilment.dispatchedAt) {
      return { order, alreadyDispatched: true as const };
    }
    const now = Timestamp.now();
    tx.update(orderRef, {
      status: "fulfilled",
      "fulfilment.dispatchedAt": now,
      "fulfilment.customerEmailedAt": now,
      updatedAt: now,
    });
    return {
      order: { ...order, status: "fulfilled" as const },
      alreadyDispatched: false as const,
    };
  });

  if (result.alreadyDispatched) return;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  let emailError: string | null = null;
  try {
    await sendOrderDispatchedEmail({ order: result.order, baseUrl });
  } catch (err) {
    emailError = err instanceof Error ? err.message : String(err);
    // Roll back the customerEmailedAt timestamp; status stays fulfilled.
    await orderRef.update({ "fulfilment.customerEmailedAt": null });
  }

  await writeAuditEvent({
    eventType: "order.dispatched",
    target: { kind: "order", id: result.order.id },
    metadata: {
      orderNumber: result.order.orderNumber,
      carrier: result.order.fulfilment.carrier,
      trackingNumber: result.order.fulfilment.trackingNumber,
      dispatchedAt: new Date().toISOString(),
      emailError,
    },
  });

  revalidatePath("/admin/dispatch");
  revalidatePath(`/admin/orders/${result.order.id}`);
}

export async function markBatchDispatched(): Promise<{
  marked: number;
  failed: number;
  errors: Array<{ orderId: string; orderNumber: string; message: string }>;
}> {
  await assertAdmin();
  const db = requireDb();
  const snap = await db
    .collection("orders")
    .where("status", "==", "paid")
    .where("fulfilment.printerStatus", "==", "printed")
    .where("fulfilment.dispatchedAt", "==", null)
    .get();

  const errors: Array<{ orderId: string; orderNumber: string; message: string }> = [];
  let marked = 0;

  for (const doc of snap.docs) {
    const orderNumber = (doc.data().orderNumber as string) ?? doc.id;
    try {
      await markDispatchedInternal(doc.id);
      marked += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ orderId: doc.id, orderNumber, message });
    }
  }

  revalidatePath("/admin/dispatch");
  return { marked, failed: errors.length, errors };
}

export async function retryLabel(
  orderId: string,
  opts: { serviceCode?: RoyalMailServiceCode } = {}
): Promise<{ trackingNumber: string }> {
  await assertAdmin();
  const validatedId = orderIdSchema.parse(orderId);
  const db = requireDb();
  const snap = await db.collection("orders").doc(validatedId).get();
  if (!snap.exists) throw new Error("Order not found");
  const order = { id: snap.id, ...snap.data() } as Order;
  if (order.fulfilment.printerStatus !== "failed") {
    throw new Error("retryLabel: order is not in failed state");
  }
  // generateLabel handles failed-state reset + idempotency internally.
  const result = await generateLabel(orderId, opts);
  return { trackingNumber: result.trackingNumber };
}

export async function runBatch(
  opts: {
    triggeredBy?: "schedule" | "admin";
    actor?: { uid: string | null; email: string | null };
  } = {}
): Promise<{
  processed: number;
  failed: number;
  errors: Array<{ orderId: string; orderNumber: string; message: string }>;
  batchRunId: string;
}> {
  const triggeredBy = opts.triggeredBy ?? "admin";
  if (triggeredBy === "admin") await assertAdmin();
  const db = requireDb();
  const startedAt = Timestamp.now();
  const batchRunId = `batchRun-${startedAt
    .toDate()
    .toISOString()
    .replace(/[:.]/g, "-")}`;
  const batchRunRef = db.collection("dispatchBatchRuns").doc(batchRunId);

  const initial: DispatchBatchRun = {
    id: batchRunId,
    startedAt,
    completedAt: null,
    triggeredBy,
    triggeredByActor: opts.actor ?? { uid: null, email: null },
    ordersProcessed: 0,
    ordersFailed: 0,
    errors: [],
    durationMs: 0,
  };
  await batchRunRef.set(initial);

  const snap = await db
    .collection("orders")
    .where("status", "==", "paid")
    .where("fulfilment.printerStatus", "in", [null, "failed"])
    .orderBy("createdAt", "asc")
    .limit(500)
    .get();

  const errors: Array<{ orderId: string; orderNumber: string; message: string }> = [];
  let processed = 0;

  for (const doc of snap.docs) {
    const orderNumber = (doc.data().orderNumber as string) ?? doc.id;
    try {
      // _trustedCaller bypasses generateLabel's assertAdmin — runBatch's
      // caller (route handler) has already authenticated via shared secret
      // (schedule path) or admin session (manual path).
      await generateLabel(doc.id, { _trustedCaller: true });
      processed += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ orderId: doc.id, orderNumber, message });
    }
  }

  const completedAt = Timestamp.now();
  await batchRunRef.update({
    completedAt,
    ordersProcessed: processed,
    ordersFailed: errors.length,
    errors,
    durationMs: completedAt.toMillis() - startedAt.toMillis(),
  });

  await writeAuditEvent({
    eventType: "order.dispatch_batch_run",
    target: { kind: null, id: batchRunId },
    metadata: {
      triggeredBy,
      processed,
      failed: errors.length,
      durationMs: completedAt.toMillis() - startedAt.toMillis(),
    },
  });

  revalidatePath("/admin/dispatch");
  return { processed, failed: errors.length, errors, batchRunId };
}
