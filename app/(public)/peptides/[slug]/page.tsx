import { notFound } from "next/navigation";
import { getProductBySlug, getProducts } from "@/lib/products";
import { ProductDetail } from "@/components/storefront/products/ProductDetail";

export async function generateStaticParams() {
  const products = await getProducts({ category: "peptides", activeOnly: true });
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || product.category !== "peptides") return {};
  return {
    title: `${product.name} — Research Peptide`,
    description: `Research-grade ${product.name} (CAS ${product.casNumber}, ${product.molecularFormula}). HPLC-tested, ${product.purity} purity. Certificate of Analysis included. For laboratory research use only.`,
  };
}

export default async function PeptideDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || product.category !== "peptides") notFound();
  return <ProductDetail product={product} />;
}
