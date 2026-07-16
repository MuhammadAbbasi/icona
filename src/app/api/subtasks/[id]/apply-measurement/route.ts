import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser } from '@/lib/apiAuth';
import { recalculateProjectProgress } from '@/lib/progress';

export const runtime = 'nodejs';

/**
 * POST /api/subtasks/[id]/apply-measurement
 * Writes the subtask's summed measurement quantity into the project's LATEST BOQ
 * revision (creating "Rev 1" if none exists yet). The original R0 quantity is
 * never touched. ADMIN / MANAGER only.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser(req);
  if (!['ADMIN', 'MANAGER'].includes(user?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const subtask = await prisma.subtask.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      measurements: { select: { computed: true } },
      task: { select: { domain: { select: { projectId: true } } } },
    },
  });
  if (!subtask) return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });

  const projectId = subtask.task?.domain?.projectId;
  if (!projectId) return NextResponse.json({ error: 'Project not found for subtask' }, { status: 404 });

  if (!subtask.measurements.length) {
    return NextResponse.json({ error: 'No measurements to apply' }, { status: 400 });
  }
  const measured = Math.round(subtask.measurements.reduce((a, m) => a + (m.computed ?? 0), 0) * 1000) / 1000;

  // Use the latest revision round, or open "Rev 1" if the project has none.
  let revision = await prisma.boqRevision.findFirst({
    where: { projectId },
    orderBy: { index: 'desc' },
    select: { id: true, index: true },
  });
  if (!revision) {
    revision = await prisma.boqRevision.create({
      data: { projectId, index: 1, label: 'Rev 1', createdById: user!.id },
      select: { id: true, index: true },
    });
  }

  await prisma.subtaskQuantityRevision.upsert({
    where: { revisionId_subtaskId: { revisionId: revision.id, subtaskId: subtask.id } },
    create: { revisionId: revision.id, revisionIndex: revision.index, subtaskId: subtask.id, quantity: measured },
    update: { quantity: measured, revisionIndex: revision.index },
  });

  await recalculateProjectProgress(projectId);

  return NextResponse.json({ ok: true, revisionIndex: revision.index, quantity: measured });
}
