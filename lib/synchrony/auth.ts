/**
 * Synchrony OAuth2 client-credentials flow.
 *
 * Synchrony's API gateway protects every endpoint behind a Bearer token.
 * Tokens are short-lived (~1 hour) so we cache them in module state and
 * refresh ~5 min before expiry. In Vercel's serverless environment the
 * cache lives only for the lifetime of a warm function instance — cold
 * starts pay one extra token fetch, which is acceptable.
 *
 * Docs: developer.syf.com → "The Client Credentials Grant".
 */
import "server-only";
import { Buffer } from "node:buffer";

type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: string;
  status?: string;
};

type CachedToken = {
  accessToken: string;
  expiresAtMs: number;
};

let cached: CachedToken | null = null;
let inFlight: Promise<string> | null = null;

const REFRESH_WINDOW_MS = 5 * 60 * 1000;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[synchrony] missing env var ${name} — see .env.local.example`,
    );
  }
  return value;
}

async function fetchNewToken(): Promise<string> {
  const oauthUrl = requireEnv("SYNCHRONY_OAUTH_URL");
  const clientId = requireEnv("SYNCHRONY_CLIENT_ID");
  const clientSecret = requireEnv("SYNCHRONY_CLIENT_SECRET");

  // HTTP Basic Auth keeps the secret out of the request body (slightly safer
  // against accidental request logging compared to form-body credentials).
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(oauthUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `[synchrony] token fetch failed: ${res.status} ${res.statusText}${
        text ? ` — ${text.slice(0, 200)}` : ""
      }`,
    );
  }

  const json = (await res.json()) as TokenResponse;
  if (!json.access_token) {
    throw new Error("[synchrony] token response missing access_token");
  }

  const expiresInSec = Number(json.expires_in);
  const expiresAtMs =
    Date.now() + (Number.isFinite(expiresInSec) ? expiresInSec : 3599) * 1000;

  cached = { accessToken: json.access_token, expiresAtMs };
  return json.access_token;
}

/**
 * Returns a valid Synchrony access token. Caches in-memory until 5 min
 * before expiry. Safe to call concurrently — overlapping callers share
 * one in-flight fetch instead of stampeding the token endpoint.
 */
export async function getSynchronyAccessToken(): Promise<string> {
  if (cached && cached.expiresAtMs - Date.now() > REFRESH_WINDOW_MS) {
    return cached.accessToken;
  }
  if (inFlight) return inFlight;

  inFlight = fetchNewToken().finally(() => {
    inFlight = null;
  });
  return inFlight;
}
