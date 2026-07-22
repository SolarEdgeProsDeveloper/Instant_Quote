import { sendEmail, type EmailRecipient } from "./email";
import { getSupabaseAdminClient } from "./supabase/admin";
import type { Answers, CartProduct } from "@/app/actions/quote";
import {
  computeQuestionnaireCharges,
  totalQuestionnaireFee,
  type Question,
} from "./questions";
import { formatQuoteNumber } from "./quote-number";

/**
 * Pulls active notification recipients from the database. Returns an empty
 * array (and logs) on any failure so that notification errors never block
 * the user-facing flow.
 */
async function fetchAdminRecipients(): Promise<EmailRecipient[]> {
  try {
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin
      .from("notification_recipients")
      .select("email, name")
      .eq("enabled", true);

    if (error) {
      console.warn("[notify] fetching recipients failed:", error.message);
      return [];
    }

    return (data ?? [])
      .filter((r: { email?: string | null }) => Boolean(r.email))
      .map((r: { email: string; name?: string | null }) => ({
        email: r.email,
        name: r.name ?? undefined,
      }));
  } catch (err) {
    console.warn("[notify] admin client error:", err);
    return [];
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n === 0) return "$0";
  if (Number.isInteger(n)) return `$${n.toLocaleString("en-US")}`;
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function qtyOf(p: { quantity?: number }): number {
  const q = p.quantity ?? 1;
  return Number.isFinite(q) && q > 0 ? Math.floor(q) : 1;
}

/** Plain-text version of the user's answer for inclusion in HTML email. */
function summarizeAnswerForEmail(q: Question, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (q.type === "file") {
    const files = Array.isArray(value) ? value : [];
    if (files.length === 0) return "";
    return files.length === 1
      ? "1 file uploaded"
      : `${files.length} files uploaded`;
  }
  if (q.type === "multi-choice" && Array.isArray(value)) {
    return (value as string[]).join(", ");
  }
  if (q.type === "boolean") return value ? "Yes" : "No";
  const text = String(value).trim();
  return text.length > 200 ? `${text.slice(0, 197)}…` : text;
}

/**
 * Notify the admin email that a new user just signed up.
 * Silently no-ops if ADMIN_NOTIFY_EMAIL is unset (so missing config never
 * blocks the signup flow).
 */
export async function notifyNewSignup(userEmail: string): Promise<void> {
  const to = await fetchAdminRecipients();
  if (to.length === 0) {
    console.warn(
      "[notify] no recipients in notification_recipients — skipping signup email",
    );
    return;
  }

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; color: #0f172a;">
      <h2 style="margin: 0 0 12px;">New Instant Quote signup</h2>
      <p style="margin: 0 0 6px;">A new account was just created.</p>
      <table style="border-collapse: collapse; margin-top: 12px;">
        <tr>
          <td style="padding: 6px 12px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Email</td>
          <td style="padding: 6px 12px; font-weight: 600;">${escapeHtml(userEmail)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 12px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">When</td>
          <td style="padding: 6px 12px;">${new Date().toUTCString()}</td>
        </tr>
      </table>
    </div>
  `;

  try {
    await sendEmail({
      to,
      subject: `New Instant Quote signup: ${userEmail}`,
      html,
    });
  } catch (err) {
    console.error("[notify] signup email failed:", err);
  }
}

/**
 * Notify the admin email that a user just submitted an estimate / generated
 * an invoice. Silently no-ops if ADMIN_NOTIFY_EMAIL is unset.
 */
export async function notifyInvoiceSubmitted(args: {
  quoteId: string;
  quoteNumber: number;
  userEmail: string | null;
  products: CartProduct[];
  answers: Answers;
  totalMin: number;
}): Promise<void> {
  const to = await fetchAdminRecipients();
  if (to.length === 0) {
    console.warn(
      "[notify] no recipients in notification_recipients — skipping invoice email",
    );
    return;
  }

  const shortId = formatQuoteNumber(args.quoteNumber);

  // Reproduce the same breakdown the user sees on the invoice.
  const productsSubtotal = args.products.reduce(
    (s, p) => s + (p.minPrice ?? 0) * qtyOf(p),
    0,
  );
  const serviceNames = Array.from(
    new Set(args.products.map((p) => p.service)),
  );
  const charges = computeQuestionnaireCharges(serviceNames, args.answers);
  const questionnaireFee = totalQuestionnaireFee(charges);

  const productRows = args.products
    .map((p) => {
      const q = qtyOf(p);
      const lineTotal = (p.minPrice ?? 0) * q;
      return `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(p.name)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px;">${escapeHtml(p.service)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-variant-numeric: tabular-nums;">${q}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-variant-numeric: tabular-nums; font-weight: 600;">${fmtPrice(lineTotal)}</td>
        </tr>
      `;
    })
    .join("");

  const chargeRows = charges
    .map((c) => {
      const summary = summarizeAnswerForEmail(c.question, c.answer);
      return `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">
            <div>${escapeHtml(c.question.label)}</div>
            ${
              summary
                ? `<div style="margin-top: 2px; color: #64748b; font-size: 12px; font-style: italic;">Your answer: ${escapeHtml(summary)}</div>`
                : ""
            }
          </td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-variant-numeric: tabular-nums; font-weight: 600;">${fmtPrice(c.charge)}</td>
        </tr>
      `;
    })
    .join("");

  const breakdownRows =
    charges.length > 0
      ? `
        <tr>
          <td style="padding: 4px 12px; color: #475569;">Products subtotal</td>
          <td style="padding: 4px 12px; text-align: right; color: #475569; font-variant-numeric: tabular-nums;">${fmtPrice(productsSubtotal)}</td>
        </tr>
        <tr>
          <td style="padding: 4px 12px; color: #475569;">Questionnaire fees</td>
          <td style="padding: 4px 12px; text-align: right; color: #475569; font-variant-numeric: tabular-nums;">${fmtPrice(questionnaireFee)}</td>
        </tr>
      `
      : "";

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; color: #0f172a; max-width: 640px;">
      <h2 style="margin: 0 0 6px;">New Instant Quote estimate</h2>
      <p style="margin: 0 0 16px; color: #475569;">
        ${args.userEmail ? escapeHtml(args.userEmail) : "A user"} just submitted estimate <strong>${shortId}</strong>.
      </p>

      <h3 style="margin: 24px 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #475569;">Items</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="text-align: left; padding: 8px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569;">Item</th>
            <th style="text-align: left; padding: 8px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569;">Service</th>
            <th style="text-align: right; padding: 8px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569;">Qty</th>
            <th style="text-align: right; padding: 8px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569;">Amount</th>
          </tr>
        </thead>
        <tbody>${productRows}</tbody>
      </table>

      ${
        charges.length > 0
          ? `
        <h3 style="margin: 24px 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #475569;">Cost added by questionnaire</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="text-align: left; padding: 8px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569;">Question</th>
              <th style="text-align: right; padding: 8px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569;">Charge</th>
            </tr>
          </thead>
          <tbody>${chargeRows}</tbody>
        </table>
      `
          : ""
      }

      <table style="width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 13px;">
        ${breakdownRows}
        <tr>
          <td style="padding: 12px; border-top: 2px solid #0f172a; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Total</td>
          <td style="padding: 12px; border-top: 2px solid #0f172a; text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; font-size: 18px;">${fmtPrice(args.totalMin)}</td>
        </tr>
      </table>
    </div>
  `;

  try {
    await sendEmail({
      to,
      subject: `New estimate ${shortId} from ${args.userEmail ?? "a user"}`,
      html,
    });
  } catch (err) {
    console.error("[notify] invoice email failed:", err);
  }
}

/**
 * Heads-up to admins that a customer just opened a self-serve financing
 * application on the lender's site (they tapped "Finance with X" → we
 * redirected them to the lender's hosted apply page). Useful for sales
 * visibility — they didn't ask for a callback, but you can still reach
 * out proactively if the deal stalls. Silently no-ops if no recipients.
 */
export async function notifyFinancingInquiry(args: {
  provider: string;
  userEmail: string | null;
  quoteId: string;
  totalMin: number;
}): Promise<void> {
  const to = await fetchAdminRecipients();
  if (to.length === 0) {
    console.warn(
      "[notify] no recipients in notification_recipients — skipping financing email",
    );
    return;
  }

  const shortId = args.quoteId.replace(/-/g, "").slice(0, 8).toUpperCase();

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; color: #0f172a; max-width: 560px;">
      <h2 style="margin: 0 0 6px;">${escapeHtml(args.provider)} application started</h2>
      <p style="margin: 0 0 16px; color: #475569;">
        ${args.userEmail ? escapeHtml(args.userEmail) : "A customer"} just opened the
        <strong>${escapeHtml(args.provider)}</strong> application page for estimate
        <strong>#${shortId}</strong>. They're completing the application on the lender's site.
      </p>
      <table style="border-collapse: collapse; margin-top: 12px;">
        <tr>
          <td style="padding: 6px 12px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Lender</td>
          <td style="padding: 6px 12px; font-weight: 600;">${escapeHtml(args.provider)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 12px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Estimate</td>
          <td style="padding: 6px 12px; font-weight: 600;">#${shortId}</td>
        </tr>
        <tr>
          <td style="padding: 6px 12px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Amount</td>
          <td style="padding: 6px 12px; font-weight: 600;">${fmtPrice(args.totalMin)}</td>
        </tr>
        ${
          args.userEmail
            ? `<tr>
                <td style="padding: 6px 12px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Customer</td>
                <td style="padding: 6px 12px;">${escapeHtml(args.userEmail)}</td>
              </tr>`
            : ""
        }
        <tr>
          <td style="padding: 6px 12px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">When</td>
          <td style="padding: 6px 12px;">${new Date().toUTCString()}</td>
        </tr>
      </table>
      <p style="margin-top: 20px; font-size: 13px; color: #475569;">
        No action needed — ${escapeHtml(args.provider)} will reach out directly once they have a decision. Use this as a heads-up only.
      </p>
    </div>
  `;

  try {
    await sendEmail({
      to,
      subject: `${args.provider} application started — #${shortId} — ${args.userEmail ?? "a customer"}`,
      html,
    });
  } catch (err) {
    console.error("[notify] financing email failed:", err);
  }
}
