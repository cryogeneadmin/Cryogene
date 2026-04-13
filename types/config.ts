import type { Timestamp } from "firebase/firestore";

export type Config = {
  storeName: string;
  storeEmail: string;
  storePhone: string | null;
  registeredAddress: string;
  companyNumber: string | null;
  vatNumber: string | null;

  shipping: {
    flatRateInPence: number;
    freeThresholdInPence: number | null;
    estimatedDispatch: string;
  };

  vat: {
    registered: boolean;
    rate: number;
    displayPricesInclusive: boolean;
  };

  notifications: {
    newOrderEmailTo: string;
  };

  updatedAt: Timestamp | Date;
  updatedBy: string;
};
