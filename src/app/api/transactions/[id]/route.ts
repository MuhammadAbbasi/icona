import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser } from '@/lib/apiAuth';
import { CORS_HEADERS } from '@/lib/cors';

export const runtime = 'nodejs';

/** DELETE — remove a ledger entry. ADMIN only (matches the web). */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser(req);
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: CORS_HEADERS });
  }

  const txn = await prisma.transaction.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!txn) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: CORS_HEADERS });

  await prisma.transaction.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
}
