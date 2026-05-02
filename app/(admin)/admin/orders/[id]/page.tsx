// app/(admin)/admin/orders/[id]/page.tsx
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
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
      <p className="mono text-xs text-[#6B7280] mb-8">ID: {order.id}</p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-6">
          {/* Items */}
          <section className="bg-white border border-[#DDE1E7] p-6">
            <p className="label-editorial mb-4">Items</p>
            {order.items.map((item, i) => (
              <div
                key={`${item.sku}-${i}`}
                className="flex justify-between py-2 border-b border-[#DDE1E7] last:border-0"
              >
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="mono text-xs text-[#6B7280]">
                    {item.sku} · {item.size} · qty {item.quantity}
                  </p>
                </div>
                <p className="mono text-sm">{formatPriceFromPence(item.lineTotalInPence)}</p>
              </div>
            ))}
            <div className="mt-4 pt-4 border-t border-[#DDE1E7] space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Subtotal</span>
                <span>{formatPriceFromPence(order.itemsSubtotalInPence)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Shipping</span>
                <span>{formatPriceFromPence(order.shippingCostInPence)}</span>
              </div>
              {order.vatAmountInPence > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">VAT</span>
                  <span>{formatPriceFromPence(order.vatAmountInPence)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-[#DDE1E7] font-medium">
                <span>Total</span>
                <span>{formatPriceFromPence(order.totalInPence)}</span>
              </div>
            </div>
          </section>

          {/* Customer */}
          <section className="bg-white border border-[#DDE1E7] p-6">
            <p className="label-editorial mb-4">Customer</p>
            <div className="text-sm leading-relaxed">
              <p className="font-medium">{order.customer.name}</p>
              <p>{order.customer.email}</p>
              {order.customer.phone && <p>{order.customer.phone}</p>}
              <div className="mt-3 text-[#6B7280]">
                <p>{order.customer.address.line1}</p>
                {order.customer.address.line2 && <p>{order.customer.address.line2}</p>}
                <p>{order.customer.address.city}</p>
                <p>{order.customer.address.postcode}</p>
              </div>
            </div>
          </section>

          {/* Payment */}
          <section className="bg-white border border-[#DDE1E7] p-6">
            <p className="label-editorial mb-4">Payment</p>
            <dl className="text-sm space-y-2">
              <div className="flex justify-between">
                <dt className="text-[#6B7280]">Provider</dt>
                <dd>{order.payment.provider}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#6B7280]">Reference</dt>
                <dd className="mono text-xs">{order.payment.providerRef ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#6B7280]">Paid at</dt>
                <dd>{paidAt ? paidAt.toLocaleString("en-GB") : "—"}</dd>
              </div>
            </dl>
          </section>

          {/* Admin notes */}
          {order.adminNotes && (
            <section className="bg-white border border-[#DDE1E7] p-6">
              <p className="label-editorial mb-4">Admin notes</p>
              <p className="text-sm whitespace-pre-wrap text-[#333333]">{order.adminNotes}</p>
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
