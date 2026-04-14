// app/actions/contact.ts
"use server";

import { z } from "zod";
import { createEnquiry } from "@/lib/enquiries";

const ContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  subject: z.string().min(1),
  message: z.string().min(10),
});

export type ContactFormState = {
  status: "idle" | "success" | "error";
  errors?: Partial<Record<"name" | "email" | "subject" | "message", string>>;
  generalError?: string;
};

export async function submitContactForm(
  _prev: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const parsed = ContactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    const errors: ContactFormState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof NonNullable<ContactFormState["errors"]>;
      if (field) errors[field] = issue.message;
    }
    return { status: "error", errors };
  }

  try {
    await createEnquiry(parsed.data);
    // TODO Stage 1b: send Resend confirmation email to customer
    // TODO Stage 1b: send Resend notification email to Sam
    return { status: "success" };
  } catch (err) {
    return {
      status: "error",
      generalError: err instanceof Error ? err.message : "Failed to submit enquiry",
    };
  }
}
