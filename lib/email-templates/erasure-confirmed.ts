// lib/email-templates/erasure-confirmed.ts
import "server-only";
import { getResend, FROM_ADDRESS } from "@/lib/email";

export async function sendErasureConfirmedEmail(input: { to: string }): Promise<void> {
  await getResend().emails.send({
    from: FROM_ADDRESS,
    to: input.to,
    subject: "Your data has been erased",
    html: `
      <p>Your account and personal data have been erased on ${new Date().toLocaleDateString("en-GB")}.</p>
      <p>Order records have been retained in <strong>anonymised form</strong> for 6 years to satisfy
      HMRC tax-record requirements (UK Companies Act). No personally identifiable information remains.</p>
      <p style="color:#6B7280;font-size:12px">If you didn't request this, contact us immediately.</p>
    `,
  });
}
