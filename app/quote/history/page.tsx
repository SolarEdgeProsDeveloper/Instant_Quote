import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getUserQuotes,
  type SubmittedQuoteSummary,
} from "@/app/actions/quote";
import CartBadge from "../cart-badge";
import SignOutButton from "../signout-button";
import ProductSearch from "../product-search";
import QuoteHistoryList from "./quote-history-list";

export default async function HistoryPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/quote/history");

  let quotes: SubmittedQuoteSummary[] = [];
  let fetchError: string | null = null;
  try {
    quotes = await getUserQuotes();
  } catch (err) {
    fetchError =
      err instanceof Error ? err.message : "Couldn't load your quotes.";
    console.error("[/quote/history] getUserQuotes failed:", err);
  }

  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-6 py-4 sm:flex-nowrap sm:gap-4">
          <Link
            href="/quote"
            className="text-lg font-semibold tracking-tight text-slate-900"
          >
            Instant Quote
          </Link>
          <div className="order-3 w-full sm:order-2 sm:w-auto sm:flex-1">
            <ProductSearch />
          </div>
          <div className="order-2 ml-auto flex items-center gap-2 sm:order-3 sm:ml-0 sm:gap-4">
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

      <section className="mx-auto w-full max-w-4xl flex-1 px-6 py-10 pb-20">
        <Link
          href="/quote"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <span aria-hidden="true">←</span>
          Back to services
        </Link>

        <div className="mt-6 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
            History
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            My quotes
          </h1>
          <p className="mt-3 text-base text-slate-600">
            Every estimate you&apos;ve submitted. Tap one to review the
            details.
          </p>
        </div>

        {fetchError ? (
          <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {fetchError}
          </div>
        ) : (
          <QuoteHistoryList quotes={quotes} />
        )}
      </section>
    </main>
  );
}
