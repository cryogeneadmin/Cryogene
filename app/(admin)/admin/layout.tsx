// app/(admin)/admin/layout.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

async function AdminAuthGate({ children }: { children: React.ReactNode }) {
  // connection() ensures this subtree (including page children) only
  // executes at request time — never during static prerender.
  await connection();
  const isAdmin = await isAdminRequest();
  if (!isAdmin) {
    redirect("/sign-in?redirect=/admin");
  }
  return <>{children}</>;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-offwhite">
      <Suspense>
        <AdminSidebar />
      </Suspense>
      <main className="flex-1 p-8 overflow-auto">
        <Suspense>
          <AdminAuthGate>{children}</AdminAuthGate>
        </Suspense>
      </main>
    </div>
  );
}

export const metadata: Metadata = { title: "Admin" };
