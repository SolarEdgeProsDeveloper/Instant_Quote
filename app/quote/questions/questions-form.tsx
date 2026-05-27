"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getQuestionsForService,
  type Question,
  type QuestionSet,
} from "@/lib/questions";
import { getStyleForKey } from "@/lib/service-style";
import {
  saveDraftAnswers,
  submitQuote,
  updateQuoteNotes,
  type Fulfillment,
  type ProductNotes,
} from "@/app/actions/quote";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const STORAGE_KEY = "instant-quote:estimate:v4";
const ANSWERS_KEY = "instant-quote:answers:v1";
const FULFILLMENT_KEY = "instant-quote:fulfillment:v1";

const PAYMENT_OPTIONS = [
  {
    id: "pay-now",
    icon: "💳",
    title: "Credit / Debit card",
    description: "Pay the full amount now, processed instantly.",
  },
  {
    id: "financing",
    icon: "📅",
    title: "Financing",
    description: "0–12 months, low or no interest.",
  },
  {
    id: "cash",
    icon: "💵",
    title: "Cash",
    description: "Pay in person on install day.",
  },
  {
    id: "loan",
    icon: "🏦",
    title: "Loan",
    description: "Apply through our lending partners.",
  },
];

type EstimateItem = {
  id: string;
  name: string;
  service: string;
  minPrice: number | null;
  maxPrice: number | null;
  imageUrl?: string | null;
  quantity?: number;
};

function qtyOf(item: EstimateItem): number {
  const q = item.quantity ?? 1;
  return Number.isFinite(q) && q > 0 ? Math.floor(q) : 1;
}

type FileMeta = { path: string; name: string; size: number };
type AnswerValue = string | number | boolean | string[] | FileMeta[] | null;
type Answers = Record<string, AnswerValue>;

type ServiceGroup = {
  slug: string;
  name: string;
  products: EstimateItem[];
  set: QuestionSet | null;
  min: number;
  max: number;
};

function slugifyService(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatPrice(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "$0";
  if (Number.isInteger(n)) return `$${n.toLocaleString("en-US")}`;
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function isAnswered(q: Question, v: AnswerValue): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "number") return Number.isFinite(v);
  if (typeof v === "boolean") return true;
  if (Array.isArray(v)) return v.length > 0;
  return false;
}

function countAnswered(
  serviceSlug: string,
  set: QuestionSet | null,
  answers: Answers,
): { answered: number; total: number } {
  if (!set) return { answered: 0, total: 0 };
  let answered = 0;
  let total = 0;
  for (const section of set.sections) {
    for (const q of section.questions) {
      total += 1;
      if (isAnswered(q, answers[`${serviceSlug}.${q.id}`] ?? null))
        answered += 1;
    }
  }
  return { answered, total };
}

