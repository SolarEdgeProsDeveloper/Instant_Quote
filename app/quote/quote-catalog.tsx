"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ServiceItem } from "@/lib/google-sheets";
import { getStyleForService } from "@/lib/service-style";
import { PriceRange } from "./price-display";

const STORAGE_KEY = "instant-quote:estimate:v3";

type EstimateItem = {
  id: string;
  name: string;
  service: string;
  minPrice: number | null;
  maxPrice: number | null;
};

export default function QuoteCatalog({
  services,
}: {
  services: ServiceItem[];
}) {
  const router = useRouter();
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

    // Re-read on focus and on cross-component estimate changes.
    const reread = () => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        setItems(raw ? (JSON.parse(raw) as EstimateItem[]) : []);
      } catch {
        // ignore
      }
    };
    window.addEventListener("focus", reread);
    window.addEventListener("estimate-change", reread);
    window.addEventListener("storage", reread);
    return () => {
      window.removeEventListener("focus", reread);
      window.removeEventListener("estimate-change", reread);
      window.removeEventListener("storage", reread);
    };
  }, []);

  const totals = useMemo(() => {
    const min = items.reduce((s, i) => s + (i.minPrice ?? 0), 0);
    const max = items.reduce((s, i) => s + (i.maxPrice ?? 0), 0);
    return { count: items.length, min, max };
  }, [items]);

  function handleReview() {
    router.push("/quote/questions");
  }

  return (
    <>
      <section className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 pb-32">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
            Build your estimate
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            What can we help you with?
          </h2>
          <p className="mt-3 text-base text-slate-600">
            Tap a category to browse products. We&apos;ll only ask questions
            for what you add.
          </p>
        </div>

        {services.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No services found in column D of the &quot;All&quot; tab yet.
          </p>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} hydrated={hydrated} items={items} />
            ))}
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
              <PriceRange min={totals.min} max={totals.max} size="bar" layout="inline" />
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

  return (
    <Link
      href={`/quote/${service.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div
        className={`relative aspect-[4/3] overflow-hidden bg-gradient-to-br ${style.gradient}`}
      >
        <Image
          src={style.imageUrl}
          alt={service.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        <div className="absolute left-4 top-4 flex items-center gap-2">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg backdrop-blur"
            aria-hidden="true"
          >
            {style.icon}
          </span>
        </div>

        {inEstimate > 0 && (
          <div className="absolute right-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-semibold text-indigo-700 shadow-sm">
            {inEstimate} in estimate
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 px-5 pb-4 text-white">
          <h3 className="text-lg font-semibold leading-tight">
            {service.name}
          </h3>
          <p className="mt-0.5 text-xs text-slate-200">
            {service.productCount}{" "}
            {service.productCount === 1 ? "product" : "products"}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-sm text-slate-600">{style.blurb}</p>

        <div className="mt-auto pt-5">
          <span className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 group-hover:text-indigo-500">
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

