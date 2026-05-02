import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { getOrders } from "@/lib/orders";
import { getEnquiries } from "@/lib/enquiries";
import { getProducts } from "@/lib/products";
import { formatPriceFromPence } from "@/lib/basket";
import type { OrderStatus } from "@/types";

async function AdminDashboardContent() {
  await connection();
  const [allOrders, newEnquiries, products] = await Promise.all([
    getOrders(),
    getEnquiries("new"),
    getProducts(),
  ]);

  const recentOrders = allOrders.slice(0, 10);

  const openOrders = allOrders.filter((o) => o.status === "pending" || o.status === "paid");

  const lowStock = products.flatMap((p) =>
    p.variants
      .filter((v) => v.active && v.stock > 0 && v.stock <= 5)
      .map((v) => ({ product: p.name, sku: v.sku, stock: v.stock }))
  );

  const recentRevenue = recentOrders
    .filter((o) => o.status === "paid" || o.status === "fulfilled")
    .reduce((sum, o) => sum + o.totalInPence, 0);

  return (
    <div>
      <h1 className="text-4xl mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard label="Open orders" value={String(openOrders.length)} />
        <StatCard label="Low stock alerts" value={String(lowStock.length)} />
        <StatCard label="New enquiries" value={String(newEnquiries.length)} />
        <StatCard label="Revenue (last 10 orders)" value={formatPriceFromPence(recentRevenue)} />
      </div>

      <section className="bg-white border border-[#DDE1E7] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-2xl text-[#0D1B3E]">Recent orders</h2>
          <Link href="/admin/orders" className="text-xs underline text-[#6B7280]">
            View all
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-sm text-[#6B7280]">No orders yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-[#6B7280] border-b border-[#DDE1E7]">
              <tr>
                <th className="py-2">Order</th>
                <th className="py-2">Customer</th>
                <th className="py-2">Status</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id} className="border-b border-[#DDE1E7] last:border-0">
                  <td className="py-3">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="mono text-xs underline"
                    >
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="py-3">{o.customer.name}</td>
                  <td className="py-3">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="py-3 text-right mono">
                    {formatPriceFromPence(o.totalInPence)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-[#DDE1E7] p-5">
      <p className="label-editorial mb-2">{label}</p>
      <p className="font-serif text-3xl text-[#0D1B3E]">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const colorMap: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    paid: "bg-green-100 text-green-800",
    fulfilled: "bg-blue-100 text-blue-800",
    cancelled: "bg-gray-100 text-gray-800",
    refunded: "bg-red-100 text-red-800",
  };
  return (
    <span className={`px-2 py-0.5 text-xs rounded ${colorMap[status] ?? "bg-gray-100"}`}>
      {status}
    </span>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense>
      <AdminDashboardContent />
    </Suspense>
  );
}
