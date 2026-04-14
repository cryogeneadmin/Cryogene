// lib/seo.ts
import type { Product, Config } from "@/types";

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://peptidestore.co.uk";
}

export function getStoreName(config: Config | null): string {
  return config?.storeName || process.env.NEXT_PUBLIC_SITE_NAME || "[PEPTIDE STORE]";
}

export function buildProductJsonLd(
  product: Product,
  config: Config | null
): object {
  const siteUrl = getSiteUrl();
  const storeName = getStoreName(config);
  const lowestPrice = product.variants.length > 0
    ? Math.min(...product.variants.map((v) => v.priceInPence))
    : 0;
  const inStock = product.variants.some((v) => v.active && v.stock > 0);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription,
    image: product.images.map((img) =>
      img.startsWith("http") ? img : `${siteUrl}${img}`
    ),
    sku: product.variants[0]?.sku,
    brand: { "@type": "Brand", name: storeName },
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/${product.category}/${product.slug}`,
      priceCurrency: "GBP",
      price: (lowestPrice / 100).toFixed(2),
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: storeName },
    },
    additionalProperty: [
      { "@type": "PropertyValue", name: "CAS Number", value: product.casNumber },
      { "@type": "PropertyValue", name: "Molecular Formula", value: product.molecularFormula },
      { "@type": "PropertyValue", name: "Molecular Weight", value: product.molecularWeight },
      { "@type": "PropertyValue", name: "Purity", value: product.purity },
      { "@type": "PropertyValue", name: "Testing Method", value: product.testingMethod },
      { "@type": "PropertyValue", name: "Intended Use", value: "Laboratory research only" },
    ].filter((p) => p.value !== null),
  };
}

export function buildFaqJsonLd(
  items: Array<{ question: string; answer: string }>
): object | null {
  if (items.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function buildBreadcrumbJsonLd(
  crumbs: Array<{ name: string; url: string }>
): object {
  const siteUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: crumb.name,
      item: crumb.url.startsWith("http") ? crumb.url : `${siteUrl}${crumb.url}`,
    })),
  };
}

export function buildOrganizationJsonLd(config: Config | null): object {
  const siteUrl = getSiteUrl();
  const storeName = getStoreName(config);
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: storeName,
    url: siteUrl,
    email: config?.storeEmail,
    address: config?.registeredAddress
      ? {
          "@type": "PostalAddress",
          streetAddress: config.registeredAddress,
          addressCountry: "GB",
        }
      : undefined,
  };
}

export function renderJsonLd(data: object): string {
  return JSON.stringify(data, null, 0).replace(/<\//g, "<\\/");
}
