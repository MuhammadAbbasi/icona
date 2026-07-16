import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';
import { signAccessToken, generateRefreshToken, refreshExpiry, ACCESS_TTL_SECONDS } from '@/lib/mobileAuth';
import { rateLimit, rateLimitReset } from '@/lib/rateLimit';
import { CORS_HEADERS } from '@/lib/cors';

export const runtime = 'nodejs';

/**
 * POST /api/mobile/auth/login
 * Native app login. Verifies credentials (same bcrypt check as the web), then
 * issues a short-lived access JWT + an opaque, device-bound refresh token (only
 * its hash is stored). Rate limited per IP and per account.
 */
export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const deviceId = typeof body.deviceId === 'string' && body.deviceId.trim() ? body.deviceId.trim() : '';
  const deviceName = typeof body.deviceName === 'string' ? body.deviceName.slice(0, 120) : null;

  if (!email || !password || !deviceId) {
    return NextResponse.json({ error: 'email, password and deviceId are required' }, { status: 400, headers: CORS_HEADERS });
  }

  const ipLimit = rateLimit(`mlogin:ip:${ip}`, 10, 5 * 60 * 1000);
  const acctLimit = rateLimit(`mlogin:acct:${email}`, 5, 15 * 60 * 1000);
  if (!ipLimit.ok || !acctLimit.ok) {
    const retry = Math.max(ipLimit.retryAfter, acctLimit.retryAfter);
    return NextResponse.json({ error: 'Too many attempts, please try again later' }, { status: 429, headers: { ...CORS_HEADERS, 'Retry-After': String(retry) } });
  }

  const user = await prisma.user.findUnique({ where: { email }, include: { company: true } });
  if (!user || user.status === 'INACTIVE' || !(await verifyPassword(password, user.password))) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401, headers: CORS_HEADERS });
  }

  rateLimitReset(`mlogin:acct:${email}`);

  // One active token per device: revoke any earlier ones for this device.
  await prisma.mobileRefreshToken.updateMany({
    where: { userId: user.id, deviceId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  const accessToken = await signAccessToken({ sub: user.id, role: user.role, status: user.status, companyId: user.companyId, deviceId });
  const { raw, hash } = generateRefreshToken();
  await prisma.mobileRefreshToken.create({
    data: { userId: user.id, deviceId, deviceName, tokenHash: hash, expiresAt: refreshExpiry(), lastUsedAt: new Date() },
  });

  return NextResponse.json({
    accessToken,
    refreshToken: raw,
    expiresIn: ACCESS_TTL_SECONDS,
    user: {
      id: user.id, name: user.name, email: user.email, role: user.role,
      companyId: user.companyId, companyName: user.company?.name ?? null,
    },
  }, { headers: CORS_HEADERS });
}
