"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { saveDraftProducts } from "@/app/actions/quote";
import { getStyleForService } from "@/lib/service-style";
import { PriceRange } from "../price-display";

const STORAGE_KEY = "instant-quote:estimate:v4";

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

export default function CartView() {
  const router = useRouter();
  const [items, setItems] = useState<EstimateItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Load once on mount. Cart-view owns its own state from here on, so we
    // intentionally don't subscribe to `estimate-change` — listening to events
    // we ourselves dispatch creates a feedback loop that can overwrite the
    // user's edits with stale data.
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as EstimateItem[]);
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  const dbSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      window.dispatchEvent(new Event("estimate-change"));
    } catch {
      // ignore
    }
    if (dbSaveTimerRef.current) clearTimeout(dbSaveTimerRef.current);
    dbSaveTimerRef.current = setTimeout(() => {
      saveDraftProducts(items).catch((err) => {
        console.warn("[draft] save products failed:", err);
      });
    }, 1500);
    return () => {
      if (dbSaveTimerRef.current) clearTimeout(dbSaveTimerRef.current);
    };
  }, [items, hydrated]);

  const totals = useMemo(() => {
    const min = items.reduce((s, i) => s + (i.minPrice ?? 0) * qtyOf(i), 0);
    const max = items.reduce((s, i) => s + (i.maxPrice ?? 0) * qtyOf(i), 0);
    return { count: items.length, min, max };
  }, [items]);

  function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function changeQty(id: string, delta: number) {
    setItems((prev) => {
      const next: EstimateItem[] = [];
      for (const item of prev) {
        if (item.id !== id) {
          next.push(item);
          continue;
        }
        const newQty = qtyOf(item) + delta;
        if (newQty <= 0) continue;
        next.push({ ...item, quantity: newQty });
      }
      return next;
    });
  }

  if (!hydrated) {
    return (
      <section className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
      </section>
    );
  }

  return (
    <>
      <section className="mx-auto w-full max-w-4xl flex-1 px-6 py-10 pb-32">
        <Link
          href="/quote"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <span aria-hidden="true">←</span>
          Back to services
        </Link>

        <div className="mt-6 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
            Your cart
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            {items.length === 0
              ? "Nothing here yet"
              : `${items.length} ${items.length === 1 ? "product" : "products"} in your estimate`}
          </h1>
          {items.length > 0 && (
            <p className="mt-3 text-base text-slate-600">
              Review what you&apos;ve picked. Remove anything you don&apos;t
              want, then continue.
            </p>
          )}
        </div>

        {items.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-2xl">
              🛒
            </div>
            <p className="mt-4 text-sm text-slate-600">
              Your cart is empty.
            </p>
            <Link
              href="/quote"
              className="mt-6 inline-block rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
            >
              Browse services
            </Link>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {items.map((item) => (
              <CartRow
                key={item.id}
                item={item}
                onRemove={() => remove(item.id)}
                onIncrement={() => changeQty(item.id, 1)}
                onDecrement={() => changeQty(item.id, -1)}
              />
            ))}
          </ul>
        )}
      </section>

      {items.length > 0 && (
        <div className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 shadow-[0_-4px_20px_-8px_rgba(15,23,42,0.15)] backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-4">
            <div className="flex items-center gap-5">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                {totals.count}{" "}
                {totals.count === 1 ? "product" : "products"}
              </p>
              <PriceRange
                min={totals.min}
                max={totals.max}
                size="bar"
                layout="inline"
              />
            </div>
            <button
              type="button"
              onClick={() => router.push("/quote/questions")}
              className="group inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-500 sm:text-base"
            >
              Done — Get my estimate
              <span
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-0.5"
              >
                →
              </span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function CartRow({
  item,
  onRemove,
  onIncrement,
  onDecrement,
}: {
  item: EstimateItem;
  onRemove: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  const style = getStyleForService(item.service);
  const [broken, setBroken] = useState(false);
  const showImage = item.imageUrl && !broken;
  const qty = qtyOf(item);
  const lineMin = (item.minPrice ?? 0) * qty;
  const lineMax = (item.maxPrice ?? 0) * qty;

  return (
    <li className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div
        className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br ${style.gradient}`}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl!}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setBroken(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-2xl opacity-70">
            {style.icon}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700">
            <span aria-hidden="true">{style.icon}</span>
            {item.service}
          </span>
        </div>
        <h3 className="mt-1.5 text-sm font-semibold text-slate-900 sm:text-base">
          {item.name}
        </h3>

        <div className="mt-2 text-xs text-slate-500">
          <span>
            {formatPrice(item.minPrice ?? 0)}
            {item.maxPrice != null && (
              <>
                {" "}
                <span className="text-slate-400 line-through">
                  {formatPrice(item.maxPrice)}
                </span>
              </>
            )}
            {qty > 1 && <span className="ml-1">× {qty}</span>}
          </span>
        </div>

        {qty > 1 && (
          <div className="mt-1 text-sm font-semibold">
            <span className="text-rose-600">{formatPrice(lineMin)}</span>
            {item.maxPrice != null && (
              <>
                <span className="mx-1.5 text-slate-300">–</span>
                <span className="text-slate-400 line-through">
                  {formatPrice(lineMax)}
                </span>
              </>
            )}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-1.5 py-1">
            <button
              type="button"
              onClick={onDecrement}
              disabled={qty <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-full text-indigo-700 transition hover:bg-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Decrease quantity"
            >
              <span className="text-lg font-semibold leading-none">−</span>
            </button>
            <span className="min-w-[2rem] text-center text-sm font-semibold text-indigo-700">
              {qty}
            </span>
            <button
              type="button"
              onClick={onIncrement}
              className="flex h-8 w-8 items-center justify-center rounded-full text-indigo-700 transition hover:bg-white active:scale-95"
              aria-label="Increase quantity"
            >
              <span className="text-lg font-semibold leading-none">+</span>
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-rose-100 hover:text-rose-600 active:scale-95"
        aria-label={`Remove ${item.name}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.25}
          stroke="currentColor"
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18 18 6M6 6l12 12"
          />
        </svg>
      </button>
    </li>
  );
}

function formatPrice(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `$${Math.round(n).toLocaleString("en-US")}`;
}
