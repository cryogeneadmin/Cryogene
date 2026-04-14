// app/sitemap.ts
import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/products";
import { getSiteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const products = await getProducts({ activeOnly: true });

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, priority: 1.0, changeFrequency: "weekly" },
    { url: `${baseUrl}/peptides`, priority: 0.9, changeFrequency: "weekly" },
    { url: `${baseUrl}/mixers`, priority: 0.9, changeFrequency: "weekly" },
    { url: `${baseUrl}/supplies`, priority: 0.9, changeFrequency: "weekly" },
    { url: `${baseUrl}/about`, priority: 0.7, changeFrequency: "monthly" },
    { url: `${baseUrl}/product-information`, priority: 0.8, changeFrequency: "monthly" },
    { url: `${baseUrl}/contact`, priority: 0.6, changeFrequency: "monthly" },
    { url: `${baseUrl}/sign-in`, priority: 0.3 },
    { url: `${baseUrl}/sign-up`, priority: 0.3 },
  ];

  const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${baseUrl}/${p.category}/${p.slug}`,
    lastModified:
      p.updatedAt instanceof Date
        ? p.updatedAt
        : new Date((p.updatedAt as unknown as { toDate(): Date }).toDate()),
    priority: 0.8,
    changeFrequency: "weekly" as const,
  }));

  const legalPaths = [
    "/legal/terms",
    "/legal/privacy",
    "/legal/cookies",
    "/legal/refunds",
    "/legal/shipping",
    "/legal/research-use",
  ];
  const legalEntries: MetadataRoute.Sitemap = legalPaths.map((p) => ({
    url: `${baseUrl}${p}`,
    priority: 0.3,
    changeFrequency: "monthly" as const,
  }));

  return [...staticEntries, ...productEntries, ...legalEntries];
}
