import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getUserQuotes,
  type SubmittedQuoteSummary,
} from "@/app/actions/quote";
import { getStyleForService } from "@/lib/service-style";
import { PriceRange } from "../price-display";
import CartBadge from "../cart-badge";
import SignOutButton from "../signout-button";
import ProductSearch from "../product-search";

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
        ) : quotes.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-2xl">
              📭
            </div>
            <p className="mt-4 text-sm text-slate-600">
              You haven&apos;t submitted any quotes yet.
            </p>
            <Link
              href="/quote"
              className="mt-6 inline-block rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
            >
              Start a new estimate
            </Link>
          </div>
        ) : (
          <ul className="mt-8 space-y-4">
            {quotes.map((q) => (
              <QuoteRow key={q.id} quote={q} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function QuoteRow({ quote }: { quote: SubmittedQuoteSummary }) {
  const serviceNames = Array.from(
    new Set(quote.products.map((p) => p.service)),
  );

  return (
    <li>
      <Link
        href={`/quote/history/${quote.id}`}
        className="group block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              {formatDate(quote.submitted_at)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {serviceNames.map((name) => {
                const style = getStyleForService(name);
                return (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                  >
                    <span aria-hidden="true">{style.icon}</span>
                    {name}
                  </span>
                );
              })}
            </div>
            <p className="mt-3 text-sm text-slate-600">
              {quote.products.length}{" "}
              {quote.products.length === 1 ? "product" : "products"}
            </p>
          </div>
          <div className="text-right">
            <PriceRange
              min={quote.total_min}
              max={quote.total_max}
              size="card"
            />
          </div>
        </div>
      </Link>
    </li>
  );
}

function formatDate(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
