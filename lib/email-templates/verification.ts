// lib/email-templates/verification.ts (stub — real impl in Section J)
import "server-only";

export async function sendVerificationEmail(input: {
  to: string;
  requestType: string;
  verifyUrl: string;
}): Promise<void> {
  console.log("[stub] verification email", input);
}
