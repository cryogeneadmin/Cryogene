import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { AccountLayout } from "@/components/storefront/account/AccountLayout";
import { TrackingTimeline } from "@/components/account/TrackingTimeline";
import { getOrderById } from "@/lib/orders";
import { getCustomerSession } from "@/lib/customer-auth";
import { formatPriceFromPence } from "@/lib/basket";

async function OrderDetailContent({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;

  // Server-side auth gate: read the session cookie BEFORE fetching any order data.
  // Using notFound() rather than redirect() so we don't confirm order-ID existence
  // to unauthenticated callers.
  const session = await getCustomerSession();
  if (!session) notFound();

  const order = await getOrderById(id);
  if (!order) notFound();

  // Ownership check: the order must belong to this customer, unless they are an admin.
  if (order.customer.uid !== session.uid && !session.admin) {
    notFound();
  }

  return (
    <AccountLayout>
      <h1 className="text-4xl mb-2">Order {order.orderNumber}</h1>
      <p className="text-sm text-muted mb-8">
        Status: {order.status}
      </p>

      <div className="mb-8">
        <TrackingTimeline
          events={order.fulfilment.trackingEvents}
          lastStatus={order.fulfilment.lastTrackingStatus}
          trackingNumber={order.fulfilment.trackingNumber}
        />
      </div>

      <div className="space-y-4">
        {order.items.map((item, i) => (
          <div key={`${item.sku}-${i}`} className="flex justify-between py-3 border-b border-border">
            <div>
              <p className="font-serif text-lg">{item.name}</p>
              <p className="mono text-xs text-muted">{item.sku} · {item.size} · qty {item.quantity}</p>
            </div>
            <p className="text-sm font-medium">{formatPriceFromPence(item.lineTotalInPence)}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 pt-6 border-t border-border flex justify-between text-lg font-medium">
        <span>Total</span>
        <span>{formatPriceFromPence(order.totalInPence)}</span>
      </div>
    </AccountLayout>
  );
}

export default function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense>
      <OrderDetailContent params={params} />
    </Suspense>
  );
}
