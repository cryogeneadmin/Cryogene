import "server-only";
import type { PrinterAdapter } from "./types";

/**
 * Typed stub. PrintNode is the alternative to Zebra Cloud Connect — kept as a
 * reserved enum option in case Zebra's cloud platform proves flaky in
 * production. Throwing on call surfaces misconfiguration immediately.
 */
export const printNodePrinter: PrinterAdapter = {
  async printPdf() {
    throw new Error("PrintNode printer not implemented — alternative to Zebra Cloud");
  },
  async getJobStatus() {
    throw new Error("PrintNode printer not implemented");
  },
};
