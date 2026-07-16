import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signAccessToken, generateRefreshToken, hashToken, refreshExpiry, ACCESS_TTL_SECONDS } from '@/lib/mobileAuth';
import { rateLimit } from '@/lib/rateLimit';
import { CORS_HEADERS } from '@/lib/cors';

export const runtime = 'nodejs';

/**
 * POST /api/mobile/auth/refresh
 * Exchange a refresh token for a new access + refresh pair (rotation). Re-reads
 * the user's live role/status (revocation parity). If an already-rotated token is
 * presented (reuse), the whole device chain is revoked as a theft response.
 */
export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!rateLimit(`mrefresh:ip:${ip}`, 60, 5 * 60 * 1000).ok) {
    return NextResponse.json({ error: 'Too many attempts' }, { status: 429, headers: CORS_HEADERS });
  }

  const body = await req.json().catch(() => ({}));
  const raw = typeof body.refreshToken === 'string' ? body.refreshToken : '';
  if (!raw) return NextResponse.json({ error: 'refreshToken required' }, { status: 400, headers: CORS_HEADERS });

  const existing = await prisma.mobileRefreshToken.findUnique({
    where: { tokenHash: hashToken(raw) },
    include: { user: { select: { id: true, role: true, status: true, companyId: true } } },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401, headers: CORS_HEADERS });
  }

  // Reuse of an already-rotated/revoked token → likely theft: revoke everything.
  if (existing.revokedAt) {
    await prisma.mobileRefreshToken.updateMany({
      where: { userId: existing.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return NextResponse.json({ error: 'Token reuse detected, all sessions revoked' }, { status: 401, headers: CORS_HEADERS });
  }

  if (existing.expiresAt < new Date() || !existing.user || existing.user.status === 'INACTIVE') {
    await prisma.mobileRefreshToken.update({ where: { id: existing.id }, data: { revokedAt: new Date() } });
    return NextResponse.json({ error: 'Session expired' }, { status: 401, headers: CORS_HEADERS });
  }

  const u = existing.user;
  const { raw: newRaw, hash: newHash } = generateRefreshToken();
  await prisma.$transaction([
    prisma.mobileRefreshToken.update({ where: { id: existing.id }, data: { revokedAt: new Date(), lastUsedAt: new Date() } }),
    prisma.mobileRefreshToken.create({
      data: { userId: u.id, deviceId: existing.deviceId, deviceName: existing.deviceName, tokenHash: newHash, expiresAt: refreshExpiry(), lastUsedAt: new Date() },
    }),
  ]);

  const accessToken = await signAccessToken({ sub: u.id, role: u.role, status: u.status, companyId: u.companyId, deviceId: existing.deviceId });
  return NextResponse.json({ accessToken, refreshToken: newRaw, expiresIn: ACCESS_TTL_SECONDS }, { headers: CORS_HEADERS });
}
