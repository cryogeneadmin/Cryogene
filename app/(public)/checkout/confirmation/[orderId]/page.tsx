import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getOrderById } from "@/lib/orders";
import { getCustomerSession } from "@/lib/customer-auth";
import { confirmationCookieName } from "@/lib/auth-cookies";
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

  const cookieStore = await cookies();
  const confirmationCookie = cookieStore.get(confirmationCookieName(orderId));
  const session = await getCustomerSession();

  const order = await getOrderById(orderId);
  if (!order) notFound();

  const ownerOrAdmin =
    !!session &&
    (session.uid === order.customer.uid || session.admin);

  if (!confirmationCookie && !ownerOrAdmin) {
    notFound();
  }

  const config = await getConfig();

  return (
    <ConfirmationContent
      order={order}
      config={config}
      isStub={stub === "true"}
    />
  );
}
