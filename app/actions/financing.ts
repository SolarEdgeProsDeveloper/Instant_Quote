"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notifyFinancingInquiry } from "@/lib/notifications";
import { getSynchronyAccessToken } from "@/lib/synchrony/auth";

export type FinancingProvider = "synchrony" | "sungage";

const PROVIDER_LABELS: Record<FinancingProvider, string> = {
  synchrony: "Synchrony",
  sungage: "Sungage",
};

/**
 * Captures a customer's intent to finance their estimate. For Sungage
 * (hosted URL only) this is just a notification. For Synchrony we go
 * further: call Multi Product Prequalification with a minimal CONSUMER-
 * INITIATED payload, get back a paylaterRedirectionUrl, and return it to
 * the client so the browser can redirect there. The customer enters PII
 * on Synchrony's hosted page — never on our server.
 */
export async function requestFinancing(input: {
  provider: FinancingProvider;
  quoteId: string;
  totalMin: number;
}): Promise<{ ok: true }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");

  await notifyFinancingInquiry({
    provider: PROVIDER_LABELS[input.provider],
    userEmail: user.email ?? null,
    quoteId: input.quoteId,
    totalMin: input.totalMin,
  });

  return { ok: true };
}

/**
 * Starts a Synchrony Multi Product Prequalification with the minimal
 * payload allowed (CONSUMER_INITIATED flow). Synchrony returns a
 * paylaterRedirectionUrl which we hand back to the client. The client
 * does a top-level navigation to that URL — the customer fills out PII
 * on Synchrony's hosted Apply page, gets a decision there, then is
 * redirected back to our `merchantRedirectionUrl` with status query
 * params.
 *
 * Throws if Synchrony returns a non-2xx response (so the caller can
 * surface an error to the user instead of redirecting to nowhere).
 */
export async function startSynchronyApplication(input: {
  quoteId: string;
  purchaseAmount: number;
}): Promise<{ redirectUrl: string; applicationRefId: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");

  const baseUrl = requireEnv("SYNCHRONY_API_BASE_URL");
  const merchantNumber = requireEnv("SYNCHRONY_MERCHANT_NUMBER");
  const appOrigin =
    process.env.NEXT_PUBLIC_APP_ORIGIN ??
    "https://instant-quote-rho.vercel.app";

  const token = await getSynchronyAccessToken();
  // applicationRefId must be 16-40 alphanumeric chars + "-_.". We base it
  // on the quoteId so we can correlate webhook callbacks back to a quote.
  const applicationRefId = buildApplicationRefId(input.quoteId);
  const trackingId = `iq-${Date.now()}-${input.quoteId.slice(0, 8)}`;

  const body = {
    applicationRefId,
    purchaseAmount: formatAmount(input.purchaseAmount),
    applicationInitiation: "CONSUMER_INITIATED",
    merchantInfo: {
      merchantNumber,
      deviceType: "N", // N = Internet
      country: "US",
    },
    merchantRedirectionUrl: `${appOrigin}/quote/financing/return?ref=${applicationRefId}&q=${input.quoteId}`,
  };

  const res = await fetch(`${baseUrl}/v1/credit/apply/multi-product/offers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "X-SYF-Request-TrackingId": trackingId,
      "X-SYF-MerchantNumber": merchantNumber,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `[synchrony] prequalify failed: ${res.status} ${res.statusText}${
        text ? ` — ${text.slice(0, 300)}` : ""
      }`,
    );
  }

  const json = (await res.json()) as {
    paylaterRedirectionUrl?: string;
    paylaterInfo?: { paylaterRedirectionUrl?: string };
    decisionMessage?: string;
  };

  // The redirect URL can live in a couple of places depending on which
  // offer category Synchrony returned — check both.
  const redirectUrl =
    json.paylaterRedirectionUrl ?? json.paylaterInfo?.paylaterRedirectionUrl;

  if (!redirectUrl) {
    throw new Error(
      `[synchrony] no redirect URL in response (decision: ${
        json.decisionMessage ?? "unknown"
      })`,
    );
  }

  return { redirectUrl, applicationRefId };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[synchrony] missing env var ${name}`);
  }
  return value;
}

function buildApplicationRefId(quoteId: string): string {
  // Strip non-allowed chars, pad with timestamp to hit the 16-char min.
  const cleanQuote = quoteId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24);
  const ts = Date.now().toString(36);
  const raw = `${cleanQuote}.${ts}`;
  // Cap at 40 chars to satisfy the API constraint.
  return raw.length <= 40 ? raw : raw.slice(0, 40);
}

function formatAmount(amount: number): string {
  // Synchrony expects up to 12 digits + 2 decimals as a string.
  return amount.toFixed(2);
}
