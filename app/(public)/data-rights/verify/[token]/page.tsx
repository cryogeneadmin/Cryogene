// app/(public)/data-rights/verify/[token]/page.tsx
import { Suspense } from "react";
import { connection } from "next/server";
import { verifyVerificationToken, markRequestVerified } from "@/lib/data-rights";

async function VerifyContent({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await connection();
  const { token } = await params;
  const decoded = await verifyVerificationToken(token);

  if (!decoded) {
    return (
      <div className="bg-compliance-amber-bg border border-compliance-amber-border p-6">
        <h2 className="font-serif text-xl text-compliance-amber-text mb-2">
          Link expired or invalid
        </h2>
        <p className="text-sm text-compliance-amber-text">
          Verification links expire 24 hours after they&apos;re sent. Please
          submit your request again at{" "}
          <a href="/data-rights" className="underline">
            cryogenelaboratories.co.uk/data-rights
          </a>
          .
        </p>
      </div>
    );
  }

  const result = await markRequestVerified(decoded.requestId, decoded.email);

  if (!result.ok) {
    return (
      <div className="bg-compliance-amber-bg border border-compliance-amber-border p-6">
        <h2 className="font-serif text-xl text-compliance-amber-text mb-2">
          Could not verify request
        </h2>
        <p className="text-sm text-compliance-amber-text">
          {result.reason === "already_verified_or_complete"
            ? "This request has already been verified, or has already been completed."
            : "The link did not match an active request. Please submit a new request if needed."}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-offwhite border border-border p-6">
      <h2 className="font-serif text-xl text-navy mb-2">Request verified</h2>
      <p className="text-sm text-muted">
        Thank you. Your request is now in our queue. We&apos;ll respond
        within 30 days at the email you provided.
      </p>
    </div>
  );
}

export default function VerifyPage(props: {
  params: Promise<{ token: string }>;
}) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="font-serif text-3xl text-navy mb-6">Verify your request</h1>
      <Suspense fallback={<p className="text-muted">Verifying…</p>}>
        <VerifyContent params={props.params} />
      </Suspense>
    </div>
  );
}
