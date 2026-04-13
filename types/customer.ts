import type { Timestamp } from "firebase/firestore";
import type { Address } from "./order";

export type Customer = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  defaultAddress: Address | null;
  researchInstitution: string | null;
  marketingOptIn: boolean;
  orderCount: number;
  lifetimeValueInPence: number;
  createdAt: Timestamp | Date;
  lastLoginAt: Timestamp | Date;
};
