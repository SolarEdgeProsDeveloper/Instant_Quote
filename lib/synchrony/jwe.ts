/**
 * JWE encryption helper for Synchrony API request bodies.
 *
 * Synchrony's app config has `jwe_jwk_only: true`, meaning sensitive
 * request bodies (anything with `cipher.*` fields like SSN/DOB/etc.)
 * must be JWE-encrypted to the public key registered with Synchrony.
 * Synchrony decrypts on their side using the matching private key they
 * derived from our uploaded public key.
 *
 * We do the inverse for responses Synchrony encrypts back to us: decrypt
 * with our private key.
 *
 * Algorithms used:
 *   - Key wrap: RSA-OAEP-256 (industry standard for RSA keys)
 *   - Content encryption: A256GCM (authenticated, fast)
 */
import "server-only";
import {
  CompactEncrypt,
  compactDecrypt,
  importPKCS8,
  importSPKI,
} from "jose";

// jose v6 returns CryptoKey from imports; older "SynchronyKey" alias was dropped.
type SynchronyKey = CryptoKey;

let cachedPrivate: SynchronyKey | null = null;
let cachedPublic: SynchronyKey | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[synchrony jwe] missing env var ${name}`);
  }
  return value;
}

/**
 * Loads our private key from env (PEM PKCS8). Newlines may be escaped as
 * literal "\n" in env vars (Vercel default) — we restore them here.
 */
async function getPrivateKey(): Promise<SynchronyKey> {
  if (cachedPrivate) return cachedPrivate;
  const pem = requireEnv("SYNCHRONY_JWE_PRIVATE_KEY").replace(/\\n/g, "\n");
  cachedPrivate = (await importPKCS8(pem, "RSA-OAEP-256")) as SynchronyKey;
  return cachedPrivate;
}

/**
 * For encrypting OUTGOING request bodies to Synchrony, we use Synchrony's
 * public key. Synchrony publishes their public key endpoint somewhere in
 * the portal; for now we accept it via env var (paste the PEM SPKI block
 * from the portal). If not set, falls back to encrypting with our own
 * public key (useful for local round-trip testing).
 */
async function getEncryptionKey(): Promise<SynchronyKey> {
  if (cachedPublic) return cachedPublic;
  // If Synchrony's published public key is configured, use that.
  // Otherwise fall back to our own public key derived from the private one
  // (only meaningful for local "encrypt-then-decrypt" testing).
  const syfPem = process.env.SYNCHRONY_JWE_SYF_PUBLIC_KEY?.replace(
    /\\n/g,
    "\n",
  );
  if (syfPem) {
    cachedPublic = (await importSPKI(syfPem, "RSA-OAEP-256")) as SynchronyKey;
    return cachedPublic;
  }
  throw new Error(
    "[synchrony jwe] SYNCHRONY_JWE_SYF_PUBLIC_KEY not set — Synchrony's public key is required to encrypt request bodies",
  );
}

/**
 * Encrypts a JSON payload as a JWE compact serialization string ready to
 * send as the Synchrony API request body when the API expects encrypted
 * payloads. Includes our key ID in the `kid` header so Synchrony can
 * look up which key to decrypt with.
 */
export async function encryptForSynchrony(payload: unknown): Promise<string> {
  const key = await getEncryptionKey();
  const kid = requireEnv("SYNCHRONY_JWE_KEY_ID");
  const json = JSON.stringify(payload);
  return new CompactEncrypt(new TextEncoder().encode(json))
    .setProtectedHeader({
      alg: "RSA-OAEP-256",
      enc: "A256GCM",
      kid,
      typ: "JWE",
    })
    .encrypt(key);
}

/**
 * Decrypts a JWE compact string received from Synchrony (e.g. response
 * bodies or webhook payloads) using our private key.
 */
export async function decryptFromSynchrony<T = unknown>(
  jwe: string,
): Promise<T> {
  const key = await getPrivateKey();
  const { plaintext } = await compactDecrypt(jwe, key);
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}
