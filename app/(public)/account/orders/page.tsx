import Link from "next/link";
import { AuthGuard } from "@/components/storefront/account/AuthGuard";
import { AccountLayout } from "@/components/storefront/account/AccountLayout";

export default function OrderHistoryPage() {
  const orders: unknown[] = []; // Placeholder until Stage 1b wiring

  return (
    <AuthGuard>
      <AccountLayout>
        <h1 className="text-4xl mb-8">Order history</h1>
        {orders.length === 0 ? (
          <div className="border border-dashed border-border p-12 text-center">
            <p className="font-serif text-xl text-navy mb-2">No orders yet</p>
            <p className="text-sm text-muted mb-6">
              When you place your first order, it will appear here.
            </p>
            <Link href="/peptides" className="inline-block px-6 py-2 bg-navy text-white uppercase tracking-wider text-xs">
              Browse peptides
            </Link>
          </div>
        ) : (
          <div>{/* Rendered list in Stage 1b */}</div>
        )}
      </AccountLayout>
    </AuthGuard>
  );
}

export const metadata = { title: "Order history" };
