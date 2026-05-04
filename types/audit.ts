// types/audit.ts

import type { Timestamp } from "firebase-admin/firestore";

/**
 * Compliance-minimum audit-event taxonomy. Add new types only via the
 * audit-log spec — every new event type must be reviewed for retention
 * implications and admin-viewer support.
 */
export const ALL_AUDIT_EVENT_TYPES = [
  // Order lifecycle (Plan A)
  "order.created",
  "order.status_changed",
  "order.refunded",            // reserved; no writer until refund flow ships
  // Product mutations (Plan A)
  "product.created",
  "product.updated",           // covers active:false soft-delete via diff
  // Admin / role (Plan A)
  "admin.role_granted",
  "admin.role_revoked",
  // Security (Plan A)
  "auth.login_failed_threshold",
  // Customer rights (Plan B — new)
  "customer.access_requested",
  "customer.access_completed",
  "customer.rectification_requested",
  "customer.rectification_completed",
  "customer.erasure_requested",
  "customer.erasure_completed",
  "customer.objection_received",
  "customer.objection_processed",
  "customer.rights_request_rejected",
] as const;

export type AuditEventType = (typeof ALL_AUDIT_EVENT_TYPES)[number];

export type AuditActorType = "admin" | "customer" | "system" | "anonymous";
export type AuditTargetKind = "order" | "product" | "user" | "session" | null;

export type AuditLog = {
  id: string;
  createdAt: Date;                 // normalised from Timestamp at read boundary
  eventType: AuditEventType;
  actor: {
    type: AuditActorType;
    uid: string | null;
    email: string | null;
  };
  target: {
    kind: AuditTargetKind;
    id: string | null;
  };
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  snapshotAfter: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  ip: string | null;
  userAgent: string | null;
  prevHash: string | null;         // reserved for forensic-hardening upsell — always null in Plan A
};

/** Internal write shape — Firestore Timestamps before normalisation. */
export type AuditLogWritable = Omit<AuditLog, "id" | "createdAt"> & {
  createdAt: Timestamp;
  expiresAt: Timestamp;
};
