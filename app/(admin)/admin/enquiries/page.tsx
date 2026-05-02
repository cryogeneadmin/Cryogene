import { Suspense } from "react";
import { connection } from "next/server";
import { getEnquiries } from "@/lib/enquiries";
import { EnquiriesList } from "@/components/admin/EnquiriesList";

async function EnquiriesContent() {
  await connection();
  const enquiries = await getEnquiries();
  return <EnquiriesList enquiries={enquiries} />;
}

export default function AdminEnquiriesPage() {
  return (
    <div>
      <h1 className="text-4xl mb-8">Enquiries</h1>
      <Suspense>
        <EnquiriesContent />
      </Suspense>
    </div>
  );
}
