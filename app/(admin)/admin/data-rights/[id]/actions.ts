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
  if (confirmEmail !== request.requester.email) {
    return { ok: false, reason: "Confirmation email mismatch" };
  }

  const result = await runErasureCore({
    email: request.requester.email,
    uid: request.requester.uid,
    requestId,
  });

  if (!result.ok) return result;

  const db = getAdminDb()!;
  await db.doc(`dataRightsRequests/${requestId}`).update({
    status: "completed",
    respondedAt: Timestamp.now(),
    responseArtefactRef: `erasure-summary:${result.summaryId}`,
  });

  await writeAuditEvent({
    eventType: "customer.erasure_completed",
    target: { kind: "user", id: request.requester.uid ?? request.requester.email },
    metadata: {
      requestId,
      ordersAnonymised: result.ordersAnonymised,
      eventsDeleted: result.eventsDeleted,
      auditLogsScrubbed: result.auditLogsScrubbed,
    },
    snapshotAfter: {
      erasedFields: ["email", "name", "phone", "addressLine1", "addressLine2"],
    },
  });

  await sendErasureConfirmedEmail({ to: request.requester.email });

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

  await sendAccessExportEmail({
    to: request.requester.email,
    downloadUrl,
  });

  const db = getAdminDb()!;
  await db.doc(`dataRightsRequests/${requestId}`).update({
    status: "completed",
    respondedAt: Timestamp.now(),
    responseArtefactRef: downloadUrl,
  });

  await writeAuditEvent({
    eventType: "customer.access_completed",
    target: { kind: "user", id: request.requester.uid },
    metadata: { requestId, downloadUrl },
  });

  revalidatePath("/admin/data-rights");
  revalidatePath(`/admin/data-rights/${requestId}`);
  return { ok: true };
}

export async function markRectificationComplete(requestId: string): Promise<void> {
  await assertAdmin();
  const db = getAdminDb()!;
  await db.doc(`dataRightsRequests/${requestId}`).update({
    status: "completed",
    respondedAt: Timestamp.now(),
  });
  await writeAuditEvent({
    eventType: "customer.rectification_completed",
    target: { kind: "user", id: null },
    metadata: { requestId },
  });
  revalidatePath("/admin/data-rights");
  revalidatePath(`/admin/data-rights/${requestId}`);
}
