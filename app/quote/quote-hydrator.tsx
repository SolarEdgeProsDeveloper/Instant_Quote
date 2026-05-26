"use client";

import { useEffect } from "react";
import { getDraftQuote } from "@/app/actions/quote";

const PRODUCTS_KEY = "instant-quote:estimate:v4";
const ANSWERS_KEY = "instant-quote:answers:v1";

/**
 * Runs once when the user enters /quote/*. If they have a draft saved in
 * Supabase (e.g. from a previous device) and localStorage is empty,
 * we populate localStorage from the DB so the UI picks it up.
 *
 * If localStorage already has data, we leave it alone — local is more
 * recent than DB because of debounced syncing.
 */
export default function QuoteHydrator() {
  useEffect(() => {
    let cancelled = false;

    getDraftQuote()
      .then((draft) => {
        if (cancelled || !draft) return;

        let dispatched = false;

        if (!window.localStorage.getItem(PRODUCTS_KEY) && draft.products.length) {
          window.localStorage.setItem(
            PRODUCTS_KEY,
            JSON.stringify(draft.products),
          );
          dispatched = true;
        }

        if (
          !window.localStorage.getItem(ANSWERS_KEY) &&
          Object.keys(draft.answers).length
        ) {
          window.localStorage.setItem(
            ANSWERS_KEY,
            JSON.stringify(draft.answers),
          );
        }

        if (dispatched) {
          window.dispatchEvent(new Event("estimate-change"));
        }
      })
      .catch((err) => {
        // Silent fallback: localStorage continues to work even if the DB
        // table isn't set up yet or the request fails.
        console.warn("[quote] hydrate failed:", err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
