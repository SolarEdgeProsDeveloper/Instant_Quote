"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getQuestionsForService,
  type Question,
  type QuestionSet,
} from "@/lib/questions";
import { getStyleForKey } from "@/lib/service-style";
import { PriceRange } from "../price-display";

const STORAGE_KEY = "instant-quote:estimate:v3";

type EstimateItem = {
  id: string;
  name: string;
  service: string;
  minPrice: number | null;
  maxPrice: number | null;
};

type AnswerValue = string | number | boolean | string[] | null;
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
  return `$${Math.round(n).toLocaleString("en-US")}`;
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

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as EstimateItem[]);
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

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
      min: products.reduce((s, p) => s + (p.minPrice ?? 0), 0),
      max: products.reduce((s, p) => s + (p.maxPrice ?? 0), 0),
    }));
  }, [items]);

  const totals = useMemo(() => {
    const min = items.reduce((s, i) => s + (i.minPrice ?? 0), 0);
    const max = items.reduce((s, i) => s + (i.maxPrice ?? 0), 0);
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

  function setAnswer(key: string, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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

  if (submitted) {
    return (
      <section className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-emerald-400 to-teal-500 px-8 py-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-3xl backdrop-blur">
              ✓
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-white">
              Thanks — we have your answers.
            </h2>
            <p className="mt-2 text-sm text-emerald-50">
              We&apos;ll review the details and confirm your final estimate
              shortly.
            </p>
          </div>
          <div className="px-8 py-6">
            <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
              Your estimate
            </p>
            <div className="mt-2">
              <PriceRange min={totals.min} max={totals.max} size="hero" />
            </div>

            <p className="mt-6 text-xs font-medium uppercase tracking-widest text-slate-500">
              Products included
            </p>
            <ul className="mt-3 space-y-3">
              {grouped.map((g) => (
                <li key={g.slug}>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <span aria-hidden="true">
                      {getStyleForKey(g.set?.key).icon}
                    </span>
                    {g.name}
                  </div>
                  <ul className="mt-1 ml-6 space-y-0.5 text-sm text-slate-600">
                    {g.products.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-baseline justify-between gap-3"
                      >
                        <span className="truncate">{p.name}</span>
                        <span className="shrink-0 text-xs">
                          <span className="text-red-600">
                            {formatPrice(p.minPrice ?? 0)}
                          </span>
                          <span className="mx-1.5 text-slate-300">—</span>
                          <span className="text-slate-400 line-through">
                            {formatPrice(p.maxPrice ?? 0)}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex gap-3">
              <Link
                href="/quote"
                className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-500"
              >
                Back to services
              </Link>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Edit answers
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50">
      <ServiceNav grouped={grouped} answers={answers} />

      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 pb-32 sm:px-6">
        <div className="mb-10 overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
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
      </div>

      <div className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/quote"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              ← Back
            </Link>
            <span className="hidden text-sm text-slate-500 sm:inline">
              {totalAnswered} of {totalQuestions} answered
            </span>
          </div>
          <button
            type="submit"
            className="rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
          >
            Submit for estimate
          </button>
        </div>
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

        {question.type === "file" && <FileDropzone fieldKey={fieldKey} />}
      </div>
    </div>
  );
}

function FileDropzone({ fieldKey }: { fieldKey: string }) {
  const [files, setFiles] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = `file-${fieldKey}`;

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const list = event.target.files;
    if (!list) return;
    const names: string[] = [];
    for (let i = 0; i < list.length; i++) names.push(list[i].name);
    setFiles((prev) => [...prev, ...names]);
  }

  function remove(name: string) {
    setFiles((prev) => prev.filter((n) => n !== name));
  }

  return (
    <div>
      <label
        htmlFor={inputId}
        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition hover:border-indigo-400 hover:bg-indigo-50/40"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg shadow-sm">
          📎
        </div>
        <p className="mt-3 text-sm font-medium text-slate-700">
          Click to upload
        </p>
        <p className="mt-1 text-xs text-slate-500">
          PNG, JPG, or PDF — multiple files OK
        </p>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          className="sr-only"
          onChange={handleChange}
        />
      </label>

      {files.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {files.map((name) => (
            <li
              key={name}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
            >
              <span className="truncate">📄 {name}</span>
              <button
                type="button"
                onClick={() => remove(name)}
                className="ml-3 shrink-0 text-slate-400 hover:text-rose-500"
                aria-label={`Remove ${name}`}
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
