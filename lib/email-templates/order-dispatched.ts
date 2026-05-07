// lib/email-templates/order-dispatched.ts
import "server-only";
import type { Order } from "@/types/order";
import { getResend, FROM_ADDRESS } from "@/lib/email";

const SERVICE_LABELS: Record<string, string> = {
  TPN24: "Tracked 24 — typically delivered next working day",
  TPN48: "Tracked 48 — typically delivered in 2-3 working days",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendOrderDispatchedEmail(input: {
  order: Order;
  baseUrl: string;
}): Promise<void> {
  const { order, baseUrl } = input;
  const trackingNumber = order.fulfilment.trackingNumber;
  if (!trackingNumber) {
    throw new Error("sendOrderDispatchedEmail: order has no tracking number");
  }

  const trackingUrl = `https://www.royalmail.com/track-your-item#/tracking-results/${encodeURIComponent(trackingNumber)}`;
  const accountUrl = `${baseUrl}/account/orders/${encodeURIComponent(order.id)}`;
  // v1 doesn't store the chosen serviceCode on the order, so default to
  // TPN48's wording. Future enhancement: persist serviceCode on
  // OrderFulfilment and look up the precise label here.
  const serviceLabel = SERVICE_LABELS.TPN48;
  const firstName = order.customer.name.split(" ")[0] ?? "there";

  const itemsHtml = order.items
    .map(
      (i) =>
        `<li>${escapeHtml(i.name)} (${escapeHtml(i.size)}) × ${i.quantity}</li>`
    )
    .join("");
  const itemsText = order.items
    .map((i) => `- ${i.name} (${i.size}) × ${i.quantity}`)
    .join("\n");

  const subject = `Your order ${order.orderNumber} has been dispatched`;
  const html = `
<!doctype html>
<html lang="en">
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
    <h1 style="font-size: 20px; font-weight: 600;">Your order is on its way</h1>
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>Order <strong>${escapeHtml(order.orderNumber)}</strong> has been dispatched with Royal Mail.</p>
    <p>
      <strong>Tracking number:</strong>
      <a href="${trackingUrl}">${escapeHtml(trackingNumber)}</a><br>
      <strong>Service:</strong> ${escapeHtml(serviceLabel)}
    </p>
    <p><strong>Items in this parcel:</strong></p>
    <ul>${itemsHtml}</ul>
    <p><a href="${accountUrl}">View order in your account →</a></p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p style="font-size: 12px; color: #6b7280;">
      Cryogene Laboratories. Research Use Only — Not for Human Consumption.
    </p>
  </body>
</html>`;

  const text = `Your order is on its way

Hi ${firstName},

Order ${order.orderNumber} has been dispatched with Royal Mail.

Tracking number: ${trackingNumber}
Track at: ${trackingUrl}
Service: ${serviceLabel}

Items in this parcel:
${itemsText}

View order: ${accountUrl}

—
Cryogene Laboratories. Research Use Only — Not for Human Consumption.
`;

  await getResend().emails.send({
    from: FROM_ADDRESS,
    to: order.customer.email,
    subject,
    html,
    text,
  });
}
