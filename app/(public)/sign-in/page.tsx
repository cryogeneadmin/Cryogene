import { SignInForm } from "@/components/storefront/auth/SignInForm";

export default function SignInPage() {
  return (
    <div className="max-w-[1280px] mx-auto px-6 py-16">
      <p className="label-editorial mb-4 text-center">Sign in</p>
      <h1 className="text-4xl mb-10 text-center">Welcome back</h1>
      <SignInForm />
    </div>
  );
}

export const metadata = { title: "Sign in" };
