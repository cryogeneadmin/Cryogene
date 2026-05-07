import "server-only";
import { z } from "zod";
import type { PrinterAdapter, PrintJobStatus } from "./types";
import { getDispatchConfig } from "@/lib/fulfilment/dispatch-config";

// Implementation note: verify the Zebra Print Cloud Connect REST API path
// against current Zebra developer docs (https://developer.zebra.com/) before
// flipping production live. Endpoint paths and auth headers may have evolved.

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Zebra adapter requires env ${name}`);
  return v;
}

const BASE_URL = () => process.env.ZEBRA_CLOUD_BASE_URL ?? "https://api.zebra.com";

const printResponseSchema = z.object({
  jobId: z.string(),
});

const statusResponseSchema = z.object({
  status: z.enum(["queued", "printed", "failed"]),
});

export const zebraCloudPrinter: PrinterAdapter = {
  async printPdf({ pdfUrl, orderId }) {
    const apiKey = requireEnv("ZEBRA_CLOUD_API_KEY");
    const config = await getDispatchConfig();
    if (!config.zebraPrinterDeviceId) {
      throw new Error("Zebra adapter: dispatchConfig.zebraPrinterDeviceId not set");
    }

    // Fetch the Royal Mail label PDF, then POST binary to Zebra cloud.
    const pdfRes = await fetch(pdfUrl);
    if (!pdfRes.ok) {
      throw new Error(`Failed to fetch label PDF: ${pdfRes.status}`);
    }
    const pdfBuffer = await pdfRes.arrayBuffer();

    const res = await fetch(
      `${BASE_URL()}/v2/devices/${encodeURIComponent(config.zebraPrinterDeviceId)}/sendpdf`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/pdf",
          "X-Order-Id": orderId,
        },
        body: pdfBuffer,
      }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Zebra printPdf failed: ${res.status} ${text.slice(0, 500)}`);
    }
    const json = await res.json();
    const parsed = printResponseSchema.parse(json);
    return { jobId: parsed.jobId };
  },

  async getJobStatus(jobId: string): Promise<PrintJobStatus> {
    const apiKey = requireEnv("ZEBRA_CLOUD_API_KEY");
    const config = await getDispatchConfig();
    if (!config.zebraPrinterDeviceId) {
      throw new Error("Zebra adapter: dispatchConfig.zebraPrinterDeviceId not set");
    }
    const res = await fetch(
      `${BASE_URL()}/v2/devices/${encodeURIComponent(config.zebraPrinterDeviceId)}/jobs/${encodeURIComponent(jobId)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Zebra getJobStatus failed: ${res.status} ${text.slice(0, 200)}`);
    }
    const json = await res.json();
    return statusResponseSchema.parse(json).status;
  },
};
