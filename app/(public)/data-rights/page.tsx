// app/(public)/data-rights/page.tsx
import { PublicDataRightsForm } from "./PublicDataRightsForm";

export const metadata = {
  title: "Your Data Rights — Cryogene Laboratories",
  description:
    "Request access to your data, correction, erasure, or to opt out of marketing.",
};

export default function DataRightsPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="font-serif text-4xl text-navy mb-3">Your data rights</h1>
      <p className="text-muted mb-8">
        Under UK GDPR you have the right to access your data, correct it,
        request erasure, or object to direct marketing. Submit a request
        below and we&apos;ll respond within 30 days. We&apos;ll send a
        verification email to confirm it&apos;s really you.
      </p>
      <PublicDataRightsForm />
    </div>
  );
}
