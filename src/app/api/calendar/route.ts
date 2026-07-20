import { NextResponse } from 'next/server';
import { getApiUser } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';
import { getProjectScope } from '@/lib/projectAccess';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await getApiUser(req);
    if (!user || !user.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');

    const from = fromStr ? new Date(fromStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = toStr ? new Date(toStr) : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

    // 1. Get visible project scope for this user
    const projectScope = getProjectScope(user);

    const allowedProjects = await prisma.project.findMany({
      where: {
        ...projectScope,
        OR: [
          { orgId: user.orgId },
          { orgId: null, company: { orgId: user.orgId } },
        ],
      },
      select: { id: true, name: true, color: true } as any,
    }).catch(() => {
      return prisma.project.findMany({
        where: {
          ...projectScope,
          OR: [
            { orgId: user.orgId },
            { orgId: null, company: { orgId: user.orgId } },
          ],
        },
        select: { id: true, name: true },
      });
    });

    let allowedProjectIds = allowedProjects.map((p) => p.id);

    // 2. For external roles (CLIENT, FREELANCER, SUBCONTRACTOR), enforce ProjectCalendarVisibility
    const isExternalRole = ['CLIENT', 'FREELANCER', 'SUBCONTRACTOR'].includes(user.role);
    if (isExternalRole && allowedProjectIds.length > 0) {
      const visibilityRecords = await prisma.projectCalendarVisibility.findMany({
        where: {
          projectId: { in: allowedProjectIds },
          viewerRole: user.role,
        },
      });

      // Absence of row = NOT visible (safe default for external roles)
      const visibleSet = new Set(
        visibilityRecords.filter((v) => v.visible).map((v) => v.projectId)
      );
      allowedProjectIds = allowedProjectIds.filter((id) => visibleSet.has(id));
    }

    // 3. Fetch CalendarEvents
    const events = await prisma.calendarEvent.findMany({
      where: {
        orgId: user.orgId,
        startAt: { gte: from, lte: to },
        OR: [
          { projectId: { in: allowedProjectIds } },
          { projectId: null, createdById: user.id },
          { projectId: null, attendees: { some: { userId: user.id } } },
        ],
      },
      include: {
        attendees: {
          include: {
            user: { select: { id: true, name: true, avatar: true } },
          },
        },
        project: {
          select: { id: true, name: true },
        },
      },
      orderBy: { startAt: 'asc' },
    });

    // 4. Fetch Organization calendarSyncedAt date & employees list for filtering
    const [org, employees] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: user.orgId },
        select: { calendarSyncedAt: true },
      }),
      prisma.user.findMany({
        where: {
          orgId: user.orgId,
          status: 'ACTIVE',
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatar: true,
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    return NextResponse.json({
      events,
      projects: allowedProjects,
      employees,
      calendarSyncedAt: org?.calendarSyncedAt || null,
      userRole: user.role,
    });
  } catch (error: any) {
    console.error('[GET /api/calendar] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch calendar events' }, { status: 500 });
  }
}
