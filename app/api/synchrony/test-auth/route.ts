/**
 * Connectivity + env var check for the Synchrony integration. Visit this
 * URL in dev (or curl it) to confirm SYNCHRONY_* env vars are loaded and
 * the staging gateway accepts our OAuth credentials.
 *
 * GET /api/synchrony/test-auth
 *   → 200 { ok: true, tokenPreview, env } on success
 *   → 500 { ok: false, error, env }       on failure
 *
 * Delete this route before going to production — it's a debug helper.
 */
import { NextResponse } from "next/server";
import { getSynchronyAccessToken } from "@/lib/synchrony/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  // Build the env snapshot first so it's returned even on failure.
  const env = {
    oauthUrl: process.env.SYNCHRONY_OAUTH_URL,
    apiBaseUrl: process.env.SYNCHRONY_API_BASE_URL,
    clientIdSet: Boolean(process.env.SYNCHRONY_CLIENT_ID),
    clientSecretSet: Boolean(process.env.SYNCHRONY_CLIENT_SECRET),
    merchantNumberSet: Boolean(process.env.SYNCHRONY_MERCHANT_NUMBER),
    jweKeyIdSet: Boolean(process.env.SYNCHRONY_JWE_KEY_ID),
    jwePrivateKeySet: Boolean(process.env.SYNCHRONY_JWE_PRIVATE_KEY),
    jweSyfPublicKeySet: Boolean(process.env.SYNCHRONY_JWE_SYF_PUBLIC_KEY),
  };

  try {
    const token = await getSynchronyAccessToken();
    const preview = `${token.slice(0, 6)}…${token.slice(-6)}`;
    return NextResponse.json({ ok: true, tokenPreview: preview, env });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[synchrony/test-auth] failed:", err);
    return NextResponse.json(
      { ok: false, error: message, env },
      { status: 500 },
    );
  }
}
