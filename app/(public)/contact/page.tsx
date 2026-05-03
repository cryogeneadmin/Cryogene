"use client";

import { useActionState } from "react";
import { submitContactForm, type ContactFormState } from "@/app/actions/contact";

const initialState: ContactFormState = { status: "idle" };

export default function ContactPage() {
  const [state, formAction, pending] = useActionState(submitContactForm, initialState);

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <p className="label-editorial mb-4">Contact</p>
      <h1 className="text-5xl mb-4 leading-tight">Get in touch</h1>
      <p className="text-lg text-muted mb-12">
        Questions about our products, COAs, shipping, or anything else — send
        us a message and we&apos;ll respond within one working day.
      </p>

      {state.status === "success" ? (
        <div className="bg-success-bg border border-success-text p-6">
          <p className="label-editorial text-success-text mb-2">Message received</p>
          <p className="text-sm text-success-text">
            Thanks for getting in touch. We&apos;ll reply to the email address you
            provided within one working day.
          </p>
        </div>
      ) : (
        <form action={formAction} className="space-y-6">
          {/* Honeypot — hidden from real users, traps spambots that fill every named field */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            className="absolute left-[-9999px] opacity-0 pointer-events-none"
            aria-hidden="true"
          />
          <div>
            <label htmlFor="name" className="label-editorial block mb-2">Name</label>
            <input id="name" name="name" type="text" required className="w-full border border-border p-3" />
            {state.errors?.name && <p className="text-xs text-red-700 mt-1">{state.errors.name}</p>}
          </div>
          <div>
            <label htmlFor="email" className="label-editorial block mb-2">Email</label>
            <input id="email" name="email" type="email" required className="w-full border border-border p-3" />
            {state.errors?.email && <p className="text-xs text-red-700 mt-1">{state.errors.email}</p>}
          </div>
          <div>
            <label htmlFor="subject" className="label-editorial block mb-2">Subject</label>
            <input id="subject" name="subject" type="text" required className="w-full border border-border p-3" />
            {state.errors?.subject && <p className="text-xs text-red-700 mt-1">{state.errors.subject}</p>}
          </div>
          <div>
            <label htmlFor="message" className="label-editorial block mb-2">Message</label>
            <textarea id="message" name="message" rows={6} required className="w-full border border-border p-3" />
            {state.errors?.message && <p className="text-xs text-red-700 mt-1">{state.errors.message}</p>}
          </div>
          {state.status === "error" && state.generalError && (
            <p className="text-sm text-red-700">{state.generalError}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="px-8 py-3 bg-navy text-white uppercase tracking-wider text-sm hover:bg-mid-navy disabled:bg-muted"
          >
            {pending ? "Sending..." : "Send message"}
          </button>
        </form>
      )}
    </div>
  );
}
