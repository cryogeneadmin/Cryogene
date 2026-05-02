import { Suspense } from "react";
import { ProductListingPage } from "@/components/storefront/products/ProductListingPage";

export default function MixersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  return (
    <Suspense>
      <ProductListingPage
        category="mixers"
        categoryLabel="Mixers & Solvents"
        categoryDescription="Laboratory-grade bacteriostatic water and sterile saline for reconstitution in research protocols. For laboratory research use only."
        searchParams={searchParams}
      />
    </Suspense>
  );
}

export const metadata = {
  title: "Mixers & Solvents",
  description:
    "Laboratory-grade mixers and solvents for UK research. Bacteriostatic water and sterile saline for reconstitution in research contexts.",
};
