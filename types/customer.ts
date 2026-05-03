import type { Timestamp } from "firebase/firestore";
import type { Address } from "./order";
import type { MarketingConsent } from "./data-rights";

export type Customer = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  defaultAddress: Address | null;
  researchInstitution: string | null;
  /** Per UK GDPR + ICO: explicit grant + provenance + withdrawal mechanism. */
  marketingConsent: MarketingConsent;
  orderCount: number;
  lifetimeValueInPence: number;
  createdAt: Timestamp | Date;
  lastLoginAt: Timestamp | Date;
};
