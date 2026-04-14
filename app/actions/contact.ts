"use server";

import { z } from "zod";

const ContactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export type ContactFormState = {
  status: "idle" | "success" | "error";
  errors?: Partial<Record<"name" | "email" | "subject" | "message", string>>;
  generalError?: string;
};

export async function submitContactForm(
  _prevState: ContactFormState,
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

  // TODO in Plan 3: write to Firestore enquiries collection via Admin SDK
  // TODO in Plan 3: send Resend confirmation email to customer
  // TODO in Plan 3: send Resend notification email to Sam
  console.log("[Contact form submission]", parsed.data);
  return { status: "success" };
}
