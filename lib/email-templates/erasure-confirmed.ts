import "server-only";

export async function sendErasureConfirmedEmail(input: { to: string }): Promise<void> {
  console.log("[stub] erasure-confirmed email", input);
}
