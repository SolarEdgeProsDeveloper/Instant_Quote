import { sendEmail, type EmailRecipient } from "./email";
import { getSupabaseAdminClient } from "./supabase/admin";
import type { CartProduct } from "@/app/actions/quote";

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
  userEmail: string | null;
  products: CartProduct[];
  totalMin: number;
}): Promise<void> {
  const to = await fetchAdminRecipients();
  if (to.length === 0) {
    console.warn(
      "[notify] no recipients in notification_recipients — skipping invoice email",
    );
    return;
  }

  const shortId = args.quoteId.replace(/-/g, "").slice(0, 8).toUpperCase();

  const rows = args.products
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

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; color: #0f172a; max-width: 640px;">
      <h2 style="margin: 0 0 6px;">New Instant Quote estimate</h2>
      <p style="margin: 0 0 16px; color: #475569;">
        ${args.userEmail ? escapeHtml(args.userEmail) : "A user"} just submitted estimate <strong>#${shortId}</strong>.
      </p>

      <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="text-align: left; padding: 8px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569;">Item</th>
            <th style="text-align: left; padding: 8px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569;">Service</th>
            <th style="text-align: right; padding: 8px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569;">Qty</th>
            <th style="text-align: right; padding: 8px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding: 12px; border-top: 2px solid #0f172a; text-align: right; font-weight: 700;">Total</td>
            <td style="padding: 12px; border-top: 2px solid #0f172a; text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; font-size: 16px;">${fmtPrice(args.totalMin)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;

  try {
    await sendEmail({
      to,
      subject: `New estimate #${shortId} from ${args.userEmail ?? "a user"}`,
      html,
    });
  } catch (err) {
    console.error("[notify] invoice email failed:", err);
  }
}
