// functions/src/sla-warnings.ts
import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { defineString } from "firebase-functions/params";
import { getResend, fromAddress, RESEND_API_KEY } from "./email";

if (!getApps().length) initializeApp();

const SAM_EMAIL = defineString("SAM_EMAIL", {
  description: "Address that receives SLA-warning emails",
});

export const slaWarnings = onSchedule(
  {
    schedule: "0 9 * * 1-5",
    timeZone: "Europe/London",
    region: "europe-west2",
    secrets: [RESEND_API_KEY],
  },
  async () => {
    const db = getFirestore();
    const sevenDaysFromNow = Timestamp.fromMillis(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    );

    const snap = await db
      .collection("dataRightsRequests")
      .where("status", "in", ["queued", "in_progress"])
      .where("deadline", "<", sevenDaysFromNow)
      .get();

    const today = new Date().toISOString().slice(0, 10);
    const resend = getResend();

    for (const doc of snap.docs) {
      const data = doc.data();
      const sentTimestamps = (data.slaWarningsSentAt ?? []) as Timestamp[];
      const sentToday = sentTimestamps.some(
        (ts) => ts.toDate().toISOString().slice(0, 10) === today
      );
      if (sentToday) continue;

      const days = Math.floor(
        (data.deadline.toMillis() - Date.now()) / (24 * 60 * 60 * 1000)
      );

      try {
        await resend.emails.send({
          from: fromAddress(),
          to: SAM_EMAIL.value(),
          subject: `Data rights request expires in ${days} day${days === 1 ? "" : "s"}`,
          html: `
            <p>A data-rights request is approaching its 30-day SLA deadline.</p>
            <ul>
              <li><strong>Type:</strong> ${data.type}</li>
              <li><strong>Requester:</strong> ${data.requester?.email}</li>
              <li><strong>Deadline:</strong> ${data.deadline.toDate().toLocaleDateString("en-GB")} (${days} day${days === 1 ? "" : "s"} remaining)</li>
            </ul>
            <p><a href="https://cryogene.co.uk/admin/data-rights/${doc.id}">Open in admin</a></p>
          `,
        });

        await doc.ref.update({
          slaWarningsSentAt: FieldValue.arrayUnion(Timestamp.now()),
        });
      } catch (err) {
        console.error("[sla-warnings] send failed:", err);
      }
    }
  }
);
