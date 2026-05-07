import "server-only";
import type { PrinterAdapter } from "./types";

const FAIL_NEXT_FLAG = "STUB_PRINTER_FAIL_NEXT";

export const stubPrinter: PrinterAdapter = {
  async printPdf({ pdfUrl, orderId }) {
    if (process.env[FAIL_NEXT_FLAG] === "1") {
      delete process.env[FAIL_NEXT_FLAG];
      throw new Error("Stub printer: simulated failure (STUB_PRINTER_FAIL_NEXT=1)");
    }
    console.log(`[stubPrinter] printPdf(${pdfUrl}) for order ${orderId}`);
    return { jobId: `stub-job-${orderId}-${Date.now()}` };
  },
  async getJobStatus(_jobId: string) {
    // Pretend the job completed instantly.
    return "printed";
  },
};
