"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveDeliveryStep, type DeliveryFormState } from "@/app/actions/checkout";

const initialState: DeliveryFormState = { status: "idle" };

export function DeliveryForm({
  initialData,
}: {
  initialData?: {
    fullName?: string;
    email?: string;
    phone?: string | null;
    line1?: string;
    line2?: string | null;
    city?: string;
    postcode?: string;
    researchInstitution?: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(saveDeliveryStep, initialState);
  const [createAccount, setCreateAccount] = useState(false);

  const fieldError = (name: string) => state.errors?.[name];

  return (
    <form action={formAction} className="space-y-6 max-w-xl">
      <div>
        <label htmlFor="fullName" className="label-editorial block mb-2">Full name</label>
        <input id="fullName" name="fullName" type="text" defaultValue={initialData?.fullName} required aria-invalid={!!fieldError("fullName")} aria-describedby={fieldError("fullName") ? "fullName-error" : undefined} className="w-full border border-border p-3" />
        {fieldError("fullName") && <p id="fullName-error" className="text-xs text-red-700 mt-1">{fieldError("fullName")}</p>}
      </div>
      <div>
        <label htmlFor="email" className="label-editorial block mb-2">Email</label>
        <input id="email" name="email" type="email" defaultValue={initialData?.email} required aria-invalid={!!fieldError("email")} aria-describedby={fieldError("email") ? "email-error" : undefined} className="w-full border border-border p-3" />
        {fieldError("email") && <p id="email-error" className="text-xs text-red-700 mt-1">{fieldError("email")}</p>}
      </div>
      <div>
        <label htmlFor="phone" className="label-editorial block mb-2">Phone (optional)</label>
        <input id="phone" name="phone" type="tel" defaultValue={initialData?.phone ?? ""} className="w-full border border-border p-3" />
      </div>
      <div>
        <label htmlFor="line1" className="label-editorial block mb-2">Address line 1</label>
        <input id="line1" name="line1" type="text" defaultValue={initialData?.line1} required aria-invalid={!!fieldError("line1")} aria-describedby={fieldError("line1") ? "line1-error" : undefined} className="w-full border border-border p-3" />
        {fieldError("line1") && <p id="line1-error" className="text-xs text-red-700 mt-1">{fieldError("line1")}</p>}
      </div>
      <div>
        <label htmlFor="line2" className="label-editorial block mb-2">Address line 2 (optional)</label>
        <input id="line2" name="line2" type="text" defaultValue={initialData?.line2 ?? ""} className="w-full border border-border p-3" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="city" className="label-editorial block mb-2">Town / City</label>
          <input id="city" name="city" type="text" defaultValue={initialData?.city} required aria-invalid={!!fieldError("city")} aria-describedby={fieldError("city") ? "city-error" : undefined} className="w-full border border-border p-3" />
          {fieldError("city") && <p id="city-error" className="text-xs text-red-700 mt-1">{fieldError("city")}</p>}
        </div>
        <div>
          <label htmlFor="postcode" className="label-editorial block mb-2">Postcode</label>
          <input id="postcode" name="postcode" type="text" defaultValue={initialData?.postcode} required aria-invalid={!!fieldError("postcode")} aria-describedby={fieldError("postcode") ? "postcode-error" : undefined} className="w-full border border-border p-3" />
          {fieldError("postcode") && <p id="postcode-error" className="text-xs text-red-700 mt-1">{fieldError("postcode")}</p>}
        </div>
      </div>
      <div>
        <label htmlFor="researchInstitution" className="label-editorial block mb-2">Research institution (optional)</label>
        <input id="researchInstitution" name="researchInstitution" type="text" defaultValue={initialData?.researchInstitution ?? ""} className="w-full border border-border p-3" />
        <p className="text-xs text-muted mt-1">If you&apos;re purchasing on behalf of a research institution, we&apos;d love to know.</p>
      </div>

      <div className="bg-offwhite border border-border p-5 space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="createAccount"
            checked={createAccount}
            onChange={(e) => setCreateAccount(e.target.checked)}
            className="accent-navy mt-0.5"
          />
          <div>
            <p className="font-serif text-base text-navy">Save your details for next time</p>
            <p className="text-xs text-muted mt-1">
              Create an account and next time you order, your address and
              details will be pre-filled. You&apos;ll also be able to view your order
              history, download past COAs, and re-order in one click.
            </p>
          </div>
        </label>
        {createAccount && (
          <div>
            <label htmlFor="accountPassword" className="label-editorial block mb-2">Password (min 8 characters)</label>
            {/* Password lives only in form state for this page lifetime.
                It is passed directly to the server action which creates the
                Firebase Auth user immediately — it never persists to cookie,
                session, or any server-side store. */}
            <input id="accountPassword" name="accountPassword" type="password" minLength={8} aria-invalid={!!fieldError("accountPassword")} aria-describedby={fieldError("accountPassword") ? "accountPassword-error" : undefined} className="w-full border border-border p-3" />
            {fieldError("accountPassword") && <p id="accountPassword-error" className="text-xs text-red-700 mt-1">{fieldError("accountPassword")}</p>}
          </div>
        )}
        {/* Account-creation error: email already exists */}
        {state.accountError && state.accountError.includes("already exists") && (
          <p role="alert" className="text-xs text-red-700">
            An account with that email already exists.{" "}
            <Link href="/sign-in?redirect=/checkout/delivery" className="underline">
              Sign in
            </Link>{" "}
            or use a different email.
          </p>
        )}
        {/* Account-creation error: service unavailable or other */}
        {state.accountError && !state.accountError.includes("already exists") && (
          <p role="alert" className="text-xs text-red-700">{state.accountError}</p>
        )}
      </div>

      <button type="submit" disabled={pending} className="px-8 py-3 bg-navy text-white uppercase tracking-wider text-sm hover:bg-mid-navy disabled:bg-muted">
        {pending ? "Saving..." : "Continue to review"}
      </button>
    </form>
  );
}
