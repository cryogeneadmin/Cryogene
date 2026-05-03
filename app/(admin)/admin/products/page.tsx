import Link from "next/link";
import { getProducts } from "@/lib/products";
import { ProductTable } from "@/components/admin/ProductTable";

export default async function AdminProductsPage() {
  const products = await getProducts();

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl">Products</h1>
        <Link
          href="/admin/products/new"
          className="px-5 py-2 bg-navy text-white uppercase tracking-wider text-xs hover:bg-mid-navy"
        >
          Add product
        </Link>
      </div>
      <ProductTable products={products} />
    </div>
  );
}
