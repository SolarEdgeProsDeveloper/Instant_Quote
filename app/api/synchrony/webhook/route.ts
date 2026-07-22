/**
 * Webhook receiver for Synchrony Multi Product Prequalification updates.
 *
 * Synchrony POSTs here whenever a customer's application status changes
 * (approved, declined, queued, etc.). The body MAY be JWE-encrypted
 * depending on portal config — we detect and decrypt if so.
 *
 * We persist the decision back to the `quotes` row keyed by the
 * `applicationRefId` we generated when starting the application. The
 * return page (`/quote/financing/return`) polls that row to render the
 * approval UI when the customer comes back to our app.
 *
 * IMPORTANT: this route URL must match the "Callback URL" configured on
 * your Synchrony developer portal app
 * (https://instant-quote-rho.vercel.app/api/synchrony/webhook).
 */
import { NextResponse } from "next/server";
import { decryptFromSynchrony } from "@/lib/synchrony/jwe";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type SynchronyWebhookPayload = {
  applicationRefId?: string;
  applicationId?: string;
  decisionCode?: string;
  decisionMessage?: string;
  reasonCode?: string;
  paylaterInfo?: unknown;
  revolvingInfo?: unknown;
  accountInfo?: unknown;
};

export async function POST(request: Request) {
  let payload: SynchronyWebhookPayload;
  try {
    const raw = await request.text();
    // If the body looks like a JWE (5 dot-separated base64url parts)
    // decrypt with our private key. Otherwise parse as plain JSON.
    if (looksLikeJwe(raw)) {
      payload = await decryptFromSynchrony<SynchronyWebhookPayload>(raw);
    } else {
      payload = JSON.parse(raw);
    }
  } catch (err) {
    console.error("[synchrony webhook] failed to parse body:", err);
    return NextResponse.json(
      { ok: false, error: "invalid body" },
      { status: 400 },
    );
  }

  const ref = payload.applicationRefId;
  if (!ref) {
    console.warn(
      "[synchrony webhook] no applicationRefId — cannot correlate to quote",
    );
    return NextResponse.json({ ok: true });
  }

  // Persist the decision back to the quote so the return page can show it.
  // Stored in a free-form `financing` JSONB column on the existing `quotes`
  // row (NOT on a new table) to avoid a schema migration for v1.
  try {
    const admin = getSupabaseAdminClient();
    const { error } = await admin
      .from("quotes")
      .update({
        financing: {
          provider: "synchrony",
          applicationRefId: ref,
          applicationId: payload.applicationId ?? null,
          decisionCode: payload.decisionCode ?? null,
          decisionMessage: payload.decisionMessage ?? null,
          reasonCode: payload.reasonCode ?? null,
          updatedAt: new Date().toISOString(),
        },
      })
      .eq("financing->>applicationRefId", ref);

    if (error) {
      console.error("[synchrony webhook] supabase update failed:", error);
      // Don't 500 — Synchrony retries 5xx, and we don't want to spam
      // ourselves on transient DB blips. Log and accept.
    }
  } catch (err) {
    console.error("[synchrony webhook] unexpected:", err);
  }

  return NextResponse.json({ ok: true });
}

function looksLikeJwe(raw: string): boolean {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) return false;
  return trimmed.split(".").length === 5;
}
