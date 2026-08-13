/**
 * Stateless, signed session tokens (HMAC-SHA256 via Web Crypto — works
 * identically in Node and Edge runtimes, so this file is safe to import
 * from middleware). No server-side session store: the token itself carries
 * the payload, so "log out" just discards the cookie. The tradeoff is that
 * disabling a user isn't instantly revoked mid-token-lifetime — `getCurrentUser`
 * (Node-only, DB-backed) re-checks `isActive` on every full page load, so a
 * disabled user is kicked out on their next navigation even though a raw
 * token isn't cryptographically revocable early.
 */

export const SESSION_COOKIE = "hgs_session";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export interface SessionPayload {
  userId: string;
  role: "ADMIN" | "STAFF";
  name: string;
  exp: number; // unix seconds
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(str: string): Uint8Array<ArrayBuffer> {
  const padded = str + "=".repeat((4 - (str.length % 4)) % 4);
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getKey(): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET ?? "dev-insecure-session-secret-change-me";
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  const key = await getKey();
  const body = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return `${body}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken(
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const key = await getKey();
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlToBytes(signature),
    encoder.encode(body),
  );
  if (!valid) return null;

  try {
    const payload = JSON.parse(decoder.decode(base64UrlToBytes(body))) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
