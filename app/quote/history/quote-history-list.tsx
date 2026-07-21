"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { SubmittedQuoteSummary } from "@/app/actions/quote";
import { getStyleForService } from "@/lib/service-style";
import {
  formatQuoteNumber,
  matchesQuoteNumber,
} from "@/lib/quote-number";
import { PriceRange } from "../price-display";

export default function QuoteHistoryList({
  quotes,
}: {
  quotes: SubmittedQuoteSummary[];
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return quotes;
    return quotes.filter((quote) => matchesQuoteNumber(quote.quote_number, q));
  }, [quotes, search]);

  if (quotes.length === 0) {
    return (
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
    );
  }

  return (
    <>
      <div className="mt-6">
        <label
          htmlFor="quote-search"
          className="block text-xs font-medium uppercase tracking-widest text-slate-500"
        >
          Find a quote
        </label>
        <div className="relative mt-2">
          <input
            id="quote-search"
            type="search"
            inputMode="search"
            placeholder="Search by quote number (e.g. 42 or Q00042)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          >
            🔍
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {filtered.length} of {quotes.length}{" "}
          {quotes.length === 1 ? "quote" : "quotes"}
          {search.trim() && ` matching “${search.trim()}”`}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No quotes match that search.
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {filtered.map((q) => (
            <QuoteRow key={q.id} quote={q} />
          ))}
        </ul>
      )}
    </>
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
            <div className="flex flex-wrap items-baseline gap-2">
              <p className="font-mono text-sm font-semibold text-indigo-700">
                {formatQuoteNumber(quote.quote_number)}
              </p>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                {formatDate(quote.submitted_at)}
              </p>
            </div>
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
