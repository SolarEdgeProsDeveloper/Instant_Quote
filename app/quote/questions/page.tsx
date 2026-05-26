import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import CartBadge from "../cart-badge";
import SignOutButton from "../signout-button";
import QuestionsForm from "./questions-form";

export default async function QuestionsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/quote/questions");
  }

  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link
            href="/quote"
            className="text-lg font-semibold tracking-tight text-slate-900"
          >
            Instant Quote
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/quote/history"
              className="hidden text-sm font-medium text-indigo-600 hover:text-indigo-500 sm:block"
            >
              My quotes
            </Link>
            <CartBadge />
            <p className="hidden text-sm text-slate-600 sm:block">
              {user.email}
            </p>
            <SignOutButton />
          </div>
        </div>
      </header>

      <QuestionsForm />
    </main>
  );
}
