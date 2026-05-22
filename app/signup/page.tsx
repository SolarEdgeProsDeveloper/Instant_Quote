import { Suspense } from "react";
import SignupForm from "./signup-form";

export default function SignupPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <Suspense>
        <SignupForm />
      </Suspense>
    </main>
  );
}
