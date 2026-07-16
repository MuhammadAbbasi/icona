import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser } from '@/lib/apiAuth';
import { CORS_HEADERS } from '@/lib/cors';

export const runtime = 'nodejs';

/**
 * GET /api/mobile/auth/sessions
 * List the caller's active device sessions (for a "manage devices" screen).
 */
export async function GET(req: Request) {
  const user = await getApiUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });

  const sessions = await prisma.mobileRefreshToken.findMany({
    where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true, deviceId: true, deviceName: true, createdAt: true, lastUsedAt: true },
    orderBy: { lastUsedAt: 'desc' },
  });

  return NextResponse.json({ sessions }, { headers: CORS_HEADERS });
}
