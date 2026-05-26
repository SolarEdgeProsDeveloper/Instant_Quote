/**
 * lib/email.ts
 *
 * Thin email abstraction. Same pattern as the invoice-generator app:
 * tries SMTP first (Nodemailer), falls back to Resend HTTP API.
 *
 * Required env vars (pick one provider):
 *   SMTP:   SMTP_HOST, SMTP_USER, SMTP_PASS
 *   Resend: RESEND_API_KEY
 *
 * Optional env vars:
 *   SMTP_PORT   — defaults to 587 (TLS)
 *   SMTP_SECURE — set to "true" for implicit TLS on port 465
 *   EMAIL_FROM  — displayed From address (falls back to SMTP_USER)
 */

import nodemailer from "nodemailer";

export type EmailRecipient = { email: string; name?: string };

function getFromAddress() {
  return (
    process.env.EMAIL_FROM ||
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    process.env.RESEND_FROM_EMAIL ||
    "noreply@instantquote.app"
  );
}

function hasSmtpConfig() {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
  );
}

function hasResendConfig() {
  return Boolean(process.env.RESEND_API_KEY);
}

async function sendWithSmtp(args: {
  to: EmailRecipient[];
  subject: string;
  html: string;
}) {
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const info = await transport.sendMail({
    from: getFromAddress(),
    to: args.to
      .map((r) => (r.name ? `${r.name} <${r.email}>` : r.email))
      .join(", "),
    subject: args.subject,
    html: args.html,
  });

  return {
    ok: true,
    id: info.messageId || null,
    provider: "smtp" as const,
  };
}

async function sendWithResend(args: {
  to: EmailRecipient[];
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY!;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: getFromAddress(),
      to: args.to.map((r) => (r.name ? `${r.name} <${r.email}>` : r.email)),
      subject: args.subject,
      html: args.html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend send failed: ${text}`);
  }

  const json = (await res.json()) as { id?: string };
  return {
    ok: true,
    id: json.id || null,
    provider: "resend" as const,
  };
}

export async function sendEmail(args: {
  to: EmailRecipient[];
  subject: string;
  html: string;
}) {
  if (hasSmtpConfig()) return sendWithSmtp(args);
  if (hasResendConfig()) return sendWithResend(args);
  throw new Error(
    "No email provider configured. Set SMTP_HOST/SMTP_USER/SMTP_PASS or RESEND_API_KEY.",
  );
}
