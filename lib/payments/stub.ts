import "server-only";
import type { PaymentProvider } from "./provider";
import { updateOrder } from "@/lib/orders";

export const stubProvider: PaymentProvider = {
  name: "stub",
  async initiatePayment(order) {
    await updateOrder(order.id, {
      status: "paid",
      payment: {
        ...order.payment,
        provider: "stub",
        providerRef: `STUB-${order.id}`,
        paidAt: new Date() as unknown as Date,
      },
    });
    return {
      redirectUrl: `/checkout/confirmation/${order.id}?stub=true`,
      providerRef: `STUB-${order.id}`,
    };
  },
  async verifyWebhook() {
    return { valid: false, event: null };
  },
  parseWebhookEvent() {
    throw new Error("Stub provider does not receive webhooks");
  },
};
