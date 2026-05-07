import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getOrderById } from "@/lib/orders";
import { coerceToDate } from "@/lib/utils";

async function PackingSlipContent({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!id || !/^[\w-]+$/.test(id)) notFound();
  const order = await getOrderById(id);
  if (!order) notFound();

  const date = coerceToDate(order.createdAt) ?? new Date();

  return (
    <div className="packing-slip">
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          body { background: white; }
        }
        .packing-slip { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; max-width: 180mm; margin: 0 auto; padding: 24px; color: #1f2937; }
        .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1f2a37; padding-bottom: 12px; margin-bottom: 24px; }
        .order-number { font-size: 24px; font-weight: 600; font-family: ui-monospace, monospace; }
        .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { padding: 8px 4px; text-align: left; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
        th { font-weight: 500; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
        .qty { text-align: right; font-family: ui-monospace, monospace; }
        .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #6b7280; }
      `}</style>

      <div className="header">
        <div>
          <p className="label">Cryogene Laboratories</p>
          <p className="order-number">{order.orderNumber}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p className="label">Date</p>
          <p>{date.toLocaleDateString("en-GB")}</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
        <div>
          <p className="label">Ship to</p>
          <p style={{ fontWeight: 500 }}>{order.customer.name}</p>
          <p>{order.customer.address.line1}</p>
          {order.customer.address.line2 && <p>{order.customer.address.line2}</p>}
          <p>{order.customer.address.city}</p>
          <p>{order.customer.address.postcode}</p>
        </div>
        <div>
          <p className="label">Tracking</p>
          <p style={{ fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
            {order.fulfilment.trackingNumber ?? "—"}
          </p>
          <p className="label" style={{ marginTop: 12 }}>Service</p>
          <p>{order.fulfilment.carrier === "royalmail" ? "Royal Mail" : "—"}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>SKU</th>
            <th>Size</th>
            <th className="qty">Qty</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, i) => (
            <tr key={`${item.sku}-${i}`}>
              <td>{item.name}</td>
              <td style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }}>{item.sku}</td>
              <td>{item.size}</td>
              <td className="qty">{item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="footer">
        <p><strong>Research Use Only — Not for Human Consumption.</strong></p>
        <p>If anything is missing or damaged, contact us within 7 days at hello@cryogenelaboratories.co.uk.</p>
      </div>
    </div>
  );
}

export default function PackingSlipPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <PackingSlipContent params={params} />
    </Suspense>
  );
}
