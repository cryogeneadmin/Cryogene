import "server-only";
import type { PrinterAdapter } from "./types";
import { stubPrinter } from "./stub";
import { zebraCloudPrinter } from "./zebra-cloud";
import { printNodePrinter } from "./printnode";
import { getDispatchConfig } from "@/lib/fulfilment/dispatch-config";

let warnedOnce = false;

export async function getPrinter(): Promise<PrinterAdapter> {
  const platform = process.env.PRINTER_PLATFORM ?? "stub";
  const config = await getDispatchConfig();

  if (platform === "stub") return stubPrinter;

  if (platform === "zebra-cloud") {
    const hasKey = !!process.env.ZEBRA_CLOUD_API_KEY;
    if (hasKey && config.enabled && config.zebraPrinterDeviceId) {
      return zebraCloudPrinter;
    }
    if (!warnedOnce) {
      const reason = !hasKey
        ? "ZEBRA_CLOUD_API_KEY missing"
        : !config.enabled
          ? "config.enabled=false"
          : "zebraPrinterDeviceId not set";
      console.warn(
        `Printer selector: PRINTER_PLATFORM=zebra-cloud but ${reason} — falling back to stub`
      );
      warnedOnce = true;
    }
    return stubPrinter;
  }

  if (platform === "printnode") return printNodePrinter;

  if (!warnedOnce) {
    console.warn(`Printer selector: unknown PRINTER_PLATFORM=${platform} — using stub`);
    warnedOnce = true;
  }
  return stubPrinter;
}

export type { PrinterAdapter, PrintJobStatus } from "./types";
