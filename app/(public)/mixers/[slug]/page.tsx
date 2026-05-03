import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getProductBySlug, getProducts } from "@/lib/products";
import { ProductDetail } from "@/components/storefront/products/ProductDetail";
import { writeCustomerEvent } from "@/lib/customer-events";

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
  // Fire-and-forget product.viewed. connection() defers this past the
  // static shell so PPR keeps working. Synchronous void — do not await.
  await connection();
  writeCustomerEvent({
    eventType: "product.viewed",
    payload: {
      productId: product.id,
      slug: product.slug,
      category: product.category,
      name: product.name,
    },
  });
  return <ProductDetail product={product} />;
}
