import { z } from "zod";

export const ALLOWED_COUNTRY_CODES = ["GB"] as const;
export type AllowedCountryCode = (typeof ALLOWED_COUNTRY_CODES)[number];

export const addressSchema = z.object({
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).nullable(),
  city: z.string().min(1).max(120),
  postcode: z.string().min(1).max(20),
  country: z.enum(ALLOWED_COUNTRY_CODES),
});

export type AddressInput = z.infer<typeof addressSchema>;
