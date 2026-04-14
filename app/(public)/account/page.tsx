import { AuthGuard } from "@/components/storefront/account/AuthGuard";
import { AccountLayout } from "@/components/storefront/account/AccountLayout";

export default function AccountDashboardPage() {
  return (
    <AuthGuard>
      <AccountLayout>
        <h1 className="text-4xl mb-6">Your account</h1>
        <p className="text-[#6B7280] mb-8">
          Welcome back. View your order history, download COAs from past
          orders, or update your saved details.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-[#DDE1E7] p-6">
            <p className="label-editorial mb-2">Recent orders</p>
            <p className="text-sm text-[#6B7280]">
              Your order history will appear here once you&apos;ve placed your first order.
            </p>
          </div>
          <div className="bg-white border border-[#DDE1E7] p-6">
            <p className="label-editorial mb-2">Saved details</p>
            <p className="text-sm text-[#6B7280]">
              Update your default delivery address and research institution in
              Settings.
            </p>
          </div>
        </div>
      </AccountLayout>
    </AuthGuard>
  );
}

export const metadata = { title: "Your account" };
