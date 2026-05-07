// functions/src/dispatch/runDailyBatch.ts
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineString, defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions/v2";

const APP_BASE_URL = defineString("APP_BASE_URL", {
  description: "Base URL of the Next.js app, e.g. https://cryogenelaboratories.co.uk",
});
const DISPATCH_BATCH_SECRET = defineSecret("DISPATCH_BATCH_SECRET");

export const runDailyDispatchBatch = onSchedule(
  {
    schedule: "0 13 * * 1-5", // Mon-Fri 13:00
    timeZone: "Europe/London",
    region: "europe-west2",
    timeoutSeconds: 540,
    retryCount: 0,
    secrets: [DISPATCH_BATCH_SECRET],
  },
  async () => {
    const url = `${APP_BASE_URL.value()}/api/admin/dispatch/run-batch`;
    logger.info(`Triggering dispatch batch: ${url}`);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "X-Dispatch-Batch-Secret": DISPATCH_BATCH_SECRET.value(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ triggeredBy: "schedule" }),
    });

    const text = await res.text().catch(() => "");
    if (!res.ok) {
      logger.error(`Dispatch batch failed: ${res.status} ${text.slice(0, 500)}`);
      return;
    }
    logger.info(`Dispatch batch result: ${text.slice(0, 500)}`);
  }
);
