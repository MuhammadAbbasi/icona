import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser } from '@/lib/apiAuth';
import { recalculateProjectProgress } from '@/lib/progress';

export const runtime = 'nodejs';

/**
 * DELETE /api/projects/[id]/revisions/[revId]
 * Undo a revision round. Only the latest round may be removed, so history stays
 * a clean ordered chain. Cascades to its line items. ADMIN / MANAGER only.
 */
export async function DELETE(req: Request, { params }: { params: { id: string; revId: string } }) {
  const user = await getApiUser(req);
  if (!user || !['ADMIN', 'MANAGER'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const revision = await prisma.boqRevision.findUnique({
    where: { id: params.revId },
    select: { id: true, index: true, projectId: true },
  });
  if (!revision || revision.projectId !== params.id) {
    return NextResponse.json({ error: 'Revision not found' }, { status: 404 });
  }

  const last = await prisma.boqRevision.findFirst({
    where: { projectId: params.id },
    orderBy: { index: 'desc' },
    select: { id: true },
  });
  if (last?.id !== revision.id) {
    return NextResponse.json({ error: 'Only the latest revision can be removed' }, { status: 409 });
  }

  await prisma.boqRevision.delete({ where: { id: revision.id } });
  await recalculateProjectProgress(params.id);

  return NextResponse.json({ ok: true });
}
