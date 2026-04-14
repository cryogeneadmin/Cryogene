import { notFound } from "next/navigation";
import { getProductBySlug, getProducts } from "@/lib/products";
import { ProductDetail } from "@/components/storefront/products/ProductDetail";

export async function generateStaticParams() {
  const products = await getProducts({ category: "capsules", activeOnly: true });
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || product.category !== "capsules") return {};
  return {
    title: `${product.name} — Research Capsule`,
    description: `Research-grade ${product.name}. ${product.purity} purity, ${product.testingMethod} tested. Certificate of Analysis included. For laboratory research use only.`,
  };
}

export default async function CapsuleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || product.category !== "capsules") notFound();
  return <ProductDetail product={product} />;
}
