import { notFound } from "next/navigation";
import { getProductBySlug, getProducts } from "@/lib/products";
import { ProductDetail } from "@/components/storefront/products/ProductDetail";

export async function generateStaticParams() {
  const products = await getProducts({ category: "mixers", activeOnly: true });
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || product.category !== "mixers") return {};
  return {
    title: `${product.name} — Laboratory Mixer`,
    description: `${product.name} for laboratory research. ${product.purity} purity, ${product.testingMethod} tested. For laboratory research use only.`,
  };
}

export default async function MixerDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || product.category !== "mixers") notFound();
  return <ProductDetail product={product} />;
}
