// lib/email-templates/verification.ts
import "server-only";
import { getResend, FROM_ADDRESS } from "@/lib/email";

const TYPE_DESCRIPTIONS: Record<string, string> = {
  access: "send you a copy of your data",
  rectification: "correct your details",
  erasure: "erase your account",
  objection: "stop sending you marketing emails",
};

export async function sendVerificationEmail(input: {
  to: string;
  requestType: string;
  verifyUrl: string;
}): Promise<void> {
  const description = TYPE_DESCRIPTIONS[input.requestType] ?? "process your request";
  await getResend().emails.send({
    from: FROM_ADDRESS,
    to: input.to,
    subject: "Confirm your data-rights request",
    html: `
      <p>You asked us to ${description}. Click below to confirm — the link expires in 24 hours.</p>
      <p><a href="${input.verifyUrl}">Confirm my request</a></p>
      <p style="color:#6B7280;font-size:12px">If this wasn't you, you can ignore this email.</p>
    `,
  });
}
