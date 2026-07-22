"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const targetProductId = searchParams.get("p");
  const style = getStyleForService(service.name);

  const [items, setItems] = useState<EstimateItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // When the URL carries ?p=<productId> (set by the header search dropdown),
  // scroll the matching card into view and flash a ring around it so the
  // user sees where they landed instead of staring at the top of the list.
  useEffect(() => {
    if (!targetProductId) return;
    const el = document.querySelector(
      `[data-product-id="${CSS.escape(targetProductId)}"]`,
    );
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(targetProductId);
    const t = setTimeout(() => setHighlightId(null), 2200);
    return () => clearTimeout(t);
  }, [targetProductId]);

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

        <div className="relative mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-6 py-3">
          <Link
            href="/quote"
            aria-label="All services"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/30 bg-white/10 text-xs font-medium text-white shadow-sm backdrop-blur transition hover:bg-white/20"
          >
            <span aria-hidden="true">←</span>
          </Link>
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-base backdrop-blur"
            aria-hidden="true"
          >
            {style.icon}
          </span>
          <h1 className="text-base font-semibold tracking-tight text-white sm:text-lg">
            {service.name}
          </h1>
          <span className="ml-auto text-[11px] font-medium uppercase tracking-widest text-white/70">
            {products.length}{" "}
            {products.length === 1 ? "product" : "products"}
          </span>
        </div>
      </section>

      {/* Product grid */}
      <section className="mx-auto w-full max-w-6xl flex-1 px-6 py-4 pb-32">
        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No products found for this service yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((product) => {
              const cartItem = itemById.get(product.id);
              const isHighlighted = highlightId === product.id;
              return (
                <div
                  key={product.id}
                  data-product-id={product.id}
                  className={`rounded-2xl transition-shadow duration-500 ${
                    isHighlighted
                      ? "shadow-[0_0_0_4px_rgba(99,102,241,0.5)]"
                      : ""
                  }`}
                >
                  <ProductCard
                    product={product}
                    quantity={cartItem ? qtyOf(cartItem) : 0}
                    onAdd={() => addProduct(product)}
                    onIncrement={() => changeQty(product.id, 1)}
                    onDecrement={() => changeQty(product.id, -1)}
                  />
                </div>
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

