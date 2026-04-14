import { ProductListingPage } from "@/components/storefront/products/ProductListingPage";

export default async function CapsulesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  return (
    <ProductListingPage
      category="capsules"
      categoryLabel="Research Capsules"
      categoryDescription="Research-grade capsule formulations supplied with a Certificate of Analysis for every batch. Sold strictly for laboratory research use."
      searchParams={params}
    />
  );
}

export const metadata = {
  title: "Research Capsules",
  description:
    "Research-grade capsules for UK laboratories. Every formulation tested and documented. For laboratory research use only.",
};
