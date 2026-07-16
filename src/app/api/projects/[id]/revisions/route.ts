import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser } from '@/lib/apiAuth';

export const runtime = 'nodejs';

/**
 * POST /api/projects/[id]/revisions
 * Open the next BOQ revision round (variation order) for a project. The new
 * round becomes the only editable one; earlier rounds are frozen baselines.
 * ADMIN / MANAGER only.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser(req);
  if (!user || !['ADMIN', 'MANAGER'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  const last = await prisma.boqRevision.findFirst({
    where: { projectId: project.id },
    orderBy: { index: 'desc' },
    select: { index: true },
  });
  const index = (last?.index ?? 0) + 1;
  const label = typeof body.label === 'string' && body.label.trim() ? body.label.trim() : `Rev ${index}`;
  const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null;

  const revision = await prisma.boqRevision.create({
    data: { projectId: project.id, index, label, note, createdById: user.id },
    select: { id: true, index: true, label: true, note: true, createdAt: true },
  });

  return NextResponse.json(revision, { status: 201 });
}
