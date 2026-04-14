// app/(admin)/admin/orders/page.tsx
import { getOrders } from "@/lib/orders";
import { OrderTable } from "@/components/admin/OrderTable";

export default async function AdminOrdersPage() {
  const orders = await getOrders();
  return (
    <div>
      <h1 className="text-4xl mb-8">Orders</h1>
      <OrderTable orders={orders} />
    </div>
  );
}
