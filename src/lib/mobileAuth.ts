// Mobile (Android app) token helpers. Self-contained HS256 JWT sign/verify using
// Node's built-in crypto (no extra dependency), plus opaque refresh-token
// generation and hashing. The web app keeps its NextAuth cookie session; this is
// the parallel bearer path used only by the native app.
//
// Signing secret resolution (in order):
//   1. MOBILE_JWT_SECRET env var, if set (takes precedence — best practice).
//   2. A value persisted in the SystemSetting table.
//   3. Otherwise one is generated once and persisted, so it is stable across
//      restarts/deploys with zero configuration.

import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';

export const ACCESS_TTL_SECONDS = 10 * 60;      // short-lived access token
export const REFRESH_TTL_DAYS = 30;             // rotating refresh token lifetime

const MOBILE_SECRET_KEY = 'mobile_jwt_secret';

let cachedSecret: string | null = null;
let resolving: Promise<string> | null = null;

/** Resolve the stable signing secret (env > persisted > generated-and-persisted). */
async function getMobileSecret(): Promise<string> {
  if (process.env.MOBILE_JWT_SECRET) return process.env.MOBILE_JWT_SECRET;
  if (cachedSecret) return cachedSecret;
  if (resolving) return resolving;

  resolving = (async () => {
    const existing = await prisma.systemSetting.findUnique({ where: { key: MOBILE_SECRET_KEY } });
    if (existing?.value) return existing.value;
    const generated = crypto.randomBytes(48).toString('base64url');
    // upsert with an empty update so a racing request that created it first wins
    // (we keep whatever value is already stored rather than overwriting).
    const row = await prisma.systemSetting.upsert({
      where: { key: MOBILE_SECRET_KEY },
      create: { key: MOBILE_SECRET_KEY, value: generated },
      update: {},
    });
    return row.value;
  })();

  try {
    cachedSecret = await resolving;
    return cachedSecret;
  } finally {
    resolving = null;
  }
}

export interface AccessClaims {
  sub: string;            // user id
  role: string;
  status: string;
  companyId?: string | null;
  deviceId: string;
}

interface SignedPayload extends AccessClaims {
  type: 'access';
  iat: number;
  exp: number;
}

export async function signAccessToken(claims: AccessClaims, ttl = ACCESS_TTL_SECONDS): Promise<string> {
  const s = await getMobileSecret();
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload: SignedPayload = { ...claims, type: 'access', iat: now, exp: now + ttl };
  const data = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const sig = crypto.createHmac('sha256', s).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export async function verifyAccessToken(token: string): Promise<SignedPayload | null> {
  try {
    const s = await getMobileSecret();
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const data = `${parts[0]}.${parts[1]}`;
    const expected = crypto.createHmac('sha256', s).update(data).digest('base64url');
    const a = Buffer.from(parts[2]);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as SignedPayload;
    if (payload.type !== 'access') return null;
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** A fresh opaque refresh token plus the sha-256 hash we persist (never the raw). */
export function generateRefreshToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString('base64url');
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function refreshExpiry(): Date {
  return new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
}

function b64url(input: string): string {
  return Buffer.from(input).toString('base64url');
}
