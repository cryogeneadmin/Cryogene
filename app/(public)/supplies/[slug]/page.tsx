import { notFound } from "next/navigation";
import { getProductBySlug, getProducts } from "@/lib/products";
import { ProductDetail } from "@/components/storefront/products/ProductDetail";

export async function generateStaticParams() {
  const products = await getProducts({ category: "supplies", activeOnly: true });
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || product.category !== "supplies") return {};
  return {
    title: `${product.name} — Research Supply`,
    description: `Research-grade ${product.name} (CAS ${product.casNumber}, ${product.molecularFormula}). HPLC-tested, ${product.purity} purity. Certificate of Analysis included. For laboratory research use only.`,
  };
}

export default async function SupplyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || product.category !== "supplies") notFound();
  return <ProductDetail product={product} />;
}
