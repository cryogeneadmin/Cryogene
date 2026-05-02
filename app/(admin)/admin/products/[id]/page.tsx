import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getProducts } from "@/lib/products";
import { ProductForm } from "@/components/admin/ProductForm";

async function EditProductContent({ params }: { params: Promise<{ id: string }> }) {
  await connection();
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

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense>
      <EditProductContent params={params} />
    </Suspense>
  );
}
