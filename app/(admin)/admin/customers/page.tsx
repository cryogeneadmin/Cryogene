import { Suspense } from "react";
import { connection } from "next/server";
import { getCustomers } from "@/lib/customers";
import { formatPriceFromPence } from "@/lib/basket";

async function CustomersContent() {
  await connection();
  const customers = await getCustomers();
  return (
    <div>
      <h1 className="text-4xl mb-8">Customers</h1>
      {customers.length === 0 ? (
        <p className="text-sm text-muted">
          No customers yet. Accounts will appear here once Firebase Auth is wired in Stage 1b.
        </p>
      ) : (
        <table className="w-full text-sm bg-white border border-border">
          <thead className="text-left border-b border-border">
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
              <tr key={c.id} className="border-b border-border last:border-0">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3 text-muted">{c.email}</td>
                <td className="p-3 text-muted">{c.researchInstitution ?? "—"}</td>
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

export default function AdminCustomersPage() {
  return (
    <Suspense>
      <CustomersContent />
    </Suspense>
  );
}
