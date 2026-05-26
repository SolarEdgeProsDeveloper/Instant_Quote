"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "instant-quote:estimate:v4";
const EVENT_NAME = "estimate-change";

export default function CartBadge() {
  const [count, setCount] = useState(0);
  const [bumped, setBumped] = useState(false);

  useEffect(() => {
    const read = () => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        // Show the number of distinct products in the cart, not summed
        // quantity — qty is an attribute of a product, not a separate item.
        const next = Array.isArray(arr) ? arr.length : 0;
        setCount((prev) => {
          if (next !== prev) {
            setBumped(true);
            window.setTimeout(() => setBumped(false), 250);
          }
          return next;
        });
      } catch {
        setCount(0);
      }
    };
    read();
    window.addEventListener(EVENT_NAME, read);
    window.addEventListener("storage", read);
    window.addEventListener("focus", read);
    return () => {
      window.removeEventListener(EVENT_NAME, read);
      window.removeEventListener("storage", read);
      window.removeEventListener("focus", read);
    };
  }, []);

  return (
    <Link
      href="/quote/cart"
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100"
      aria-label={`Estimate cart, ${count} ${count === 1 ? "item" : "items"}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.75}
        stroke="currentColor"
        className="h-6 w-6"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
        />
      </svg>

      {count > 0 && (
        <span
          className={`absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-[11px] font-semibold leading-none text-white shadow-sm transition-transform ${
            bumped ? "scale-110" : "scale-100"
          }`}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
