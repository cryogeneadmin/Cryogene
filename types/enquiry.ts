import type { Timestamp } from "firebase/firestore";

export type EnquiryStatus = "new" | "replied" | "archived";

export type Enquiry = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: EnquiryStatus;
  createdAt: Timestamp | Date;
};
