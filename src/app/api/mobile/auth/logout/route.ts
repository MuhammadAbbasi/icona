import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashToken } from '@/lib/mobileAuth';
import { CORS_HEADERS } from '@/lib/cors';

export const runtime = 'nodejs';

/**
 * POST /api/mobile/auth/logout
 * Revoke the presented refresh token (this device's session). Public: it only
 * needs the refresh token, and always returns ok so logout cannot be probed.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const raw = typeof body.refreshToken === 'string' ? body.refreshToken : '';
  if (raw) {
    await prisma.mobileRefreshToken.updateMany({
      where: { tokenHash: hashToken(raw), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
}
