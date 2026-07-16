import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser } from '@/lib/apiAuth';
import { CORS_HEADERS } from '@/lib/cors';
import { workValue } from '@/lib/utils';

export const runtime = 'nodejs';

/**
 * GET /api/mobile/projects
 * Lightweight, role-scoped list of the bearer user's projects for the app
 * dashboard. Scoping mirrors the web's access rules:
 *   - ADMIN / MANAGER : every project
 *   - EMPLOYEE        : projects they are engaged on OR have an assigned task in
 *   - CLIENT          : projects belonging to their own company
 * Returns only the fields a project card needs (no BOQ tree — that is fetched
 * lazily per project via /api/mobile/projects/[id]/hierarchy).
 */
export async function GET(req: Request) {
  const user = await getApiUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });

  let where: any = { deletedAt: null };
  if (user.role === 'CLIENT') {
    where = { deletedAt: null, company: { users: { some: { id: user.id } } } };
  } else if (user.role === 'EMPLOYEE') {
    where = {
      deletedAt: null,
      OR: [
        { engagedUsers: { some: { id: user.id } } },
        { domains: { some: { tasks: { some: { assigneeId: user.id } } } } },
      ],
    };
  } // ADMIN / MANAGER fall through to { deletedAt: null }

  const projects = await prisma.project.findMany({
    where,
    include: {
      company: { select: { id: true, name: true } },
      ownerCompany: { select: { id: true, name: true } },
      domains: {
        include: {
          tasks: {
            select: {
              status: true,
              subtasks: { select: { completed: true, quantity: true, rate: true } },
            },
          },
        },
      },
      transactions: {
        select: { type: true, amount: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const items = projects.map((p) => {
    const allTasks = p.domains.flatMap((d) => d.tasks);
    const doneTasks = allTasks.filter((t) => t.status === 'DONE').length;
    const value = workValue(allTasks);
    const incomeTransactions = p.transactions.filter((t) => t.type === 'INCOME');
    const received = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);

    return {
      id: p.id,
      name: p.name,
      status: p.status,
      priority: p.priority,
      progress: p.progress,
      startDate: p.startDate,
      endDate: p.endDate,
      updatedAt: p.updatedAt,
      budget: p.budget,
      company: p.company,
      ownerCompany: p.ownerCompany,
      domainCount: p.domains.length,
      totalTasks: allTasks.length,
      doneTasks: doneTasks,
      workValue: value,
      received: received,
    };
  });

  return NextResponse.json({ projects: items }, { headers: CORS_HEADERS });
}
