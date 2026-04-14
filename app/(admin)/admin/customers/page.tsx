import { getCustomers } from "@/lib/customers";
import { formatPriceFromPence } from "@/lib/basket";

export default async function AdminCustomersPage() {
  const customers = await getCustomers();
  return (
    <div>
      <h1 className="text-4xl mb-8">Customers</h1>
      {customers.length === 0 ? (
        <p className="text-sm text-[#6B7280]">
          No customers yet. Accounts will appear here once Firebase Auth is wired in Stage 1b.
        </p>
      ) : (
        <table className="w-full text-sm bg-white border border-[#DDE1E7]">
          <thead className="text-left border-b border-[#DDE1E7]">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Research institution</th>
              <th className="p-3 text-right">Orders</th>
              <th className="p-3 text-right">LTV</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-[#DDE1E7] last:border-0">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3 text-[#6B7280]">{c.email}</td>
                <td className="p-3 text-[#6B7280]">{c.researchInstitution ?? "—"}</td>
                <td className="p-3 text-right">{c.orderCount}</td>
                <td className="p-3 text-right mono">{formatPriceFromPence(c.lifetimeValueInPence)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
