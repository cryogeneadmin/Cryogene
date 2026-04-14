import Link from "next/link";
import { getProducts } from "@/lib/products";
import type { ProductCategory, Product } from "@/types";
import { ProductCard } from "./ProductCard";
import { ProductFilters } from "./ProductFilters";

type ListingPageProps = {
  category: ProductCategory;
  categoryLabel: string;
  categoryDescription: string;
  searchParams: { [key: string]: string | undefined };
};

function applyFilters(
  products: Product[],
  params: ListingPageProps["searchParams"]
): Product[] {
  const sizes = params.sizes?.split(",").filter(Boolean) ?? [];
  const methods = params.methods?.split(",").filter(Boolean) ?? [];
  const inStockOnly = params.instock === "1";

  let filtered = products.filter((p) => {
    if (sizes.length > 0) {
      const productSizes = p.variants.map((v) => v.size);
      if (!sizes.some((s) => productSizes.includes(s))) return false;
    }
    if (methods.length > 0 && (p.testingMethod === null || !methods.includes(p.testingMethod))) {
      return false;
    }
    if (inStockOnly) {
      const totalStock = p.variants.reduce((sum, v) => sum + v.stock, 0);
      if (totalStock === 0) return false;
    }
    return true;
  });

  const sort = params.sort ?? "newest";
  if (sort === "name-asc") {
    filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === "price-asc") {
    filtered = [...filtered].sort((a, b) => {
      const aPrice = Math.min(...a.variants.map((v) => v.priceInPence));
      const bPrice = Math.min(...b.variants.map((v) => v.priceInPence));
      return aPrice - bPrice;
    });
  } else if (sort === "price-desc") {
    filtered = [...filtered].sort((a, b) => {
      const aPrice = Math.min(...a.variants.map((v) => v.priceInPence));
      const bPrice = Math.min(...b.variants.map((v) => v.priceInPence));
      return bPrice - aPrice;
    });
  }
  return filtered;
}

export async function ProductListingPage({
  category,
  categoryLabel,
  categoryDescription,
  searchParams,
}: ListingPageProps) {
  const allProducts = await getProducts({ category, activeOnly: true });
  const filtered = applyFilters(allProducts, searchParams);

  const availableSizes = Array.from(
    new Set(allProducts.flatMap((p) => p.variants.map((v) => v.size)))
  ).sort();
  const availableMethods = Array.from(
    new Set(allProducts.map((p) => p.testingMethod).filter((m): m is NonNullable<typeof m> => m !== null))
  );

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-12">
      <nav aria-label="Breadcrumb" className="label-editorial mb-6">
        <Link href="/" className="hover:text-[#0D1B3E]">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-[#0D1B3E]">{categoryLabel}</span>
      </nav>
      <h1 className="text-5xl mb-3 leading-tight">{categoryLabel}</h1>
      <p className="text-lg text-[#6B7280] max-w-2xl mb-12">{categoryDescription}</p>
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
        <ProductFilters sizes={availableSizes} testingMethods={availableMethods} />
        <div>
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-[#6B7280]">
              {filtered.length} {filtered.length === 1 ? "product" : "products"}
            </p>
          </div>
          {filtered.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-[#DDE1E7]">
              <p className="font-serif text-2xl text-[#0D1B3E] mb-2">No products match your filters</p>
              <p className="text-sm text-[#6B7280]">Try clearing some filters to see more results.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
