import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser } from '@/lib/apiAuth';
import { recalculateProjectProgress } from '@/lib/progress';

export const runtime = 'nodejs';

type Ctx = { params: { id: string; revId: string; subtaskId: string } };

type Loaded =
  | { ok: true; revisionIndex: number; original: number }
  | { ok: false; status: number; error: string };

/**
 * Validate that the revision belongs to the project, is the latest (only the
 * latest round is editable), and that the subtask sits under the same project.
 */
async function load(params: Ctx['params']): Promise<Loaded> {
  const revision = await prisma.boqRevision.findUnique({
    where: { id: params.revId },
    select: { id: true, index: true, projectId: true },
  });
  if (!revision || revision.projectId !== params.id) {
    return { ok: false, status: 404, error: 'Revision not found' };
  }

  const last = await prisma.boqRevision.findFirst({
    where: { projectId: params.id },
    orderBy: { index: 'desc' },
    select: { id: true },
  });
  if (last?.id !== revision.id) {
    return { ok: false, status: 409, error: 'Only the latest revision is editable' };
  }

  const subtask = await prisma.subtask.findUnique({
    where: { id: params.subtaskId },
    select: { quantity: true, task: { select: { domain: { select: { projectId: true } } } } },
  });
  if (!subtask || subtask.task?.domain?.projectId !== params.id) {
    return { ok: false, status: 404, error: 'Subtask not found' };
  }

  return { ok: true, revisionIndex: revision.index, original: subtask.quantity ?? 0 };
}

/**
 * PUT /api/projects/[id]/revisions/[revId]/items/[subtaskId]
 * Upsert the new quantity (and optional revised rate) for one priced line in the
 * latest revision. A quantity below the original BOQ value requires an explicit
 * `approved: true` (the UI surfaces the approval popup). ADMIN / MANAGER only.
 */
export async function PUT(req: Request, { params }: Ctx) {
  const user = await getApiUser(req);
  if (!user || !['ADMIN', 'MANAGER'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const ctx = await load(params);
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const body = await req.json().catch(() => ({}));

  const quantity = Number(body.quantity);
  if (!Number.isFinite(quantity) || quantity < 0) {
    return NextResponse.json({ error: 'A valid, non-negative quantity is required' }, { status: 400 });
  }

  // A reduction below the original contracted quantity needs sign-off.
  if (quantity < ctx.original && body.approved !== true) {
    return NextResponse.json(
      { error: 'Quantity is below the original BOQ value and needs approval', requiresApproval: true, original: ctx.original, requested: quantity },
      { status: 409 },
    );
  }

  let rate: number | null = null;
  if (body.rate !== undefined && body.rate !== null && body.rate !== '') {
    const r = Number(body.rate);
    if (!Number.isFinite(r) || r < 0) {
      return NextResponse.json({ error: 'Revised rate must be a non-negative number' }, { status: 400 });
    }
    rate = r;
  }

  const item = await prisma.subtaskQuantityRevision.upsert({
    where: { revisionId_subtaskId: { revisionId: params.revId, subtaskId: params.subtaskId } },
    create: { revisionId: params.revId, subtaskId: params.subtaskId, revisionIndex: ctx.revisionIndex, quantity, rate },
    update: { quantity, rate, revisionIndex: ctx.revisionIndex },
    select: { id: true, revisionIndex: true, subtaskId: true, quantity: true, rate: true },
  });

  await recalculateProjectProgress(params.id);

  return NextResponse.json(item);
}

/**
 * DELETE /api/projects/[id]/revisions/[revId]/items/[subtaskId]
 * Revert a line in the latest revision back to its carried-forward value.
 */
export async function DELETE(req: Request, { params }: Ctx) {
  const user = await getApiUser(req);
  if (!user || !['ADMIN', 'MANAGER'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const ctx = await load(params);
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  await prisma.subtaskQuantityRevision.deleteMany({
    where: { revisionId: params.revId, subtaskId: params.subtaskId },
  });
  await recalculateProjectProgress(params.id);

  return NextResponse.json({ ok: true });
}
