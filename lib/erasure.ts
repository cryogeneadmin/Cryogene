import "server-only";

export type ErasurePreviewResult = {
  authUserExists: boolean;
  customerDocExists: boolean;
  customerEventsCount: number;
  enquiriesCount: number;
  ordersToAnonymise: number;
  auditLogScrubCount: number;
  blockers: string[];
};

export async function previewErasure(_input: {
  email: string;
  uid: string | null;
}): Promise<ErasurePreviewResult> {
  return {
    authUserExists: false,
    customerDocExists: false,
    customerEventsCount: 0,
    enquiriesCount: 0,
    ordersToAnonymise: 0,
    auditLogScrubCount: 0,
    blockers: ["NOT IMPLEMENTED — see Section G"],
  };
}

export async function runErasure(_input: {
  email: string;
  uid: string | null;
  requestId: string;
}): Promise<
  | { ok: true; summaryId: string; ordersAnonymised: number; eventsDeleted: number; auditLogsScrubbed: number }
  | { ok: false; reason: string }
> {
  return { ok: false, reason: "NOT IMPLEMENTED — see Section G" };
}
