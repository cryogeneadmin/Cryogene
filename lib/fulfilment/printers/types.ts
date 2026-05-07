import "server-only";

export type PrintJobStatus = "queued" | "printed" | "failed";

export type PrinterAdapter = {
  printPdf(input: { pdfUrl: string; orderId: string }): Promise<{ jobId: string }>;
  getJobStatus(jobId: string): Promise<PrintJobStatus>;
};
