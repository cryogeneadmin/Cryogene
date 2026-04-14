import { ProductListingPage } from "@/components/storefront/products/ProductListingPage";

export default async function SuppliesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  return (
    <ProductListingPage
      category="supplies"
      categoryLabel="Research Supplies"
      categoryDescription="Laboratory supplies and consumables supplied with a Certificate of Analysis for every batch. Sold strictly for laboratory research use."
      searchParams={params}
    />
  );
}

export const metadata = {
  title: "Research Supplies",
  description:
    "Research-grade supplies for UK laboratories. Every item tested with a downloadable Certificate of Analysis. For laboratory research use only.",
};
