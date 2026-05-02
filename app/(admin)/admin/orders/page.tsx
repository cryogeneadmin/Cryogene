// app/(admin)/admin/orders/page.tsx
import { Suspense } from "react";
import { connection } from "next/server";
import { getOrders } from "@/lib/orders";
import { OrderTable } from "@/components/admin/OrderTable";

async function OrdersContent() {
  await connection();
  const orders = await getOrders();
  return <OrderTable orders={orders} />;
}

export default function AdminOrdersPage() {
  return (
    <div>
      <h1 className="text-4xl mb-8">Orders</h1>
      <Suspense>
        <OrdersContent />
      </Suspense>
    </div>
  );
}
