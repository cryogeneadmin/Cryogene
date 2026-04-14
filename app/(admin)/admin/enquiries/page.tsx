import { getEnquiries } from "@/lib/enquiries";
import { EnquiriesList } from "@/components/admin/EnquiriesList";

export default async function AdminEnquiriesPage() {
  const enquiries = await getEnquiries();
  return (
    <div>
      <h1 className="text-4xl mb-8">Enquiries</h1>
      <EnquiriesList enquiries={enquiries} />
    </div>
  );
}
