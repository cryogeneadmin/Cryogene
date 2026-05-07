import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { writeAuditEvent } from "@/lib/audit-log";
import { verifyWebhookSignature } from "@/lib/fulfilment/webhook-verify";
import type { TrackingMilestone, TrackingEvent } from "@/types/order";
import type { AuditEventType } from "@/types/audit";

// Verify against current Royal Mail tracking webhook docs at integration time.
// Field names below match the shape RM has used historically; the live API may
// rename or restructure.
const trackingWebhookSchema = z.object({
  trackingNumber: z.string(),
  status: z.string(),
  timestamp: z.string(),
  location: z.string().nullish(),
});

const RM_STATUS_MAP: Record<string, TrackingMilestone> = {
  "Item posted": "collected",
  "Collection from sender": "collected",
  "In transit": "in_transit",
  "At sorting hub": "in_transit",
  "Departed hub": "in_transit",
  "Out for delivery": "out_for_delivery",
  "With courier": "out_for_delivery",
  Delivered: "delivered",
  "Delivery attempted": "failed",
  "Returned to sender": "failed",
  Lost: "failed",
};

const MILESTONE_TO_EVENT: Record<TrackingMilestone, AuditEventType> = {
  collected: "order.tracking_collected",
  in_transit: "order.tracking_in_transit",
  out_for_delivery: "order.tracking_out_for_delivery",
  delivered: "order.tracking_delivered",
  failed: "order.tracking_failed",
};

function coerceDateMs(t: Timestamp | Date | { seconds: number } | unknown): number {
  if (t instanceof Date) return t.getTime();
  if (
    t &&
    typeof t === "object" &&
    "toDate" in t &&
    typeof (t as { toDate?: unknown }).toDate === "function"
  ) {
    return (t as Timestamp).toDate().getTime();
  }
  if (t && typeof t === "object" && "seconds" in t) {
    return (t as { seconds: number }).seconds * 1000;
  }
  return 0;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("X-RoyalMail-Signature");
  const secret = process.env.ROYALMAIL_TRACKING_WEBHOOK_SECRET ?? "";

  if (!secret) {
    console.error("Tracking webhook: ROYALMAIL_TRACKING_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "misconfigured" }, { status: 500 });
  }

  if (!verifyWebhookSignature({ rawBody, signatureHeader: signature, secret })) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let parsed: z.infer<typeof trackingWebhookSchema>;
  try {
    parsed = trackingWebhookSchema.parse(JSON.parse(rawBody));
  } catch (err) {
    console.warn("Tracking webhook: malformed payload", err);
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }

  const milestone = RM_STATUS_MAP[parsed.status];
  if (!milestone) {
    console.warn(`Tracking webhook: unmapped status ${parsed.status}`);
    return NextResponse.json({ ok: true });
  }

  const db = getAdminDb();
  if (!db) {
    console.error("Tracking webhook: Firestore admin SDK not configured");
    return NextResponse.json({ error: "misconfigured" }, { status: 500 });
  }

  const snap = await db
    .collection("orders")
    .where("fulfilment.trackingNumber", "==", parsed.trackingNumber)
    .limit(1)
    .get();

  if (snap.empty) {
    console.warn(`Tracking webhook: unknown trackingNumber ${parsed.trackingNumber}`);
    return NextResponse.json({ ok: true });
  }

  const doc = snap.docs[0]!;
  const orderRef = doc.ref;
  const orderData = doc.data();
  const orderId = doc.id;
  const orderNumber = orderData.orderNumber as string;
  const existing = (orderData.fulfilment?.trackingEvents ?? []) as TrackingEvent[];

  const eventTimestamp = new Date(parsed.timestamp);
  const isDup = existing.some(
    (e) =>
      e.milestone === milestone &&
      Math.abs(coerceDateMs(e.timestamp) - eventTimestamp.getTime()) < 1000
  );
  if (isDup) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  // Cap raw payload at ~1KB to keep document growth bounded.
  const rawSize = Buffer.byteLength(rawBody, "utf-8");
  const rawSafe =
    rawSize <= 1024
      ? JSON.parse(rawBody)
      : { __overSizeCap: true, __originalByteLength: rawSize };

  // Admin SDK Timestamp is structurally compatible with the firebase/firestore
  // Timestamp at runtime; TS sees them as nominally distinct. Cast through
  // unknown so the webhook can write into the TrackingEvent shape.
  const newEvent: TrackingEvent = {
    milestone,
    timestamp: Timestamp.fromDate(eventTimestamp) as unknown as TrackingEvent["timestamp"],
    location: parsed.location ?? null,
    raw: rawSafe,
  };

  await orderRef.update({
    "fulfilment.trackingEvents": FieldValue.arrayUnion(newEvent),
    "fulfilment.lastTrackingStatus": milestone,
    updatedAt: Timestamp.now(),
  });

  await writeAuditEvent({
    eventType: MILESTONE_TO_EVENT[milestone],
    target: { kind: "order", id: orderId },
    metadata: {
      orderNumber,
      milestone,
      timestamp: parsed.timestamp,
      location: parsed.location ?? null,
      trackingNumber: parsed.trackingNumber,
    },
  });

  return NextResponse.json({ ok: true });
}
