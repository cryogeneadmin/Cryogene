import "server-only";
import type { PaymentProvider } from "./provider";

/**
 * TrueLayer open banking Pay by Bank implementation.
 *
 * Phase 1 scaffold only — throws on invocation. Full implementation lands
 * in Phase 2 and uses the TrueLayer REST API + Web SDK + signed payment
 * requests + webhook signature verification + Signup+ bank-level age
 * verification. See spec Section 21 and the Phase 2 brief for details.
 */
export const truelayerProvider: PaymentProvider = {
  name: "truelayer",
  async initiatePayment() {
    throw new Error(
      "TrueLayer provider not yet implemented. Phase 2 scope. " +
      "Connect the TrueLayer MCP server in Claude Code before starting Phase 2."
    );
  },
  async verifyWebhook() {
    throw new Error("TrueLayer provider not yet implemented");
  },
  parseWebhookEvent() {
    throw new Error("TrueLayer provider not yet implemented");
  },
};
