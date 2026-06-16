"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notifyFinancingInquiry } from "@/lib/notifications";

export type FinancingProvider = "synchrony" | "sungage";

const PROVIDER_LABELS: Record<FinancingProvider, string> = {
  synchrony: "Synchrony",
  sungage: "Sungage",
};

/**
 * Captures a customer's intent to finance their estimate via a third-party
 * lender (Synchrony or Sungage). No PII collection, no SSN, no API calls —
 * we just email the sales team with the quote details so they can reach
 * out and walk the customer through the lender's own application.
 *
 * The customer is already authenticated by the time they see Pay-now (the
 * questions flow is gated), so we have their email. We pass the quote id
 * so the email links straight to the invoice the sales rep needs to see.
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
