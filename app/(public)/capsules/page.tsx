import { notFound } from "next/navigation";

// The capsules category has been removed from the product catalogue.
// This route is kept as a placeholder — all requests 404.

export const metadata = {
  title: "Page Not Found",
};

export default function CapsulesPage() {
  notFound();
}
