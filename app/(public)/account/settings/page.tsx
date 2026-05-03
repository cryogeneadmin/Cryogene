import { AuthGuard } from "@/components/storefront/account/AuthGuard";
import { AccountLayout } from "@/components/storefront/account/AccountLayout";

export default function AccountSettingsPage() {
  return (
    <AuthGuard>
      <AccountLayout>
        <h1 className="text-4xl mb-8">Account settings</h1>
        <p className="text-muted">
          Editable default address, research institution, and email
          preferences will be wired to Firebase Auth user doc in Stage 1b.
        </p>
      </AccountLayout>
    </AuthGuard>
  );
}

export const metadata = { title: "Account settings" };
