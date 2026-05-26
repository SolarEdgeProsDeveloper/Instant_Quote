"use client";

import { useState } from "react";
import type { Product } from "@/lib/google-sheets";
import { getStyleForService } from "@/lib/service-style";
import { PriceRange } from "./price-display";

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

  return (
    <article
      className={`flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${
        inCart
          ? "border-indigo-500 ring-2 ring-indigo-200"
          : "border-slate-200"
      }`}
    >
      <div
        className={`relative overflow-hidden bg-gradient-to-br ${style.gradient} ${
          compact ? "aspect-video" : "aspect-[4/3]"
        }`}
      >
        {showImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl!}
            alt={product.name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
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

      <div className={`flex flex-1 flex-col ${compact ? "p-3" : "p-5"}`}>
        <h3
          className={`font-semibold text-slate-900 ${
            compact
              ? "line-clamp-2 text-xs leading-snug"
              : "text-base"
          }`}
        >
          {product.name}
        </h3>
        {!compact && (product.subService || product.unit) && (
          <p className="mt-1 text-xs text-slate-500">
            {[product.subService, product.unit].filter(Boolean).join(" · ")}
          </p>
        )}

        <div className={compact ? "mt-2" : "mt-4"}>
          <PriceRange
            min={product.minPrice}
            max={product.maxPrice}
            size={compact ? "bar" : "card"}
          />
        </div>

        <div className={`mt-auto ${compact ? "pt-2" : "pt-5"}`}>
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
              className={`w-full rounded-full bg-indigo-600 font-medium text-white shadow-sm transition hover:bg-indigo-500 ${
                compact ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm"
              }`}
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
  const btnSize = compact ? "h-7 w-7" : "h-9 w-9";
  const iconSize = compact ? "h-3.5 w-3.5" : "h-4 w-4";
  const labelSize = compact ? "text-xs" : "text-sm";

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
        {quantity === 1 ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className={iconSize}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
            />
          </svg>
        ) : (
          <span className="text-base font-semibold leading-none">−</span>
        )}
      </button>
      <span className={`font-semibold text-indigo-700 ${labelSize}`}>
        {compact ? quantity : `${quantity} in cart`}
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
