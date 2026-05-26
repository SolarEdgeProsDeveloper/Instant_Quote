import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getQuoteById,
  type CartProduct,
  type FileMeta,
} from "@/app/actions/quote";
import {
  getQuestionsForService,
  type Question,
} from "@/lib/questions";
import { getStyleForService } from "@/lib/service-style";
import { PriceRange } from "../../price-display";
import CartBadge from "../../cart-badge";
import SignOutButton from "../../signout-button";
import FileAttachment from "./file-attachment";

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/quote/history/${id}`);

  const quote = await getQuoteById(id);
  if (!quote) notFound();

  // Group products by service
  const byService = new Map<string, CartProduct[]>();
  for (const p of quote.products) {
    const arr = byService.get(p.service) ?? [];
    arr.push(p);
    byService.set(p.service, arr);
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

      <section className="mx-auto w-full max-w-4xl flex-1 px-6 py-10 pb-20">
        <Link
          href="/quote/history"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <span aria-hidden="true">←</span>
          All quotes
        </Link>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
            Submitted {formatDate(quote.submitted_at)}
          </p>
          <div className="mt-3">
            <PriceRange
              min={quote.total_min}
              max={quote.total_max}
              size="hero"
            />
          </div>
        </div>

        <div className="mt-8 space-y-8">
          {Array.from(byService.entries()).map(([serviceName, products]) => {
            const style = getStyleForService(serviceName);
            const set = getQuestionsForService(serviceName);
            const slug = slugifyService(serviceName);

            return (
              <article
                key={serviceName}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div
                  className={`bg-gradient-to-br ${style.gradient} px-6 py-6 text-white sm:px-8`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-2xl backdrop-blur"
                      aria-hidden="true"
                    >
                      {style.icon}
                    </span>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-widest text-white/80">
                        Service
                      </p>
                      <h2 className="text-xl font-semibold sm:text-2xl">
                        {serviceName}
                      </h2>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-6 sm:px-8">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Products
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {products.map((p) => {
                      const q = qtyOfProduct(p);
                      const lineMin = (p.minPrice ?? 0) * q;
                      const lineMax =
                        p.maxPrice != null ? p.maxPrice * q : null;
                      const note = quote.notes[p.id];
                      return (
                        <li key={p.id}>
                          <div className="flex items-baseline justify-between gap-3 text-sm">
                            <span className="text-slate-800">
                              {p.name}
                              {q > 1 && (
                                <span className="ml-1.5 text-xs text-slate-400">
                                  × {q}
                                </span>
                              )}
                            </span>
                            <span className="shrink-0 text-xs">
                              <span className="text-rose-600 font-semibold">
                                {formatPrice(lineMin)}
                              </span>
                              {lineMax != null && (
                                <>
                                  <span className="mx-1.5 text-slate-300">–</span>
                                  <span className="text-slate-400 line-through">
                                    {formatPrice(lineMax)}
                                  </span>
                                </>
                              )}
                            </span>
                          </div>
                          {note && (
                            <div className="mt-1 ml-4 flex items-start gap-2 rounded-md bg-amber-50 px-2 py-1.5 text-xs italic text-amber-900">
                              <span aria-hidden="true" className="not-italic text-amber-700">
                                ✎
                              </span>
                              <span className="min-w-0 flex-1">{note}</span>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  {set && (
                    <>
                      <h3 className="mt-8 text-xs font-semibold uppercase tracking-widest text-slate-500">
                        Your answers
                      </h3>
                      <dl className="mt-3 space-y-5">
                        {set.sections.flatMap((section) =>
                          section.questions.map((q) => {
                            const value = quote.answers[`${slug}.${q.id}`];
                            if (!isAnswered(value)) return null;
                            return (
                              <div key={q.id}>
                                <dt className="text-sm font-medium text-slate-700">
                                  {q.label}
                                </dt>
                                <dd className="mt-1 text-sm text-slate-600">
                                  <AnswerDisplay
                                    question={q}
                                    value={value}
                                  />
                                </dd>
                              </div>
                            );
                          }),
                        )}
                      </dl>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/quote"
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200 hover:bg-indigo-500"
          >
            Start a new estimate
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </main>
  );
}

function AnswerDisplay({
  question,
  value,
}: {
  question: Question;
  value: unknown;
}) {
  if (question.type === "file") {
    const files = (Array.isArray(value) ? value : []) as FileMeta[];
    if (files.length === 0) return <span className="italic text-slate-400">—</span>;
    return (
      <ul className="space-y-1.5">
        {files.map((f) => (
          <FileAttachment key={f.path} file={f} />
        ))}
      </ul>
    );
  }

  if (question.type === "multi-choice" && Array.isArray(value)) {
    return <span>{(value as string[]).join(", ")}</span>;
  }

  if (question.type === "boolean") {
    return <span>{value ? "Yes" : "No"}</span>;
  }

  return <span className="whitespace-pre-wrap">{String(value)}</span>;
}

function isAnswered(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0;
  return false;
}

function slugifyService(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatDate(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

function qtyOfProduct(p: { quantity?: number }): number {
  const q = p.quantity ?? 1;
  return Number.isFinite(q) && q > 0 ? Math.floor(q) : 1;
}

function formatPrice(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

