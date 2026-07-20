import { prisma } from '@/lib/prisma';

interface DerivedEvent {
  sourceKey: string;
  title: string;
  type: string;
  startAt: Date;
  endAt: Date | null;
  allDay: boolean;
  projectId: string;
  sourceTaskId?: string;
  sourceSiteVisitId?: string;
  attendeeUserId?: string; // single attendee for per-employee filtering
}

/**
 * Collects all tasks with a due date (not yet DONE) for the given org.
 * Falls back to project.company.orgId for legacy projects where orgId is null.
 */
async function tasksWithDueDates(orgId: string): Promise<DerivedEvent[]> {
  const tasks = await prisma.task.findMany({
    where: {
      dueDate: { not: null },
      status: { not: 'DONE' },
      domain: {
        project: {
          deletedAt: null,
          OR: [
            { orgId },
            { orgId: null, company: { orgId } },
          ],
        },
      },
    },
    select: {
      id: true,
      title: true,
      dueDate: true,
      assigneeId: true,
      domain: { select: { project: { select: { id: true, name: true } } } },
    },
  });

  return tasks
    .filter((t) => t.dueDate !== null)
    .map((t) => ({
      sourceKey: `TASK_DEADLINE:${t.id}`,
      title: `${t.title} (${t.domain.project.name})`,
      type: 'TASK_DEADLINE',
      startAt: t.dueDate!,
      endAt: null,
      allDay: true,
      projectId: t.domain.project.id,
      sourceTaskId: t.id,
      attendeeUserId: t.assigneeId ?? undefined,
    }));
}

/**
 * Collects all active projects with an end date for the given org.
 */
async function projectsWithEndDates(orgId: string): Promise<DerivedEvent[]> {
  const projects = await prisma.project.findMany({
    where: {
      deletedAt: null,
      endDate: { not: null },
      status: { not: 'COMPLETED' },
      OR: [
        { orgId },
        { orgId: null, company: { orgId } },
      ],
    },
    select: { id: true, name: true, endDate: true },
  });

  return projects
    .filter((p) => p.endDate !== null)
    .map((p) => ({
      sourceKey: `PROJECT_DEADLINE:${p.id}`,
      title: `Project Deadline: ${p.name}`,
      type: 'PROJECT_DEADLINE',
      startAt: p.endDate!,
      endAt: null,
      allDay: true,
      projectId: p.id,
      // No attendee - project deadline belongs to the project, not a person
    }));
}

/**
 * Collects all site visits for the given org.
 */
async function siteVisits(orgId: string): Promise<DerivedEvent[]> {
  const visits = await prisma.siteVisit.findMany({
    where: {
      project: {
        deletedAt: null,
        OR: [
          { orgId },
          { orgId: null, company: { orgId } },
        ],
      },
    },
    select: {
      id: true,
      date: true,
      note: true,
      userId: true,
      project: { select: { id: true, name: true } },
      user: { select: { name: true } },
    },
  });

  return visits.map((v) => ({
    sourceKey: `SITE_VISIT:${v.id}`,
    title: `Site Visit: ${v.user.name} - ${v.project.name}`,
    type: 'SITE_VISIT',
    startAt: v.date,
    endAt: null,
    allDay: true,
    projectId: v.project.id,
    sourceSiteVisitId: v.id,
    attendeeUserId: v.userId,
  }));
}

/**
 * Rebuilds the derived slice of CalendarEvent for one org. Authored events
 * (sourceKey = null) are never read, never written, never deleted.
 *
 * Idempotent: running twice produces the same row count.
 */
export async function syncCalendar(orgId: string): Promise<{ derivedCount: number }> {
  const derived = [
    ...await tasksWithDueDates(orgId),
    ...await projectsWithEndDates(orgId),
    ...await siteVisits(orgId),
  ];

  const sourceKeys = derived.map((d) => d.sourceKey);

  // Build the transaction: delete stale derived rows, then upsert current ones
  const ops: any[] = [];

  // 1. Delete derived rows whose source is gone or lost its date
  ops.push(
    prisma.calendarEvent.deleteMany({
      where: {
        orgId,
        sourceKey: { not: null, notIn: sourceKeys },
      },
    })
  );

  // 2. Upsert each derived event
  for (const d of derived) {
    const eventData = {
      title: d.title,
      type: d.type,
      startAt: d.startAt,
      endAt: d.endAt,
      allDay: d.allDay,
      projectId: d.projectId,
      sourceTaskId: d.sourceTaskId ?? null,
      sourceSiteVisitId: d.sourceSiteVisitId ?? null,
    };

    ops.push(
      prisma.calendarEvent.upsert({
        where: { sourceKey: d.sourceKey },
        create: {
          ...eventData,
          orgId,
          sourceKey: d.sourceKey,
          createdById: null, // derived rows have no human author
        },
        update: eventData,
      })
    );
  }

  await prisma.$transaction(ops);

  // 3. Sync attendees for derived events (for per-employee filtering)
  // Delete all attendees for derived events first, then re-create
  const derivedEvents = await prisma.calendarEvent.findMany({
    where: { orgId, sourceKey: { not: null } },
    select: { id: true, sourceKey: true },
  });

  const derivedMap = new Map(derivedEvents.map((e) => [e.sourceKey!, e.id]));

  // Delete existing attendees for all derived events in this org
  if (derivedEvents.length > 0) {
    await prisma.calendarEventAttendee.deleteMany({
      where: { eventId: { in: derivedEvents.map((e) => e.id) } },
    });
  }

  // Re-create attendees
  const attendeeInserts: { eventId: string; userId: string }[] = [];
  for (const d of derived) {
    if (d.attendeeUserId) {
      const eventId = derivedMap.get(d.sourceKey);
      if (eventId) {
        attendeeInserts.push({ eventId, userId: d.attendeeUserId });
      }
    }
  }

  if (attendeeInserts.length > 0) {
    await prisma.calendarEventAttendee.createMany({
      data: attendeeInserts,
      skipDuplicates: true,
    });
  }

  // 4. Update sync timestamp
  await prisma.organization.update({
    where: { id: orgId },
    data: { calendarSyncedAt: new Date() },
  });

  return { derivedCount: derived.length };
}
