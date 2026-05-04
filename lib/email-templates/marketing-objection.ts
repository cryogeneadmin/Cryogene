// lib/email-templates/marketing-objection.ts
import "server-only";
import { getResend, FROM_ADDRESS } from "@/lib/email";

export async function sendObjectionConfirmedEmail(input: { to: string }): Promise<void> {
  await getResend().emails.send({
    from: FROM_ADDRESS,
    to: input.to,
    subject: "You have been unsubscribed",
    html: `
      <p>You will no longer receive marketing emails from Cryogene Laboratories.</p>
      <p>Transactional emails (order confirmations, dispatch notifications) will still be sent
      where required for the service.</p>
    `,
  });
}
