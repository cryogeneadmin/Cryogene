import type { Timestamp } from "firebase/firestore";

export type ProductCategory = "peptides" | "mixers" | "supplies";

export type ProductVariant = {
  sku: string;
  size: string;
  packSize: string;
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

  casNumber: string | null;
  molecularFormula: string | null;
  molecularWeight: string | null;
  synonyms: string[];
  purity: string | null;
  testingMethod: "HPLC" | "MS" | "HPLC-MS" | null;

  pubchemCid: number | null;
  moleculeImage: string | null;

  composition?: Array<{ compound: string; amount: string }>;

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
