// app/(admin)/admin/orders/[id]/page.tsx
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrderById } from "@/lib/orders";
import { formatPriceFromPence } from "@/lib/basket";
import { OrderStatusControls } from "@/components/admin/OrderStatusControls";
import { coerceToDate } from "@/lib/utils";

async function OrderDetailContent({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!id || id.length > 128 || !/^[\w-]+$/.test(id)) notFound();
  const order = await getOrderById(id);
  if (!order) notFound();

  const paidAt = coerceToDate(order.payment.paidAt);

  return (
    <div>
      <h1 className="text-4xl mb-2">Order {order.orderNumber}</h1>
      <p className="mono text-xs text-muted mb-2">ID: {order.id}</p>
      <p className="mb-8">
        <Link
          href={`/admin/audit-log?tk=order&tid=${order.id}`}
          className="text-xs text-blue underline hover:no-underline"
        >
          View audit trail →
        </Link>
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-6">
          {/* Items */}
          <section className="bg-white border border-border p-6">
            <p className="label-editorial mb-4">Items</p>
            {order.items.map((item, i) => (
              <div
                key={`${item.sku}-${i}`}
                className="flex justify-between py-2 border-b border-border last:border-0"
              >
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="mono text-xs text-muted">
                    {item.sku} · {item.size} · qty {item.quantity}
                  </p>
                </div>
                <p className="mono text-sm">{formatPriceFromPence(item.lineTotalInPence)}</p>
              </div>
            ))}
            <div className="mt-4 pt-4 border-t border-border space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Subtotal</span>
                <span>{formatPriceFromPence(order.itemsSubtotalInPence)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Shipping</span>
                <span>{formatPriceFromPence(order.shippingCostInPence)}</span>
              </div>
              {order.vatAmountInPence > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted">VAT</span>
                  <span>{formatPriceFromPence(order.vatAmountInPence)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-border font-medium">
                <span>Total</span>
                <span>{formatPriceFromPence(order.totalInPence)}</span>
              </div>
            </div>
          </section>

          {/* Customer */}
          <section className="bg-white border border-border p-6">
            <p className="label-editorial mb-4">Customer</p>
            <div className="text-sm leading-relaxed">
              <p className="font-medium">{order.customer.name}</p>
              <p>{order.customer.email}</p>
              {order.customer.phone && <p>{order.customer.phone}</p>}
              <div className="mt-3 text-muted">
                <p>{order.customer.address.line1}</p>
                {order.customer.address.line2 && <p>{order.customer.address.line2}</p>}
                <p>{order.customer.address.city}</p>
                <p>{order.customer.address.postcode}</p>
              </div>
            </div>
          </section>

          {/* Payment */}
          <section className="bg-white border border-border p-6">
            <p className="label-editorial mb-4">Payment</p>
            <dl className="text-sm space-y-2">
              <div className="flex justify-between">
                <dt className="text-muted">Provider</dt>
                <dd>{order.payment.provider}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Reference</dt>
                <dd className="mono text-xs">{order.payment.providerRef ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Paid at</dt>
                <dd>{paidAt ? paidAt.toLocaleString("en-GB") : "—"}</dd>
              </div>
            </dl>
          </section>

          {/* Admin notes */}
          {order.adminNotes && (
            <section className="bg-white border border-border p-6">
              <p className="label-editorial mb-4">Admin notes</p>
              <p className="text-sm whitespace-pre-wrap text-body-grey">{order.adminNotes}</p>
            </section>
          )}
        </div>

        <aside>
          <OrderStatusControls order={order} />
        </aside>
      </div>
    </div>
  );
}

export default function AdminOrderDetailPage({
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
