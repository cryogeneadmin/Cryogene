import { notFound } from "next/navigation";
import { getOrderById } from "@/lib/orders";
import { ConfirmationContent } from "@/components/storefront/checkout/ConfirmationContent";
import { getConfig } from "@/lib/config";

export default async function ConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ stub?: string }>;
}) {
  const { orderId } = await params;
  const { stub } = await searchParams;
  const order = await getOrderById(orderId);
  if (!order) notFound();
  const config = await getConfig();

  return (
    <ConfirmationContent
      order={order}
      config={config}
      isStub={stub === "true"}
    />
  );
}
