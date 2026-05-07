import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies an inbound webhook signature using HMAC-SHA256.
 *
 * Implementation note: verify against current Royal Mail webhook docs at
 * integration time. Algorithm, header name, and body canonicalisation may
 * differ. This implementation assumes raw body + secret + sha256 hex digest,
 * with optional "sha256=" prefix on the header value.
 */
export function verifyWebhookSignature(args: {
  rawBody: string;
  signatureHeader: string | null;
  secret: string;
}): boolean {
  if (!args.signatureHeader) return false;
  const computed = createHmac("sha256", args.secret).update(args.rawBody).digest("hex");
  const expected = Buffer.from(computed, "hex");
  // Strip a "sha256=" prefix if present.
  const actualHex = args.signatureHeader.replace(/^sha256=/i, "");
  let actual: Buffer;
  try {
    actual = Buffer.from(actualHex, "hex");
  } catch {
    return false;
  }
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