export default function QuestionsForm() {
  const [hydrated, setHydrated] = useState(false);
  const [items, setItems] = useState<EstimateItem[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitId, setSubmitId] = useState<string | null>(null);
  const [notes, setNotes] = useState<ProductNotes>({});
  const [showPayOptions, setShowPayOptions] = useState(false);
  const [fulfillment, setFulfillment] = useState<Fulfillment | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as EstimateItem[]);
      const rawAnswers = window.localStorage.getItem(ANSWERS_KEY);
      if (rawAnswers) setAnswers(JSON.parse(rawAnswers) as Answers);
      const rawFulfillment = window.localStorage.getItem(FULFILLMENT_KEY);
      if (rawFulfillment === "delivery" || rawFulfillment === "install") {
        setFulfillment(rawFulfillment);
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  // Persist answers to localStorage + debounce-save to DB
  const dbAnswersSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(ANSWERS_KEY, JSON.stringify(answers));
    } catch {
      // ignore
    }

    if (dbAnswersSaveRef.current) clearTimeout(dbAnswersSaveRef.current);
    dbAnswersSaveRef.current = setTimeout(() => {
      saveDraftAnswers(answers).catch((err) => {
        console.warn("[draft] save answers failed:", err);
      });
    }, 1500);

    return () => {
      if (dbAnswersSaveRef.current) clearTimeout(dbAnswersSaveRef.current);
    };
  }, [answers, hydrated]);

  const grouped: ServiceGroup[] = useMemo(() => {
    const map = new Map<string, EstimateItem[]>();
    for (const item of items) {
      const arr = map.get(item.service) ?? [];
      arr.push(item);
      map.set(item.service, arr);
    }
    return Array.from(map.entries()).map(([service, products]) => ({
      slug: slugifyService(service),
      name: service,
      products,
      set: getQuestionsForService(service),
      min: products.reduce((s, p) => s + (p.minPrice ?? 0) * qtyOf(p), 0),
      max: products.reduce((s, p) => s + (p.maxPrice ?? 0) * qtyOf(p), 0),
    }));
  }, [items]);

  const totals = useMemo(() => {
    const min = items.reduce((s, i) => s + (i.minPrice ?? 0) * qtyOf(i), 0);
    const max = items.reduce((s, i) => s + (i.maxPrice ?? 0) * qtyOf(i), 0);
    return { count: items.length, min, max };
  }, [items]);

  const { totalAnswered, totalQuestions } = useMemo(() => {
    let answered = 0;
    let total = 0;
    for (const g of grouped) {
      if (!g.set) continue;
      for (const sec of g.set.sections) {
        for (const q of sec.questions) {
          total += 1;
          if (isAnswered(q, answers[`${g.slug}.${q.id}`] ?? null))
            answered += 1;
        }
      }
    }
    return { totalAnswered: answered, totalQuestions: total };
  }, [grouped, answers]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function setAnswer(key: string, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  async function saveNote(productId: string, text: string) {
    const trimmed = text.trim();
    const nextNotes: ProductNotes = { ...notes };
    if (trimmed) nextNotes[productId] = trimmed;
    else delete nextNotes[productId];
    setNotes(nextNotes);
    if (submitId) {
      try {
        await updateQuoteNotes(submitId, nextNotes);
      } catch (err) {
        console.warn("[notes] save failed:", err);
      }
    }
  }

  async function runSubmit(answersToSend: Answers) {
    setSubmitError(null);
    setSubmitting(true);
    try {
      if (dbAnswersSaveRef.current) clearTimeout(dbAnswersSaveRef.current);

      const { id } = await submitQuote({
        products: items,
        answers: answersToSend,
        fulfillment,
      });

      try {
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem(ANSWERS_KEY);
        window.localStorage.removeItem(FULFILLMENT_KEY);
      } catch {
        // ignore
      }
      window.dispatchEvent(new Event("estimate-change"));

      setSubmitId(id);
      setSubmitted(true);
      // Force the browser to recalc layout + scroll to top AFTER React has
      // unmounted the (tall) questions form and rendered the (shorter) invoice.
      // Smooth scroll fights with the DOM mutation; instant scroll after a
      // RAF is reliable across browsers + viewport widths.
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
      });
    } catch (err) {
      console.error("[submit] failed:", err);
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Couldn't submit your estimate. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runSubmit(answers);
  }

  // Auto-submit when fulfillment === "delivery" — products being shipped
  // don't need a questionnaire, just confirm and produce the invoice.
  // "install" still goes through the questions form so we can collect site
  // details.
  const autoSubmittedRef = useRef(false);
  useEffect(() => {
    if (!hydrated) return;
    if (autoSubmittedRef.current) return;
    if (submitted) return;
    if (fulfillment !== "delivery") return;
    if (items.length === 0) return;
    autoSubmittedRef.current = true;
    void runSubmit({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, fulfillment, items.length, submitted]);

  if (!hydrated) {
    return (
      <section className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-2xl">
            🛒
          </div>
          <p className="mt-4 text-sm text-slate-600">
            You haven&apos;t added any products to your estimate yet.
          </p>
          <Link
            href="/quote"
            className="mt-6 inline-block rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
          >
            Browse services
          </Link>
        </div>
      </section>
    );
  }

  // "Purchase & deliver" skips questions — show a loading card while
  // auto-submit is in flight (otherwise the user briefly sees the questions
  // form).
  if (fulfillment === "delivery" && !submitted) {
    return (
      <section className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
          <p className="mt-4 text-sm font-medium text-slate-700">
            Generating your estimate…
          </p>
          {submitError && (
            <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {submitError}
            </p>
          )}
        </div>
      </section>
    );
  }

  if (submitted) {
    const shortId = (submitId ?? "").replace(/-/g, "").slice(0, 8).toUpperCase();

    return (
      <section
        ref={(el) => {
          // Belt-and-suspenders: even if window.scrollTo failed (smooth-scroll
          // race in prod, custom scroll-snap, etc.), scrollIntoView on the
          // actual element guarantees it ends up in view.
          el?.scrollIntoView({ behavior: "instant" as ScrollBehavior, block: "start" });
        }}
        className="mx-auto w-full max-w-3xl flex-1 px-6 py-12"
      >
        {/* Confirmation banner */}
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
            ✓
          </div>
          <div>
            <p className="font-semibold text-emerald-900">
              Your estimate is ready.
            </p>
            <p className="text-sm text-emerald-800">
              Add a note to any item if you have questions about it.
            </p>
          </div>
        </div>

        {/* Invoice */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Header */}
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-lg font-bold tracking-tight text-slate-900">
                  Instant Quote
                </p>
              </div>
              {shortId && (
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                    Estimate no.
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-semibold text-slate-900">
                    #{shortId}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Line items */}
          <div className="px-6 py-5">
            <div className="grid grid-cols-[minmax(0,1fr)_3rem_6.5rem] gap-x-4 border-b border-slate-300 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              <span>Item</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Amount</span>
            </div>

            <div className="mt-3 space-y-4">
              {grouped.map((g) => (
                <div key={g.slug}>
                  <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-700">
                    <span aria-hidden="true">
                      {getStyleForKey(g.set?.key).icon}
                    </span>
                    {g.name}
                  </div>
                  <ul className="mt-1.5 space-y-2">
                    {g.products.map((p) => {
                      const q = qtyOf(p);
                      const lineTotal = (p.minPrice ?? 0) * q;
                      return (
                        <li key={p.id}>
                          <div className="grid grid-cols-[minmax(0,1fr)_3rem_6.5rem] items-baseline gap-x-4 text-sm">
                            <span className="text-slate-800">{p.name}</span>
                            <span className="text-right tabular-nums text-slate-600">
                              {q}
                            </span>
                            <span className="text-right tabular-nums font-medium text-slate-900">
                              {formatPrice(lineTotal)}
                            </span>
                          </div>
                          <NoteRow
                            productId={p.id}
                            note={notes[p.id]}
                            onSave={(text) => saveNote(p.id, text)}
                            onDelete={() => saveNote(p.id, "")}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="border-t-2 border-slate-900 px-6 py-4">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-900">
                Total
              </p>
              <p className="text-right text-2xl font-bold tabular-nums text-slate-900">
                {formatPrice(totals.min)}
              </p>
            </div>
          </div>
        </div>

        {/* Pay now / payment options */}
        <div className="mt-6">
          {!showPayOptions ? (
            <button
              type="button"
              onClick={() => setShowPayOptions(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-500 sm:w-auto"
            >
              Pay now
              <span aria-hidden="true">→</span>
            </button>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-700">
                  How would you like to pay?
                </p>
                <button
                  type="button"
                  onClick={() => setShowPayOptions(false)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-900"
                >
                  Cancel
                </button>
              </div>
              <ul className="mt-3 space-y-2">
                {PAYMENT_OPTIONS.map((opt) => (
                  <li key={opt.id}>
                    <button
                      type="button"
                      onClick={() => alert(`${opt.title}: coming soon.`)}
                      className="group flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40"
                    >
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl"
                        aria-hidden="true"
                      >
                        {opt.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {opt.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-600">
                          {opt.description}
                        </p>
                      </div>
                      <span
                        aria-hidden="true"
                        className="shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5"
                      >
                        →
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50">
      <ServiceNav grouped={grouped} answers={answers} />

      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 pb-32 sm:px-6">
        <Link
          href="/quote/cart"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <span aria-hidden="true">←</span>
          Back to cart
        </Link>
        <div className="mt-6 mb-10 overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-rose-700">
            <span aria-hidden="true">✦</span>
            Almost done
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Let&apos;s get you the{" "}
            <span className="bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 bg-clip-text text-transparent">
              exact price
            </span>
            .
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            What you&apos;ve seen so far is just an{" "}
            <span className="font-semibold text-slate-800">initial range</span>
            . Take a few minutes to tell us about your home and we&apos;ll
            turn it into your{" "}
            <span className="font-semibold text-slate-800">
              real, accurate quote
            </span>{" "}
            — no phone tag, no pressure.
          </p>
        </div>

        <div className="space-y-8">
          {grouped.map((group) => (
            <ServiceCard
              key={group.slug}
              group={group}
              answers={answers}
              onAnswer={setAnswer}
            />
          ))}
        </div>

        {submitError && (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm font-semibold text-rose-900">
              We couldn&apos;t submit your estimate.
            </p>
            <p className="mt-1 text-xs text-rose-700">{submitError}</p>
            <p className="mt-2 text-xs text-rose-600">
              Try again. If it keeps happening, take a screenshot of this
              message and share it with us.
            </p>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <span className="text-sm text-slate-500">
            {totalAnswered} of {totalQuestions} answered
          </span>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit for estimate"}
          </button>
        </div>
        {submitError && (
          <div className="border-t border-rose-100 bg-rose-50 px-4 py-2 sm:px-6">
            <p className="mx-auto max-w-5xl text-sm text-rose-700">
              {submitError}
            </p>
          </div>
        )}
        {totalQuestions > 0 && (
          <div className="h-1 w-full bg-slate-100">
            <div
              className="h-full bg-indigo-500 transition-all"
              style={{
                width: `${(totalAnswered / totalQuestions) * 100}%`,
              }}
            />
          </div>
        )}
      </div>
    </form>
  );
}

function ServiceNav({
  grouped,
  answers,
}: {
  grouped: ServiceGroup[];
  answers: Answers;
}) {
  return (
    <nav className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-5xl overflow-x-auto px-4 sm:px-6">
        <div className="flex gap-2 py-3">
          {grouped.map((g) => {
            const style = getStyleForKey(g.set?.key);
            const { answered, total } = countAnswered(g.slug, g.set, answers);
            return (
              <a
                key={g.slug}
                href={`#service-${g.slug}`}
                className="group flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <span aria-hidden="true">{style.icon}</span>
                <span>{g.name}</span>
                {total > 0 && (
                  <span
                    className={`ml-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      answered === total
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {answered}/{total}
                  </span>
                )}
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

function ServiceCard({
  group,
  answers,
  onAnswer,
}: {
  group: ServiceGroup;
  answers: Answers;
  onAnswer: (key: string, value: AnswerValue) => void;
}) {
  const style = getStyleForKey(group.set?.key);
  const { answered, total } = countAnswered(group.slug, group.set, answers);

  return (
    <article
      id={`service-${group.slug}`}
      className="scroll-mt-20 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div
        className={`relative bg-gradient-to-br ${style.gradient} px-6 py-6 text-white sm:px-8 sm:py-7`}
      >
        <div className="flex items-center justify-between gap-4">
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
                {group.name}
              </h2>
            </div>
          </div>
          {total > 0 && (
            <span className="shrink-0 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              {answered}/{total} answered
            </span>
          )}
        </div>

        <ul className="mt-5 flex flex-wrap gap-2">
          {group.products.map((p) => (
            <li
              key={p.id}
              className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur"
            >
              {p.name}
            </li>
          ))}
        </ul>
      </div>

      <div className="px-6 py-8 sm:px-8">
        {group.set ? (
          <div className="space-y-10">
            {group.set.sections.map((section, sIdx) => (
              <div key={sIdx}>
                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    {section.title}
                  </h3>
                  <span className="h-px flex-1 bg-slate-200" />
                </div>
                <div className="mt-5 space-y-6">
                  {section.questions.map((q) => {
                    const fieldKey = `${group.slug}.${q.id}`;
                    return (
                      <QuestionField
                        key={q.id}
                        fieldKey={fieldKey}
                        question={q}
                        value={answers[fieldKey] ?? null}
                        onChange={(v) => onAnswer(fieldKey, v)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
            {group.set.outcomeNote && (
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs italic text-slate-500">
                {group.set.outcomeNote}
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            No question set matched this service yet. We&apos;ll follow up with
            you directly.
          </div>
        )}
      </div>
    </article>
  );
}

function QuestionField({
  fieldKey,
  question,
  value,
  onChange,
}: {
  fieldKey: string;
  question: Question;
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
}) {
  const inputBase =
    "block w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100";

  return (
    <div>
      <label className="block text-sm font-medium text-slate-800">
        {question.label}
        {question.required && <span className="ml-1 text-rose-500">*</span>}
      </label>
      {question.helpText && (
        <p className="mt-1 text-xs text-slate-500">{question.helpText}</p>
      )}

      <div className="mt-3">
        {question.type === "text" && (
          <input
            type="text"
            required={question.required}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className={inputBase}
          />
        )}

        {question.type === "textarea" && (
          <textarea
            required={question.required}
            rows={3}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className={inputBase}
          />
        )}

        {question.type === "number" && (
          <input
            type="number"
            required={question.required}
            value={value === null || value === undefined ? "" : String(value)}
            onChange={(e) =>
              onChange(e.target.value === "" ? null : Number(e.target.value))
            }
            className={inputBase}
          />
        )}

        {question.type === "single-choice" && question.options && (
          <div className="flex flex-wrap gap-2">
            {question.options.map((opt) => (
              <label key={opt} className="cursor-pointer">
                <input
                  type="radio"
                  name={fieldKey}
                  className="peer sr-only"
                  checked={value === opt}
                  onChange={() => onChange(opt)}
                />
                <span className="block rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 peer-checked:border-indigo-500 peer-checked:bg-indigo-50 peer-checked:text-indigo-700 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-200">
                  {opt}
                </span>
              </label>
            ))}
          </div>
        )}

        {question.type === "multi-choice" && question.options && (
          <div className="flex flex-wrap gap-2">
            {question.options.map((opt) => {
              const arr = Array.isArray(value) ? (value as string[]) : [];
              const checked = arr.includes(opt);
              return (
                <label key={opt} className="cursor-pointer">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={checked}
                    onChange={() => {
                      if (checked) onChange(arr.filter((x) => x !== opt));
                      else onChange([...arr, opt]);
                    }}
                  />
                  <span className="block rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 peer-checked:border-indigo-500 peer-checked:bg-indigo-50 peer-checked:text-indigo-700">
                    {checked && <span className="mr-1">✓</span>}
                    {opt}
                  </span>
                </label>
              );
            })}
          </div>
        )}

        {question.type === "boolean" && (
          <div className="grid max-w-xs grid-cols-2 gap-2">
            {[
              { label: "Yes", val: true },
              { label: "No", val: false },
            ].map((opt) => (
              <label key={opt.label} className="cursor-pointer">
                <input
                  type="radio"
                  name={fieldKey}
                  className="peer sr-only"
                  checked={value === opt.val}
                  onChange={() => onChange(opt.val)}
                />
                <span className="block rounded-lg border border-slate-200 bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 peer-checked:border-indigo-500 peer-checked:bg-indigo-50 peer-checked:text-indigo-700">
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
        )}

        {question.type === "file" && (
          <FileDropzone
            fieldKey={fieldKey}
            value={Array.isArray(value) ? (value as FileMeta[]) : []}
            onChange={(files) => onChange(files)}
          />
        )}
      </div>
    </div>
  );
}

function NoteRow({
  note,
  onSave,
  onDelete,
}: {
  productId: string;
  note: string | undefined;
  onSave: (text: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note ?? "");

  // Keep draft in sync if note prop changes externally
  useEffect(() => {
    setDraft(note ?? "");
  }, [note]);

  function startEdit() {
    setDraft(note ?? "");
    setEditing(true);
  }

  function commit() {
    onSave(draft);
    setEditing(false);
  }

  function cancel() {
    setDraft(note ?? "");
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="mt-1 ml-4 rounded-md bg-amber-50/60 p-2">
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          placeholder="Question or comment about this item…"
          className="w-full resize-y rounded border border-amber-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-200"
        />
        <div className="mt-1.5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={cancel}
            className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={commit}
            className="rounded bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-500"
          >
            Save note
          </button>
        </div>
      </div>
    );
  }

  if (note) {
    return (
      <div className="mt-1 ml-4 flex items-start gap-2 rounded-md bg-amber-50 px-2 py-1.5 text-xs">
        <span aria-hidden="true" className="text-amber-700">✎</span>
        <p className="min-w-0 flex-1 italic text-amber-900">{note}</p>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={startEdit}
            className="rounded px-1.5 py-0.5 text-amber-700 hover:bg-amber-100"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded px-1.5 py-0.5 text-amber-700 hover:bg-amber-100"
            aria-label="Delete note"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      className="ml-4 mt-0.5 text-[11px] font-medium text-indigo-600 hover:text-indigo-500"
    >
      + Add a note
    </button>
  );
}

function FileDropzone({
  fieldKey,
  value,
  onChange,
}: {
  fieldKey: string;
  value: FileMeta[];
  onChange: (files: FileMeta[]) => void;
}) {
  const inputId = `file-${fieldKey}`;
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const list = event.target.files;
    if (!list || list.length === 0) return;

    setError(null);
    setUploading(true);

    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be logged in to upload files.");
      setUploading(false);
      return;
    }

    const uploaded: FileMeta[] = [];
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      const ext = file.name.includes(".")
        ? file.name.slice(file.name.lastIndexOf(".") + 1)
        : "bin";
      const safeExt = ext.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "bin";
      const path = `${user.id}/${crypto.randomUUID()}.${safeExt}`;

      const { error: upErr } = await supabase.storage
        .from("quote-uploads")
        .upload(path, file, { contentType: file.type || undefined });

      if (upErr) {
        console.error("[upload] failed:", upErr);
        setError(`Couldn't upload ${file.name}.`);
        continue;
      }

      uploaded.push({ path, name: file.name, size: file.size });
    }

    setUploading(false);
    if (uploaded.length > 0) {
      onChange([...value, ...uploaded]);
    }
    // Reset the input so the user can re-select the same file if they remove it.
    event.target.value = "";
  }

  async function remove(meta: FileMeta) {
    const supabase = createSupabaseBrowserClient();
    await supabase.storage.from("quote-uploads").remove([meta.path]);
    onChange(value.filter((f) => f.path !== meta.path));
  }

  return (
    <div>
      <label
        htmlFor={inputId}
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${
          uploading
            ? "cursor-wait border-indigo-300 bg-indigo-50/60"
            : "cursor-pointer border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/40"
        }`}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg shadow-sm">
          {uploading ? "⏳" : "📎"}
        </div>
        <p className="mt-3 text-sm font-medium text-slate-700">
          {uploading ? "Uploading…" : "Click to upload"}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          PNG, JPG, or PDF — multiple files OK
        </p>
        <input
          id={inputId}
          type="file"
          multiple
          disabled={uploading}
          className="sr-only"
          onChange={handleChange}
        />
      </label>

      {error && (
        <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      )}

      {value.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {value.map((file) => (
            <li
              key={file.path}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
            >
              <span className="truncate">📄 {file.name}</span>
              <button
                type="button"
                onClick={() => remove(file)}
                className="ml-3 shrink-0 text-slate-400 hover:text-rose-500"
                aria-label={`Remove ${file.name}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
