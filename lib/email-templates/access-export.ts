// lib/email-templates/access-export.ts
import "server-only";
import { getResend, FROM_ADDRESS } from "@/lib/email";

export async function sendAccessExportEmail(input: {
  to: string;
  downloadUrl: string;
}): Promise<void> {
  await getResend().emails.send({
    from: FROM_ADDRESS,
    to: input.to,
    subject: "Your data export from Cryogene Laboratories",
    html: `
      <p>Your data export is ready. The download link is valid for 7 days:</p>
      <p><a href="${input.downloadUrl}">Download your data</a></p>
      <p>The bundle is a ZIP containing CSV and JSON files. Open the README for a guide.</p>
      <p style="color:#6B7280;font-size:12px">Questions? Reply to this email.</p>
    `,
  });
}
