// app/(admin)/admin/layout.tsx
import { redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/admin-auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAdmin = await isAdminRequest();
  if (!isAdmin) {
    redirect("/sign-in?redirect=/admin");
  }

  return (
    <div className="flex min-h-screen bg-[#F7F8FA]">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}

export const metadata = { title: "Admin" };
