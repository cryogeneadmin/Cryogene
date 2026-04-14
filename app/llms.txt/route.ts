// app/llms.txt/route.ts
import { getProducts } from "@/lib/products";
import { getConfig } from "@/lib/config";
import { getSiteUrl } from "@/lib/seo";
import type { Product } from "@/types";

export async function GET() {
  const [products, config] = await Promise.all([
    getProducts({ activeOnly: true }),
    getConfig(),
  ]);
  const baseUrl = getSiteUrl();
  const storeName = config.storeName;

  const peptides = products.filter((p) => p.category === "peptides");
  const supplies = products.filter((p) => p.category === "supplies");
  const mixers = products.filter((p) => p.category === "mixers");

  const formatProduct = (p: Product) => {
    const sizes = p.variants.map((v) => v.size).join(", ");
    return `- [${p.name}](${baseUrl}/${p.category}/${p.slug}): Research ${p.category.slice(0, -1)} — CAS ${p.casNumber ?? "N/A"}, ${p.molecularFormula ?? "N/A"}, ${p.molecularWeight ?? "N/A"}. Available in ${sizes}.`;
  };

  const body = `# ${storeName}

> Research-grade peptides and laboratory supplies for UK researchers.
> Every product HPLC-tested with a downloadable Certificate of Analysis.
> Sold strictly for laboratory research use only — not for human or veterinary consumption.

## About

- [About Us](${baseUrl}/about): Our approach to research supply and quality assurance
- [Product Information & Labelling](${baseUrl}/product-information): Standards, testing, and how to read our documentation
- [Research Use Only Statement](${baseUrl}/legal/research-use): Our legal position and commitments

## Research Peptides

${peptides.map(formatProduct).join("\n")}

## Research Supplies

${supplies.map(formatProduct).join("\n")}

## Mixers and Solvents

${mixers.map(formatProduct).join("\n")}

## Legal and Compliance

- [Terms and Conditions](${baseUrl}/legal/terms)
- [Privacy Policy](${baseUrl}/legal/privacy)
- [Refund and Returns Policy](${baseUrl}/legal/refunds)
- [Shipping Policy](${baseUrl}/legal/shipping)
- [Cookie Policy](${baseUrl}/legal/cookies)
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
