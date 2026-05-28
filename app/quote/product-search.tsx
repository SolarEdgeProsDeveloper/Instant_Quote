"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  getSearchableProducts,
  type SearchableProduct,
} from "@/app/actions/search";
import { formatPrice } from "./price-display";

const MAX_RESULTS = 8;

export default function ProductSearch() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<SearchableProduct[] | null>(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function ensureLoaded() {
    if (products !== null) return;
    try {
      const list = await getSearchableProducts();
      setProducts(list);
    } catch (err) {
      console.warn("[search] catalog load failed:", err);
      setProducts([]);
    }
  }

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const trimmed = query.trim().toLowerCase();
  const results: SearchableProduct[] =
    !trimmed || !products
      ? []
      : products
          .filter((p) => p.name.toLowerCase().includes(trimmed))
          .slice(0, MAX_RESULTS);

  // Group results by service so the dropdown reads as a table of contents
  // ("two batteries under Solar, one disconnect under Electrical").
  const groups = new Map<
    string,
    { slug: string; items: SearchableProduct[] }
  >();
  for (const r of results) {
    const g = groups.get(r.service) ?? { slug: r.serviceSlug, items: [] };
    g.items.push(r);
    groups.set(r.service, g);
  }

  const showDropdown = open && trimmed.length > 0;

  return (
    <div ref={rootRef} className="relative w-full max-w-md flex-1">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder="Search products…"
          aria-label="Search products"
          onFocus={() => {
            void ensureLoaded();
            setOpen(true);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-4 pr-10 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        ) : (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400"
          >
            🔍
          </span>
        )}
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
          {products === null ? (
            <p className="px-4 py-3 text-xs text-slate-500">Loading…</p>
          ) : groups.size === 0 ? (
            <p className="px-4 py-3 text-xs text-slate-500">
              No products match &ldquo;{query}&rdquo;.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {Array.from(groups.entries()).map(([serviceName, group]) => (
                <li key={serviceName}>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                    {serviceName}
                  </p>
                  <ul>
                    {group.items.map((p) => (
                      <li key={p.id}>
                        <Link
                          href={`/quote/${group.slug}?p=${encodeURIComponent(p.id)}`}
                          onClick={() => {
                            setOpen(false);
                            setQuery("");
                          }}
                          className="flex items-center gap-3 px-4 py-2 transition hover:bg-indigo-50/60"
                        >
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt=""
                              className="h-8 w-8 shrink-0 rounded object-cover"
                            />
                          ) : (
                            <span className="h-8 w-8 shrink-0 rounded bg-slate-100" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-slate-900">
                              {p.name}
                            </p>
                            {p.subService && (
                              <p className="truncate text-xs text-slate-500">
                                {p.subService}
                              </p>
                            )}
                          </div>
                          {p.minPrice != null && (
                            <span className="shrink-0 text-xs font-semibold text-rose-600">
                              {formatPrice(p.minPrice)}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
