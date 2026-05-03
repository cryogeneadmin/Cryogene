// app/(public)/data-rights/PublicDataRightsForm.tsx
"use client";

import { useState, useTransition } from "react";

type RequestType = "access" | "rectification" | "erasure" | "objection";

const RIGHT_LABELS: Record<RequestType, string> = {
  access: "Send me a copy of my data",
  rectification: "Correct my data (link to settings if you have an account)",
  erasure: "Erase my account and personal data",
  objection: "Stop sending me marketing emails",
};

export function PublicDataRightsForm() {
  const [type, setType] = useState<RequestType>("access");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // Honeypot — if filled, bot. Drop silently.
    const honeypot = e.currentTarget.querySelector<HTMLInputElement>(
      'input[name="website"]'
    )?.value;
    if (honeypot) {
      setSubmitted(true);
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/data-rights/public", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ type, email, message }),
        });
        if (res.status === 429) {
          setError("Too many requests from your network. Please try again tomorrow.");
          return;
        }
        if (!res.ok) {
          setError("Could not submit your request. Please try again.");
          return;
        }
        setSubmitted(true);
      } catch {
        setError("Could not submit your request. Please try again.");
      }
    });
  }

  if (submitted) {
    return (
      <div className="bg-offwhite border border-border p-6">
        <h2 className="font-serif text-xl text-navy mb-2">Check your inbox</h2>
        <p className="text-sm text-muted">
          We&apos;ve sent a confirmation email to {email}. Click the link
          inside to verify your request — it expires in 24 hours. Once
          verified, we&apos;ll respond within 30 days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="label-editorial text-sm text-navy mb-2">
          What would you like us to do?
        </legend>
        {(Object.entries(RIGHT_LABELS) as [RequestType, string][]).map(([value, label]) => (
          <label key={value} className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="type"
              value={value}
              checked={type === value}
              onChange={() => setType(value)}
              className="mt-1 accent-navy"
              required
            />
            <span className="text-sm text-navy">{label}</span>
          </label>
        ))}
      </fieldset>

      <label className="block">
        <span className="label-editorial text-sm text-navy block mb-1">
          Your email
        </span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-border bg-white px-3 py-2"
          maxLength={320}
        />
      </label>

      <label className="block">
        <span className="label-editorial text-sm text-navy block mb-1">
          Anything else? (optional)
        </span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={1000}
          rows={4}
          className="w-full border border-border bg-white px-3 py-2"
        />
      </label>

      <input type="text" name="website" className="hidden" tabIndex={-1} aria-hidden="true" />

      {error && <p className="text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        className="px-6 py-3 bg-navy text-white uppercase tracking-wider text-xs hover:bg-mid-navy"
      >
        Submit request
      </button>
    </form>
  );
}
