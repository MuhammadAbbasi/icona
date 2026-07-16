import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser } from '@/lib/apiAuth';
import { getProjectScope } from '@/lib/projectAccess';

export async function GET(req: Request) {
  const user = await getApiUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const q   = url.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return NextResponse.json({ results: [] });
  if (q.length > 100) return NextResponse.json({ error: 'Query too long' }, { status: 400 });

  // Single source-of-truth scope — consistent with list, hierarchy, and export-boq.
  const projectScope = getProjectScope(user);

  const [projects, tasks, subtasks] = await Promise.all([
    // ── Projects ──────────────────────────────────────────────
    prisma.project.findMany({
      where: {
        AND: [
          projectScope,
          { OR: [{ name: { contains: q } }, { description: { contains: q } }] },
        ],
      },
      include: { company: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),

    // ── Tasks ─────────────────────────────────────────────────
    prisma.task.findMany({
      where: {
        AND: [
          { domain: { project: projectScope } },
          { OR: [{ title: { contains: q } }, { description: { contains: q } }] },
        ],
      },
      include: {
        domain: {
          select: {
            id: true, name: true,
            project: {
              select: {
                id: true, name: true,
                company: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),

    // ── Subtasks ──────────────────────────────────────────────
    prisma.subtask.findMany({
      where: {
        AND: [
          { task: { domain: { project: projectScope } } },
          {
            OR: [
              { title:        { contains: q } },
              { assigneeName: { contains: q } },
              { notes:        { contains: q } },
              { description:  { contains: q } },
            ],
          },
        ],
      },
      include: {
        task: {
          select: {
            id: true, title: true,
            domain: {
              select: {
                id: true, name: true,
                project: {
                  select: {
                    id: true, name: true,
                    company: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
  ]);

  const results = [
    // 1 — Projects
    ...projects.map((p) => ({
      type:       'project' as const,
      id:         p.id,
      title:      p.name,
      href:       `/projects/${p.id}`,
      breadcrumb: [p.company.name],
    })),

    // 2 — Tasks
    ...tasks.map((t) => ({
      type:       'task' as const,
      id:         t.id,
      title:      t.title,
      href:       `/projects/${t.domain.project.id}`,
      breadcrumb: [t.domain.project.company.name, t.domain.project.name, t.domain.name],
    })),

    // 3 — Subtasks
    ...subtasks.map((s) => ({
      type:       'subtask' as const,
      id:         s.id,
      title:      s.title,
      href:       `/projects/${s.task.domain.project.id}`,
      breadcrumb: [
        s.task.domain.project.company.name,
        s.task.domain.project.name,
        s.task.domain.name,
        s.task.title,
      ],
    })),
  ];

  return NextResponse.json({ results });
}
