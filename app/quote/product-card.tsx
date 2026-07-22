"use client";

import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/lib/google-sheets";
import { getStyleForService } from "@/lib/service-style";
import { PriceRange } from "./price-display";

function slugifyServiceClient(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function ProductCard({
  product,
  quantity,
  onAdd,
  onIncrement,
  onDecrement,
  compact = false,
}: {
  product: Product;
  quantity: number;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  compact?: boolean;
}) {
  const style = getStyleForService(product.service);
  const [imgBroken, setImgBroken] = useState(false);
  const showImage = product.imageUrl && !imgBroken;
  const inCart = quantity > 0;
  const detailHref = `/quote/${slugifyServiceClient(product.service)}/${encodeURIComponent(product.id)}`;

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${
        inCart
          ? "border-indigo-500 ring-2 ring-indigo-200"
          : "border-slate-200"
      }`}
    >
      {/* Card-wide click target. z-10 sits above the image/title (which
          live in `relative` containers and otherwise paint on top of an
          auto/z-0 absolute sibling). Interactive controls are lifted to
          z-20 so the Add button / +/− still receive clicks. */}
      <Link
        href={detailHref}
        aria-label={`View ${product.name}`}
        className="absolute inset-0 z-10 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
      />
      <div
        className={`relative overflow-hidden bg-gradient-to-br ${style.gradient} ${
          compact ? "aspect-video" : "aspect-video"
        }`}
      >
        {showImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl!}
            alt={product.name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            onError={() => setImgBroken(true)}
          />
        )}
        {!showImage && (
          <div
            className={`absolute inset-0 flex items-center justify-center opacity-40 ${
              compact ? "text-3xl" : "text-5xl"
            }`}
          >
            {style.icon}
          </div>
        )}
      </div>

      <div className={`flex flex-1 flex-col ${compact ? "p-2.5" : "p-3"}`}>
        <h3
          className={`line-clamp-2 font-semibold text-slate-900 leading-snug ${
            compact ? "text-xs" : "text-[13px]"
          }`}
        >
          {product.name}
        </h3>
        {!compact && (product.subService || product.unit) && (
          <p className="mt-0.5 text-[10px] text-slate-500">
            {[product.subService, product.unit].filter(Boolean).join(" · ")}
          </p>
        )}

        <div className={compact ? "mt-1.5" : "mt-2"}>
          <PriceRange
            min={product.minPrice}
            max={product.maxPrice}
            size="bar"
            unit={product.unit}
          />
        </div>

        <div className={`relative z-20 mt-auto ${compact ? "pt-2" : "pt-2.5"}`}>
          {inCart ? (
            <QtySelector
              quantity={quantity}
              onIncrement={onIncrement}
              onDecrement={onDecrement}
              compact={compact}
            />
          ) : (
            <button
              type="button"
              onClick={onAdd}
              className="w-full rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-indigo-500"
            >
              Add to estimate
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function QtySelector({
  quantity,
  onIncrement,
  onDecrement,
  compact = false,
}: {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  compact?: boolean;
}) {
  const btnSize = compact ? "h-6 w-6" : "h-7 w-7";
  const labelSize = "text-xs";

  return (
    <div
      className={`flex w-full items-center justify-between rounded-full border border-indigo-200 bg-indigo-50 ${
        compact ? "px-1 py-0.5" : "px-1.5 py-1"
      }`}
    >
      <button
        type="button"
        onClick={onDecrement}
        className={`flex items-center justify-center rounded-full text-indigo-700 transition hover:bg-white active:scale-95 ${btnSize}`}
        aria-label={quantity === 1 ? "Remove from estimate" : "Decrease quantity"}
      >
        <span className="text-base font-semibold leading-none">−</span>
      </button>
      <span className={`font-semibold text-indigo-700 ${labelSize}`}>
        {quantity} {compact ? "" : "in cart"}
      </span>
      <button
        type="button"
        onClick={onIncrement}
        className={`flex items-center justify-center rounded-full text-indigo-700 transition hover:bg-white active:scale-95 ${btnSize}`}
        aria-label="Increase quantity"
      >
        <span className="text-base font-semibold leading-none">+</span>
      </button>
    </div>
  );
}
