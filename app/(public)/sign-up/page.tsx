import { SignUpForm } from "@/components/storefront/auth/SignUpForm";

export default function SignUpPage() {
  return (
    <div className="max-w-[1280px] mx-auto px-6 py-16">
      <p className="label-editorial mb-4 text-center">Create an account</p>
      <h1 className="text-4xl mb-10 text-center">Save your details for next time</h1>
      <SignUpForm />
    </div>
  );
}

export const metadata = { title: "Create an account" };
