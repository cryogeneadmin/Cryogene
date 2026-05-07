import { z } from "zod";

export const ALLOWED_CURRENCY_CODES = ["GBP"] as const;
export const currencyCodeSchema = z.enum(ALLOWED_CURRENCY_CODES);
