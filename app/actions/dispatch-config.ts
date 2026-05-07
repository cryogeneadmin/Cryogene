// app/actions/dispatch-config.ts
"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import { assertAdmin } from "@/lib/admin-auth";
import { writeAuditEvent } from "@/lib/audit-log";
import { addressSchema } from "@/lib/zod/address";

const dispatchConfigInputSchema = z.object({
  enabled: z.boolean(),
  returnAddress: addressSchema,
  senderName: z.string().min(1).max(120),
  defaultServiceCodeByCountry: z.record(
    z.string().length(2),
    z.enum(["TPN24", "TPN48"])
  ),
  obaAccountNumber: z.string().max(50),
  batchScheduleCron: z.string().max(100),
  batchScheduleTimezone: z.string().max(50),
  defaultWeightGrams: z.number().int().min(10).max(20_000),
  zebraPrinterDeviceId: z.string().max(200),
  trackingWebhookUrl: z.string().url().or(z.literal("")),
});

export async function setDispatchConfig(input: unknown): Promise<void> {
  await assertAdmin();
  const validated = dispatchConfigInputSchema.parse(input);

  // Hard guards on enable: every external dependency must be populated.
  if (validated.enabled) {
    if (!validated.returnAddress.line1 || !validated.returnAddress.postcode) {
      throw new Error("Cannot enable: returnAddress incomplete");
    }
    if (!validated.zebraPrinterDeviceId) {
      throw new Error("Cannot enable: zebraPrinterDeviceId not set");
    }
    if (!validated.obaAccountNumber) {
      throw new Error("Cannot enable: obaAccountNumber not set");
    }
  }

  const db = getAdminDb();
  if (!db) throw new Error("Firestore admin SDK not configured");
  const ref = db.collection("config").doc("dispatch");
  const before = await ref.get();
  await ref.set(validated, { merge: true });

  await writeAuditEvent({
    eventType: "config.updated",
    target: { kind: null, id: "config-dispatch" },
    before: before.exists ? before.data() ?? null : null,
    after: validated,
    metadata: { kind: "dispatch-config-update" },
  });

  revalidatePath("/admin/settings");
}
