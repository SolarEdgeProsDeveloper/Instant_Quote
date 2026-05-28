"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
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
  const style = getStyleForService(service.name);
  const [items, setItems] = useState<EstimateItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [imgBroken, setImgBroken] = useState(false);

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

        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Image */}
          <div
            className={`relative aspect-square overflow-hidden rounded-2xl bg-gradient-to-br ${style.gradient}`}
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
          <div className="flex flex-col">
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
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Description
              </h2>
              <p className="mt-2 text-sm italic text-slate-400">
                Description coming soon.
              </p>
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
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    </>
  );
}
