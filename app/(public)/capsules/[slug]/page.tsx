import { notFound } from "next/navigation";

// The capsules category has been removed from the product catalogue.
// This route is kept as a placeholder — all requests 404.

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata() {
  return {};
}

export default async function CapsuleDetailPage() {
  notFound();
}
