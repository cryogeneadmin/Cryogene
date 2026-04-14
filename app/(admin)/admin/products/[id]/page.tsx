import { notFound } from "next/navigation";
import { getProducts } from "@/lib/products";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const products = await getProducts();
  const product = products.find((p) => p.id === id);
  if (!product) notFound();

  return (
    <div>
      <h1 className="text-4xl mb-8">Edit {product.name}</h1>
      <ProductForm initial={product} />
    </div>
  );
}
