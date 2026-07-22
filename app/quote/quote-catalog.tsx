"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Product, ServiceItem } from "@/lib/google-sheets";
import { getStyleForService } from "@/lib/service-style";
import { PriceRange } from "./price-display";
import { ProductCard } from "./product-card";
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

export default function QuoteCatalog({
  services,
  products,
}: {
  services: ServiceItem[];
  products: Product[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<EstimateItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Used to ignore the `estimate-change` events we ourselves dispatch.
  // Without this, our write effect → dispatch → listener → setItems would
  // re-trigger the write effect in a loop.
  const writeFlagRef = useRef(false);

  useEffect(() => {
    const reread = () => {
      if (writeFlagRef.current) return;
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        setItems(raw ? (JSON.parse(raw) as EstimateItem[]) : []);
      } catch {
        // ignore
      }
    };
    reread();
    setHydrated(true);

    window.addEventListener("focus", reread);
    window.addEventListener("estimate-change", reread);
    window.addEventListener("storage", reread);
    return () => {
      window.removeEventListener("focus", reread);
      window.removeEventListener("estimate-change", reread);
      window.removeEventListener("storage", reread);
    };
  }, []);

  const dbSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    try {
      writeFlagRef.current = true;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      window.dispatchEvent(new Event("estimate-change"));
      writeFlagRef.current = false;
    } catch {
      writeFlagRef.current = false;
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
        if (newQty <= 0) continue;
        next.push({ ...item, quantity: newQty });
      }
      return next;
    });
  }

  const productsByService = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of products) {
      const arr = map.get(p.service) ?? [];
      arr.push(p);
      map.set(p.service, arr);
    }
    return map;
  }, [products]);

  const totals = useMemo(() => {
    const min = items.reduce((s, i) => s + (i.minPrice ?? 0) * qtyOf(i), 0);
    const max = items.reduce((s, i) => s + (i.maxPrice ?? 0) * qtyOf(i), 0);
    return { count: items.length, min, max };
  }, [items]);

  function handleReview() {
    router.push("/quote/cart");
  }

  return (
    <>
      <section className="mx-auto w-full max-w-6xl flex-1 px-6 py-6 pb-32">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-indigo-600">
            Build your estimate
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            What can we help you with?
          </h2>
          <p className="mt-1.5 text-sm text-slate-600">
            Tap a category to browse products. We&apos;ll only ask questions
            for what you add.
          </p>
        </div>

        {services.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No services found in column D of the &quot;All&quot; tab yet.
          </p>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} hydrated={hydrated} items={items} />
            ))}
          </div>
        )}

        {products.length > 0 && (
          <div className="mt-10">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-indigo-600">
                Browse everything
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                All products
              </h2>
              <p className="mt-1.5 text-sm text-slate-600">
                Add anything to your estimate without drilling into a
                category.
              </p>
            </div>

            <div className="mt-5 space-y-6">
              {services.map((service) => {
                const productsForService =
                  productsByService.get(service.name) ?? [];
                if (productsForService.length === 0) return null;
                const style = getStyleForService(service.name);
                return (
                  <section key={service.id}>
                    <div className="flex items-center gap-3 px-1">
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-lg"
                        aria-hidden="true"
                      >
                        {style.icon}
                      </span>
                      <h3 className="text-base font-semibold text-slate-900">
                        {service.name}
                      </h3>
                      <span className="text-xs text-slate-500">
                        {productsForService.length}{" "}
                        {productsForService.length === 1
                          ? "product"
                          : "products"}
                      </span>
                      <span className="h-px flex-1 bg-slate-200" />
                      <Link
                        href={`/quote/${service.id}`}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
                      >
                        View all →
                      </Link>
                    </div>

                    <div className="mt-3 -mx-6 overflow-x-auto px-6 pb-3">
                      <div className="flex gap-3 snap-x snap-mandatory">
                        {productsForService.map((product) => {
                          const cartItem = itemById.get(product.id);
                          return (
                            <div
                              key={product.id}
                              className="w-48 shrink-0 snap-start"
                            >
                              <ProductCard
                                product={product}
                                quantity={cartItem ? qtyOf(cartItem) : 0}
                                onAdd={() => addProduct(product)}
                                onIncrement={() => changeQty(product.id, 1)}
                                onDecrement={() => changeQty(product.id, -1)}
                                compact
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
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
              onClick={handleReview}
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

function ServiceCard({
  service,
  hydrated,
  items,
}: {
  service: ServiceItem;
  hydrated: boolean;
  items: EstimateItem[];
}) {
  const style = getStyleForService(service.name);
  const inEstimate = hydrated
    ? items.filter((i) => i.service === service.name).length
    : 0;

  // Try the sheet's image first, then the Unsplash placeholder. If both fail,
  // the gradient underneath shows through.
  const candidates = [service.imageUrl, style.imageUrl].filter(
    (u): u is string => Boolean(u),
  );
  const [srcIdx, setSrcIdx] = useState(0);
  const currentSrc = candidates[srcIdx];

  return (
    <Link
      href={`/quote/${service.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div
        className={`relative aspect-[16/9] overflow-hidden bg-gradient-to-br ${style.gradient}`}
      >
        {currentSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentSrc}
            alt={service.name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => {
              if (srcIdx < candidates.length - 1) setSrcIdx(srcIdx + 1);
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-base backdrop-blur"
            aria-hidden="true"
          >
            {style.icon}
          </span>
        </div>

        {inEstimate > 0 && (
          <div className="absolute right-3 top-3 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 shadow-sm">
            {inEstimate} in estimate
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 px-4 pb-3 text-white">
          <h3 className="text-base font-semibold leading-tight">
            {service.name}
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-200">
            {service.productCount}{" "}
            {service.productCount === 1 ? "product" : "products"}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs leading-relaxed text-slate-600">{style.blurb}</p>

        <div className="mt-auto pt-3">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 group-hover:text-indigo-500">
            Browse products
            <span
              aria-hidden="true"
              className="transition-transform group-hover:translate-x-0.5"
            >
              →
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}

