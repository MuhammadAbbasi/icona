import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser } from '@/lib/apiAuth';
import { CORS_HEADERS } from '@/lib/cors';

export const runtime = 'nodejs';

/**
 * DELETE /api/mobile/auth/sessions/[id]
 * Revoke one of the caller's device sessions ("sign out that device").
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });

  await prisma.mobileRefreshToken.updateMany({
    where: { id: params.id, userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
}
