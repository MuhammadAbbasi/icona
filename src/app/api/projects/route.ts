import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser } from '@/lib/apiAuth';
import { getProjectScope } from '@/lib/projectAccess';
import { findBoqTemplate } from '@/lib/templates';
import { resolvePlanTier, checkLimit } from '@/lib/entitlements';

export async function POST(req: Request) {
  const user = await getApiUser(req);
  if (!user || !['ADMIN', 'MANAGER'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, description, companyId, ownerCompanyId, status, priority, startDate, endDate, budget, currency, domains } = body;

    if (!name?.trim() || !companyId) {
      return NextResponse.json({ error: 'Name and companyId are required' }, { status: 400 });
    }

    // Entitlement gate (SaaS): refuse BEFORE creating if the tenant's plan is at
    // its project limit. No-op for the existing single-tenant instance (no plan).
    // TODO(T-106): resolve from the session's org planId; TODO(T-103): scope the count to the org.
    const tier = resolvePlanTier((user as { orgPlanId?: string }).orgPlanId);
    if (tier) {
      const projectCount = await prisma.project.count();
      const gate = checkLimit(tier, 'projects', projectCount);
      if (!gate.allowed) {
        return NextResponse.json({ error: gate.reason, code: 'PLAN_LIMIT' }, { status: 402 });
      }
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        companyId,
        ownerCompanyId: ownerCompanyId || null,
        // Must be a valid Kanban column key, else the card shows on no board.
        status: status ?? 'UNDER_REVIEW',
        priority: priority ?? 'MEDIUM',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        budget: budget ?? null,
        currency: currency || null, // null = falls back to the org's baseCurrency
        domains: {
          create: (domains ?? [])
            .filter((d: any) => d.name?.trim())
            .map((d: any) => {
              const name = d.name.trim();
              // Optionally seed tasks + subtasks from the BOQ template (unit + rate, no quantities).
              const tpl = d.importTemplate ? findBoqTemplate(name) : undefined;
              return {
                name,
                color: d.color ?? '#6366f1',
                ...(tpl && {
                  tasks: {
                    create: tpl.tasks.map((t) => ({
                      title: t.title,
                      creatorId: user.id,
                      subtasks: {
                        // Template import seeds structure only: quantity, rate,
                        // loggedHours and completed are left null/default.
                        create: t.subtasks.map((s) => ({
                          title: s.title,
                          unit: s.unit,
                          rate: null,
                          quantity: null,
                        })),
                      },
                    })),
                  },
                }),
              };
            }),
        },
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (e: any) {
    console.error('[POST /api/projects]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const user = await getApiUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const projects = await prisma.project.findMany({
    where: getProjectScope(user),
    include: { company: { select: { name: true } } },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json(projects);
}
