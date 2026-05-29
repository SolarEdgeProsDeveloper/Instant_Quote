"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Product, ServiceItem } from "@/lib/google-sheets";
import { getStyleForService } from "@/lib/service-style";
import { PriceRange } from "../../price-display";
import { ProductCard, QtySelector } from "../../product-card";
import { saveDraftProducts } from "@/app/actions/quote";

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

export default function ProductDetail({
  product,
  service,
  adders,
  others,
}: {
  product: Product;
  service: ServiceItem;
  adders: Product[];
  others: Product[];
}) {
  const router = useRouter();
  const style = getStyleForService(service.name);
  const [items, setItems] = useState<EstimateItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [imgBroken, setImgBroken] = useState(false);
  const [expandedFields, setExpandedFields] = useState<Set<string>>(
    () => new Set(),
  );
  const rightColRef = useRef<HTMLDivElement>(null);
  const [lockedImageHeight, setLockedImageHeight] = useState<number | null>(
    null,
  );
  // Ref mirror of expandedFields so the resize handler reads the latest
  // value without re-binding the listener on every toggle.
  const expandedFieldsRef = useRef(expandedFields);
  useEffect(() => {
    expandedFieldsRef.current = expandedFields;
  }, [expandedFields]);

  // Snapshot the right column's height at first paint — that's the
  // "initial / all collapsed" height the image should match. Deliberately
  // NOT re-measuring when expandedFields changes: when the user clicks
  // Collapse all, the CSS grid-rows transition needs ~200ms to actually
  // shrink the column. If we measured at that moment we'd capture the
  // still-expanded height (animation hasn't moved yet) and the image
  // would jump UP instead of staying put. Window-resize handler re-runs
  // the measurement only when nothing is open so the lock stays accurate
  // across viewport changes without getting corrupted by animations.
  useEffect(() => {
    if (rightColRef.current) {
      setLockedImageHeight(rightColRef.current.offsetHeight);
    }
    function onResize() {
      if (rightColRef.current && expandedFieldsRef.current.size === 0) {
        setLockedImageHeight(rightColRef.current.offsetHeight);
      }
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function toggleField(heading: string) {
    setExpandedFields((prev) => {
      const next = new Set(prev);
      if (next.has(heading)) next.delete(heading);
      else next.add(heading);
      return next;
    });
  }

  const allFieldsExpanded =
    product.detailFields.length > 0 &&
    expandedFields.size === product.detailFields.length;

  function toggleAllFields() {
    setExpandedFields(
      allFieldsExpanded
        ? new Set()
        : new Set(product.detailFields.map((f) => f.heading)),
    );
  }

  useEffect(() => {
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

  const itemById = useMemo(() => {
    const map = new Map<string, EstimateItem>();
    for (const i of items) map.set(i.id, i);
    return map;
  }, [items]);

  const totals = useMemo(() => {
    const min = items.reduce((s, i) => s + (i.minPrice ?? 0) * qtyOf(i), 0);
    const max = items.reduce((s, i) => s + (i.maxPrice ?? 0) * qtyOf(i), 0);
    return { count: items.length, min, max };
  }, [items]);

  function addProduct(p: Product) {
    setItems((prev) => {
      if (prev.some((i) => i.id === p.id)) return prev;
      return [
        ...prev,
        {
          id: p.id,
          name: p.name,
          service: p.service,
          minPrice: p.minPrice,
          maxPrice: p.maxPrice,
          imageUrl: p.imageUrl,
          quantity: 1,
        },
      ];
    });
  }

  function changeQty(productId: string, delta: number) {
    setItems((prev) => {
      const next: EstimateItem[] = [];
      for (const item of prev) {
        if (item.id !== productId) {
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

  const cartItem = itemById.get(product.id);
  const inCart = !!cartItem;
  const showImage = product.imageUrl && !imgBroken;

  return (
    <>
      <section className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 pb-20">
        <Link
          href={`/quote/${service.id}`}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <span aria-hidden="true">←</span>
          Back to {service.name}
        </Link>

        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
          {/* Image — square on mobile, locked to the right column's initial
              (all sections collapsed) height on lg+ via --locked-h. The
              image keeps that height when sections expand, so only the
              right column grows downward. Fallback `420px` covers the
              moment before measurement lands. */}
          <div
            className={`relative aspect-square overflow-hidden rounded-2xl bg-gradient-to-br ${style.gradient} lg:aspect-auto lg:h-[var(--locked-h,420px)]`}
            style={
              lockedImageHeight != null
                ? ({ "--locked-h": `${lockedImageHeight}px` } as React.CSSProperties)
                : undefined
            }
          >
            {showImage && (
              <img
                src={product.imageUrl!}
                alt={product.name}
                className="absolute inset-0 h-full w-full object-cover"
                onError={() => setImgBroken(true)}
              />
            )}
            {!showImage && (
              <div className="absolute inset-0 flex items-center justify-center text-7xl opacity-40">
                {style.icon}
              </div>
            )}
          </div>

          {/* Info */}
          <div ref={rightColRef} className="flex flex-col">
            <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
              {service.name}
              {product.subService && ` · ${product.subService}`}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              {product.name}
            </h1>

            <div className="mt-5">
              <PriceRange
                min={product.minPrice}
                max={product.maxPrice}
                size="hero"
                unit={product.unit}
              />
            </div>

            <div className="mt-8">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Description
                </h2>
                {product.detailFields.length > 1 && (
                  <button
                    type="button"
                    onClick={toggleAllFields}
                    className="text-xs font-medium text-indigo-600 transition hover:text-indigo-500"
                  >
                    {allFieldsExpanded ? "Collapse all" : "Expand all"}
                  </button>
                )}
              </div>
              {product.detailFields.length > 0 ? (
                <ul className="mt-3 space-y-1.5">
                  {product.detailFields.map((field) => {
                    const isOpen = expandedFields.has(field.heading);
                    return (
                      <li
                        key={field.heading}
                        className={`group/item overflow-hidden rounded-lg border bg-white shadow-sm transition-colors duration-200 ${
                          isOpen
                            ? "border-indigo-200 ring-1 ring-indigo-100"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleField(field.heading)}
                          aria-expanded={isOpen}
                          className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm font-semibold transition-colors ${
                            isOpen
                              ? "text-indigo-900"
                              : "text-slate-800 group-hover/item:bg-slate-50/60"
                          }`}
                        >
                          <span className="truncate">{field.heading}</span>
                          <span
                            aria-hidden="true"
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                              isOpen
                                ? "rotate-90 bg-indigo-100 text-indigo-600"
                                : "bg-slate-100 text-slate-500 group-hover/item:bg-slate-200"
                            }`}
                          >
                            <svg
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="h-3 w-3"
                            >
                              <path
                                fillRule="evenodd"
                                d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </span>
                        </button>

                        {/* Grid-rows trick → smooth height transition without
                            knowing the content height ahead of time. */}
                        <div
                          className={`grid transition-all duration-200 ease-out ${
                            isOpen
                              ? "grid-rows-[1fr] opacity-100"
                              : "grid-rows-[0fr] opacity-0"
                          }`}
                        >
                          <div className="overflow-hidden">
                            <div className="border-t border-indigo-100/70 px-4 py-2.5 text-[13px] leading-snug text-slate-700">
                              {field.value ? (
                                <p className="whitespace-pre-wrap">
                                  {field.value}
                                </p>
                              ) : (
                                <p className="italic text-slate-400">
                                  Not provided.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-2 text-sm italic text-slate-400">
                  Description coming soon.
                </p>
              )}
            </div>

            <div className="mt-auto pt-8">
              {hydrated && inCart ? (
                <div className="max-w-sm">
                  <QtySelector
                    quantity={qtyOf(cartItem!)}
                    onIncrement={() => changeQty(product.id, 1)}
                    onDecrement={() => changeQty(product.id, -1)}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => addProduct(product)}
                  disabled={!hydrated}
                  className="inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-500 disabled:opacity-50 sm:w-auto"
                >
                  Add to estimate
                  <span aria-hidden="true">→</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Related products: adders first, then everything else in the service. */}
        {(adders.length > 0 || others.length > 0) && (
          <section className="mt-16">
            <h2 className="text-xl font-semibold text-slate-900">
              Related products
            </h2>

            {adders.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Adders
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Pairs well with {service.name.toLowerCase()}.
                </p>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {adders.map((p) => {
                    const ri = itemById.get(p.id);
                    return (
                      <ProductCard
                        key={p.id}
                        product={p}
                        quantity={ri ? qtyOf(ri) : 0}
                        onAdd={() => addProduct(p)}
                        onIncrement={() => changeQty(p.id, 1)}
                        onDecrement={() => changeQty(p.id, -1)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {others.length > 0 && (
              <div className={adders.length > 0 ? "mt-10" : "mt-6"}>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  More in {service.name}
                </h3>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {others.map((p) => {
                    const ri = itemById.get(p.id);
                    return (
                      <ProductCard
                        key={p.id}
                        product={p}
                        quantity={ri ? qtyOf(ri) : 0}
                        onAdd={() => addProduct(p)}
                        onIncrement={() => changeQty(p.id, 1)}
                        onDecrement={() => changeQty(p.id, -1)}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}
      </section>

      {hydrated && totals.count > 0 && (
        <div className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 shadow-[0_-4px_20px_-8px_rgba(15,23,42,0.15)] backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
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
              onClick={() => router.push("/quote/cart")}
              className="group inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-500 sm:text-base"
            >
              I&apos;m done — Get my estimate
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
