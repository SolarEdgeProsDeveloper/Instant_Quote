"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Product, ServiceItem } from "@/lib/google-sheets";
import { getStyleForService } from "@/lib/service-style";
import { PriceRange } from "../price-display";
import { ProductCard } from "../product-card";
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

export default function ProductList({
  service,
  products,
}: {
  service: ServiceItem;
  products: Product[];
}) {
  const router = useRouter();
  const style = getStyleForService(service.name);

  const [items, setItems] = useState<EstimateItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

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

  const totals = useMemo(() => {
    const min = items.reduce((s, i) => s + (i.minPrice ?? 0) * qtyOf(i), 0);
    const max = items.reduce((s, i) => s + (i.maxPrice ?? 0) * qtyOf(i), 0);
    return { count: items.length, min, max };
  }, [items]);

  const itemById = useMemo(() => {
    const map = new Map<string, EstimateItem>();
    for (const i of items) map.set(i.id, i);
    return map;
  }, [items]);

  function addProduct(product: Product) {
    setItems((prev) => {
      if (prev.some((i) => i.id === product.id)) return prev;
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          service: product.service,
          minPrice: product.minPrice,
          maxPrice: product.maxPrice,
          imageUrl: product.imageUrl,
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
        if (newQty <= 0) continue; // remove
        next.push({ ...item, quantity: newQty });
      }
      return next;
    });
  }

  return (
    <>
      {/* Service hero */}
      <section
        className={`relative overflow-hidden bg-gradient-to-br ${style.gradient}`}
      >
        <div className="absolute inset-0 -z-0">
          <Image
            src={style.imageUrl}
            alt=""
            fill
            sizes="100vw"
            priority
            className="object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/50" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 py-12 sm:py-16">
          <Link
            href="/quote"
            className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white shadow-sm backdrop-blur transition hover:bg-white/20"
          >
            <span aria-hidden="true">←</span>
            All services
          </Link>
          <div className="mt-4 flex items-center gap-4">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-2xl backdrop-blur"
              aria-hidden="true"
            >
              {style.icon}
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-white/80">
                Service
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {service.name}
              </h1>
            </div>
          </div>
          <p className="mt-5 max-w-2xl text-base text-white/90">
            {style.blurb}
          </p>
        </div>
      </section>

      {/* Product grid */}
      <section className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 pb-32">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Products</h2>
            <p className="mt-1 text-sm text-slate-600">
              {products.length}{" "}
              {products.length === 1 ? "option" : "options"} available
            </p>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No products found for this service yet.
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const cartItem = itemById.get(product.id);
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  quantity={cartItem ? qtyOf(cartItem) : 0}
                  onAdd={() => addProduct(product)}
                  onIncrement={() => changeQty(product.id, 1)}
                  onDecrement={() => changeQty(product.id, -1)}
                />
              );
            })}
          </div>
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

