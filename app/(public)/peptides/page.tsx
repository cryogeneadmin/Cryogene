import { ProductListingPage } from "@/components/storefront/products/ProductListingPage";

export default async function PeptidesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  return (
    <ProductListingPage
      category="peptides"
      categoryLabel="Research Peptides"
      categoryDescription="HPLC-tested peptide compounds supplied with a Certificate of Analysis for every batch. Sold strictly for laboratory research use."
      searchParams={params}
    />
  );
}

export const metadata = {
  title: "Research Peptides",
  description:
    "Research-grade peptides for UK laboratories. Every compound HPLC-tested with a downloadable Certificate of Analysis. For laboratory research use only.",
};
