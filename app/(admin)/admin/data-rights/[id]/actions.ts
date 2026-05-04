"use server";

import { Timestamp } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/admin-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { writeAuditEvent } from "@/lib/audit-log";
import { getRequestById } from "@/lib/data-rights";
import { buildAccessExport } from "@/lib/data-export";
import { previewErasure as previewErasureCore, runErasure as runErasureCore } from "@/lib/erasure";
import { sendAccessExportEmail } from "@/lib/email-templates/access-export";
import { sendErasureConfirmedEmail } from "@/lib/email-templates/erasure-confirmed";

export type ErasurePreview = {
  authUserExists: boolean;
  customerDocExists: boolean;
  customerEventsCount: number;
  enquiriesCount: number;
  ordersToAnonymise: number;
  auditLogScrubCount: number;
  blockers: string[];
};

export async function previewErasure(requestId: string): Promise<ErasurePreview> {
  await assertAdmin();
  const request = await getRequestById(requestId);
  if (!request) throw new Error("Request not found");
  return previewErasureCore({ email: request.requester.email, uid: request.requester.uid });
}

export async function runErasure(
  requestId: string,
  confirmEmail: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  await assertAdmin();
  const request = await getRequestById(requestId);
  if (!request) return { ok: false, reason: "Request not found" };
  // Normalise both sides — Section B's data-rights helpers store emails
  // lowercased + trimmed, but the typed admin input may include differing
  // case. Avoid spurious mismatches from "Foo@Example.com" vs "foo@example.com".
  if (
    confirmEmail.trim().toLowerCase() !==
    request.requester.email.trim().toLowerCase()
  ) {
    return { ok: false, reason: "Confirmation email mismatch" };
  }

  const result = await runErasureCore({
    email: request.requester.email,
    uid: request.requester.uid,
    requestId,
  });

  if (!result.ok) return result;

  const db = getAdminDb();
  if (!db) {
    return { ok: false, reason: "Firestore not configured" };
  }

  // Audit FIRST — this is the legally-significant compliance signal. If
  // writeAuditEvent fails (it swallows internally), better to record the
  // attempt before the status flip than after.
  await writeAuditEvent({
    eventType: "customer.erasure_completed",
    target: { kind: "user", id: request.requester.uid },
    metadata: {
      requestId,
      requesterEmail: request.requester.email,
      ordersAnonymised: result.ordersAnonymised,
      eventsDeleted: result.eventsDeleted,
      auditLogsScrubbed: result.auditLogsScrubbed,
    },
    snapshotAfter: {
      erasedFields: ["email", "name", "phone", "addressLine1", "addressLine2"],
    },
  });

  await db.doc(`dataRightsRequests/${requestId}`).update({
    status: "completed",
    respondedAt: Timestamp.now(),
    responseArtefactRef: `erasure-summary:${result.summaryId}`,
    expiresAt: Timestamp.fromMillis(Timestamp.now().toMillis() + 90 * 24 * 60 * 60 * 1000),
  });

  // Email is best-effort — wrap in try/catch + console.warn so a transient
  // SMTP issue doesn't 500 the route after the work is done.
  try {
    await sendErasureConfirmedEmail({ to: request.requester.email });
  } catch (err) {
    console.warn("[erasure] confirmation email failed:", err);
  }

  revalidatePath("/admin/data-rights");
  revalidatePath(`/admin/data-rights/${requestId}`);
  return { ok: true };
}

export async function generateAndSendAccessExport(
  requestId: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  await assertAdmin();
  const request = await getRequestById(requestId);
  if (!request) return { ok: false, reason: "Request not found" };

  const { downloadUrl } = await buildAccessExport({
    email: request.requester.email,
    uid: request.requester.uid,
    requestId,
  });

  try {
    await sendAccessExportEmail({
      to: request.requester.email,
      downloadUrl,
    });
  } catch (err) {
    console.warn("[access-export] email failed:", err);
  }

  const db = getAdminDb();
  if (!db) {
    return { ok: false, reason: "Firestore not configured" };
  }

  // Audit FIRST — this is the legally-significant compliance signal. If
  // writeAuditEvent fails (it swallows internally), better to record the
  // attempt before the status flip than after.
  await writeAuditEvent({
    eventType: "customer.access_completed",
    target: { kind: "user", id: request.requester.uid },
    metadata: { requestId, requesterEmail: request.requester.email, downloadUrl },
  });

  await db.doc(`dataRightsRequests/${requestId}`).update({
    status: "completed",
    respondedAt: Timestamp.now(),
    responseArtefactRef: downloadUrl,
    expiresAt: Timestamp.fromMillis(Timestamp.now().toMillis() + 90 * 24 * 60 * 60 * 1000),
  });

  revalidatePath("/admin/data-rights");
  revalidatePath(`/admin/data-rights/${requestId}`);
  return { ok: true };
}

export async function rejectRequest(
  requestId: string,
  reason: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  await assertAdmin();
  const trimmed = reason.trim();
  if (trimmed.length === 0) {
    return { ok: false, reason: "A rejection reason is required" };
  }
  if (trimmed.length > 500) {
    return { ok: false, reason: "Rejection reason must be 500 characters or fewer" };
  }

  const request = await getRequestById(requestId);
  if (!request) return { ok: false, reason: "Request not found" };

  const db = getAdminDb();
  if (!db) return { ok: false, reason: "Firestore not configured" };

  // Audit FIRST — same ordering as the other completion paths.
  await writeAuditEvent({
    eventType: "customer.rights_request_rejected",
    target: { kind: "user", id: request.requester.uid },
    metadata: {
      requestId,
      requesterEmail: request.requester.email,
      type: request.type,
      reason: trimmed,
    },
  });

  await db.doc(`dataRightsRequests/${requestId}`).update({
    status: "rejected",
    rejectionReason: trimmed,
    respondedAt: Timestamp.now(),
    expiresAt: Timestamp.fromMillis(Timestamp.now().toMillis() + 90 * 24 * 60 * 60 * 1000),
  });

  revalidatePath("/admin/data-rights");
  revalidatePath(`/admin/data-rights/${requestId}`);
  return { ok: true };
}

export async function markRectificationComplete(requestId: string): Promise<void> {
  await assertAdmin();
  const request = await getRequestById(requestId);
  if (!request) throw new Error("Request not found");

  const db = getAdminDb();
  if (!db) throw new Error("Firestore not configured");

  // Audit FIRST so a failed status-update doesn't leave an undocumented
  // completion. writeAuditEvent swallows internal failures, but at least
  // we attempt it before mutating state.
  await writeAuditEvent({
    eventType: "customer.rectification_completed",
    target: { kind: "user", id: request.requester.uid },
    metadata: { requestId, requesterEmail: request.requester.email },
  });

  await db.doc(`dataRightsRequests/${requestId}`).update({
    status: "completed",
    respondedAt: Timestamp.now(),
    expiresAt: Timestamp.fromMillis(Timestamp.now().toMillis() + 90 * 24 * 60 * 60 * 1000),
  });

  revalidatePath("/admin/data-rights");
  revalidatePath(`/admin/data-rights/${requestId}`);
}
