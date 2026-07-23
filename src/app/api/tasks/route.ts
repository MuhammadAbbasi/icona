import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser } from '@/lib/apiAuth';
import { z } from 'zod';

import { recalculateProjectProgress } from '@/lib/progress';

const schema = z.object({
  domainId:    z.string().min(1),
  title:       z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  status:      z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED']).default('TODO'),
  priority:    z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  dueDate:     z.string().optional().nullable(),
  assigneeId:  z.string().optional().nullable(),
  unit:        z.string().optional().nullable(),
  quantity:    z.number().optional().nullable(),
  rate:        z.number().optional().nullable(),
  unitRate:    z.number().optional().nullable(),
});

export async function POST(req: Request) {
  const user = await getApiUser(req);
  if (!user || !['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { domainId, title, description, status, priority, dueDate, assigneeId, unit, quantity, rate, unitRate } = parsed.data;

  // Guard against stale session IDs (e.g. after a DB reset during dev)
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } });
  if (!dbUser) {
    return NextResponse.json({ error: 'Session expired. Please sign out and sign in again.' }, { status: 401 });
  }

  const task = await prisma.task.create({
    data: {
      domainId,
      title:       title.trim(),
      description: description?.trim() || null,
      status,
      priority,
      dueDate:     dueDate ? new Date(dueDate) : null,
      assigneeId:  assigneeId || null,
      creatorId:   dbUser.id,
      unit:        unit?.trim() || null,
      quantity:    quantity ?? null,
      rate:        rate ?? unitRate ?? null,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      subtasks: true,
      domain: { select: { projectId: true } },
    },
  });

  if (task.domain?.projectId) {
    await recalculateProjectProgress(task.domain.projectId);
  }

  return NextResponse.json(task, { status: 201 });
}
