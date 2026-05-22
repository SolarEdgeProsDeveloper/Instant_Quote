"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Product, ServiceItem } from "@/lib/google-sheets";
import { getStyleForService } from "@/lib/service-style";
import { PriceRange } from "../price-display";

const STORAGE_KEY = "instant-quote:estimate:v3";

type EstimateItem = {
  id: string;
  name: string;
  service: string;
  minPrice: number | null;
  maxPrice: number | null;
};

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

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      window.dispatchEvent(new Event("estimate-change"));
    } catch {
      // ignore
    }
  }, [items, hydrated]);

  const selectedIds = useMemo(
    () => new Set(items.map((i) => i.id)),
    [items],
  );

  const totals = useMemo(() => {
    const min = items.reduce((s, i) => s + (i.minPrice ?? 0), 0);
    const max = items.reduce((s, i) => s + (i.maxPrice ?? 0), 0);
    return { count: items.length, min, max };
  }, [items]);

  function toggle(product: Product) {
    setItems((prev) => {
      if (prev.some((i) => i.id === product.id)) {
        return prev.filter((i) => i.id !== product.id);
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          service: product.service,
          minPrice: product.minPrice,
          maxPrice: product.maxPrice,
        },
      ];
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
            className="inline-flex items-center gap-1 text-sm font-medium text-white/80 hover:text-white"
          >
            ← All services
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
          <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                selected={selectedIds.has(product.id)}
                onToggle={() => toggle(product)}
              />
            ))}
          </ul>
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
              <PriceRange min={totals.min} max={totals.max} size="bar" layout="inline" />
            </div>
            <button
              type="button"
              onClick={() => router.push("/quote/questions")}
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

function ProductCard({
  product,
  selected,
  onToggle,
}: {
  product: Product;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <li
      className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
        selected
          ? "border-indigo-500 ring-2 ring-indigo-200"
          : "border-slate-200"
      }`}
    >
      <h3 className="text-base font-semibold text-slate-900">
        {product.name}
      </h3>
      {(product.subService || product.unit) && (
        <p className="mt-1 text-xs text-slate-500">
          {[product.subService, product.unit].filter(Boolean).join(" · ")}
        </p>
      )}

      <div className="mt-4">
        <PriceRange min={product.minPrice} max={product.maxPrice} size="card" />
      </div>

      <div className="mt-auto pt-5">
        <button
          type="button"
          onClick={onToggle}
          className={`w-full rounded-full px-4 py-2.5 text-sm font-medium transition ${
            selected
              ? "border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
              : "bg-indigo-600 text-white shadow-sm hover:bg-indigo-500"
          }`}
        >
          {selected ? "Added — Remove" : "Add to estimate"}
        </button>
      </div>
    </li>
  );
}

