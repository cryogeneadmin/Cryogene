import "server-only";
import type { PaymentProvider } from "./provider";
import { stubProvider } from "./stub";
import { truelayerProvider } from "./truelayer";

export function getPaymentProvider(): PaymentProvider {
  const name = process.env.PAYMENT_PROVIDER ?? "stub";
  switch (name) {
    case "truelayer":
      return truelayerProvider;
    case "stub":
    default:
      return stubProvider;
  }
}
