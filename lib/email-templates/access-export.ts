import "server-only";

export async function sendAccessExportEmail(input: { to: string; downloadUrl: string }): Promise<void> {
  console.log("[stub] access-export email", input);
}
