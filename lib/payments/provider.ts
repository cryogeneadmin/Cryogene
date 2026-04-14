import type { Order } from "@/types";

export type PaymentInitiationResult = {
  redirectUrl: string;
  providerRef: string;
};

export type PaymentProvider = {
  name: "stub" | "truelayer";
  initiatePayment(order: Order): Promise<PaymentInitiationResult>;
  verifyWebhook(request: Request): Promise<{ valid: boolean; event: unknown }>;
  parseWebhookEvent(event: unknown): {
    orderId: string;
    status: "paid" | "failed";
    providerRef: string;
  };
};
