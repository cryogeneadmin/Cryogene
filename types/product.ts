import type { Timestamp } from "firebase/firestore";

export type ProductCategory = "peptides" | "capsules" | "mixers";

export type ProductVariant = {
  sku: string;
  size: string;
  priceInPence: number;
  stock: number;
  coaUrl: string | null;
  active: boolean;
};

export type ProductFaqItem = {
  question: string;
  answer: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;

  shortDescription: string;
  fullDescription: string;

  casNumber: string;
  molecularFormula: string;
  molecularWeight: string;
  synonyms: string[];
  purity: string;
  testingMethod: "HPLC" | "MS" | "HPLC-MS";

  variants: ProductVariant[];

  images: string[];
  primaryImageIndex: number;

  seoTitle: string | null;
  seoDescription: string | null;

  faq: ProductFaqItem[];

  tags: string[];
  active: boolean;

  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  updatedBy: string;
};
