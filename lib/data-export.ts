import "server-only";

export async function buildAccessExport(_input: {
  email: string;
  uid: string | null;
  requestId: string;
}): Promise<{ downloadUrl: string }> {
  return { downloadUrl: "" };
}
