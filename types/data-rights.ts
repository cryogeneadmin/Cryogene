// types/data-rights.ts
import type { Timestamp } from "firebase-admin/firestore";

export type ConsentSource =
  | "checkout"
  | "signup"
  | "post-purchase"
  | "withdrawal"
  | "admin-override"
  | "unsubscribe-link";

export type MarketingConsent = {
  granted: boolean;
  grantedAt: Date | null;
  withdrawnAt: Date | null;
  source: ConsentSource;
};

export type MarketingConsentEntry = {
  id: string;
  granted: boolean;
  changedAt: Date;
  source: ConsentSource;
  ipHash: string | null;
  userAgent: string | null;
};

/** Internal write shape for Firestore — Timestamps before normalisation. */
export type MarketingConsentEntryWritable = Omit<MarketingConsentEntry, "id" | "changedAt"> & {
  changedAt: Timestamp;
};

export type DataRightType =
  | "access"
  | "rectification"
  | "erasure"
  | "objection";

export type DataRightSource = "account" | "public" | "unsubscribe-link";

export type DataRightStatus =
  | "pending_email_verification"
  | "queued"
  | "in_progress"
  | "completed"
  | "rejected";

export type DataRightsRequest = {
  id: string;
  createdAt: Date;
  type: DataRightType;
  source: DataRightSource;
  requester: {
    email: string;
    uid: string | null;
    emailVerifiedAt: Date | null;
  };
  status: DataRightStatus;
  deadline: Date;
  respondedAt: Date | null;
  responseArtefactRef: string | null;
  rejectionReason: string | null;
  notes: string | null;
  slaWarningsSentAt: Date[];
  message: string | null;
};

export type DataRightsRequestWritable = Omit<
  DataRightsRequest,
  "id" | "createdAt" | "deadline" | "respondedAt" | "slaWarningsSentAt" | "requester"
> & {
  createdAt: Timestamp;
  deadline: Timestamp;
  respondedAt: Timestamp | null;
  slaWarningsSentAt: Timestamp[];
  requester: Omit<DataRightsRequest["requester"], "emailVerifiedAt"> & {
    emailVerifiedAt: Timestamp | null;
  };
};
