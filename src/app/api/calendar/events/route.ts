import { NextResponse } from 'next/server';
import { getApiUser } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';
import { canAccessProject } from '@/lib/projectAccess';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await getApiUser(req);
    if (!user || !user.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // External roles are strictly view-only
    if (['CLIENT', 'FREELANCER', 'SUBCONTRACTOR'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden - Read-only calendar view for your role' }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, startAt, endAt, allDay, type, projectId, attendeeIds } = body;

    if (!title || !startAt) {
      return NextResponse.json({ error: 'Title and start date are required' }, { status: 400 });
    }

    if (projectId) {
      const hasAccess = await canAccessProject(user, projectId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied for the specified project' }, { status: 403 });
      }
    }

    const validTypes = ['MEETING', 'TRAVEL', 'SITE_VISIT_PLANNED', 'LEAVE', 'OTHER'];
    const eventType = validTypes.includes(type) ? type : 'MEETING';

    const event = await prisma.calendarEvent.create({
      data: {
        orgId: user.orgId,
        projectId: projectId || null,
        title: title.trim(),
        description: description ? description.trim() : null,
        startAt: new Date(startAt),
        endAt: endAt ? new Date(endAt) : null,
        allDay: Boolean(allDay),
        type: eventType,
        sourceKey: null, // authored by human
        createdById: user.id,
        attendees: {
          create: Array.isArray(attendeeIds)
            ? attendeeIds.map((uId: string) => ({ userId: uId }))
            : [],
        },
      },
      include: {
        attendees: {
          include: {
            user: { select: { id: true, name: true, avatar: true } },
          },
        },
        project: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, event });
  } catch (error: any) {
    console.error('[POST /api/calendar/events] Error:', error);
    return NextResponse.json({ error: 'Failed to create calendar event' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getApiUser(req);
    if (!user || !user.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (['CLIENT', 'FREELANCER', 'SUBCONTRACTOR'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden - Read-only calendar view' }, { status: 403 });
    }

    const body = await req.json();
    const { id, title, description, startAt, endAt, allDay, type, projectId, attendeeIds } = body;

    if (!id) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    const existing = await prisma.calendarEvent.findUnique({
      where: { id },
    });

    if (!existing || existing.orgId !== user.orgId) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Derived events cannot be edited via calendar CRUD (they are synced from Task/Project/SiteVisit)
    if (existing.sourceKey) {
      // If moving a TASK_DEADLINE event via drag-and-drop, update the underlying Task.dueDate!
      if (existing.sourceTaskId && startAt) {
        await prisma.task.update({
          where: { id: existing.sourceTaskId },
          data: { dueDate: new Date(startAt) },
        });

        // Also update local materialized row for immediate response
        const updated = await prisma.calendarEvent.update({
          where: { id },
          data: { startAt: new Date(startAt) },
        });
        return NextResponse.json({ success: true, event: updated });
      }

      return NextResponse.json(
        { error: 'Auto-derived deadline events cannot be edited directly. Sync updates them automatically.' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (typeof title === 'string') updateData.title = title.trim();
    if (typeof description === 'string') updateData.description = description.trim();
    if (startAt) updateData.startAt = new Date(startAt);
    if (endAt !== undefined) updateData.endAt = endAt ? new Date(endAt) : null;
    if (typeof allDay === 'boolean') updateData.allDay = allDay;
    if (type) updateData.type = type;
    if (projectId !== undefined) updateData.projectId = projectId || null;

    // Handle attendee list replacement if provided
    if (Array.isArray(attendeeIds)) {
      await prisma.calendarEventAttendee.deleteMany({
        where: { eventId: id },
      });
      updateData.attendees = {
        create: attendeeIds.map((uId: string) => ({ userId: uId })),
      };
    }

    const updatedEvent = await prisma.calendarEvent.update({
      where: { id },
      data: updateData,
      include: {
        attendees: {
          include: {
            user: { select: { id: true, name: true, avatar: true } },
          },
        },
        project: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, event: updatedEvent });
  } catch (error: any) {
    console.error('[PATCH /api/calendar/events] Error:', error);
    return NextResponse.json({ error: 'Failed to update calendar event' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getApiUser(req);
    if (!user || !user.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (['CLIENT', 'FREELANCER', 'SUBCONTRACTOR'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden - Read-only calendar view' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    const existing = await prisma.calendarEvent.findUnique({
      where: { id },
    });

    if (!existing || existing.orgId !== user.orgId) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (existing.sourceKey) {
      return NextResponse.json(
        { error: 'Auto-derived deadline events cannot be deleted directly. Remove the source task/visit instead.' },
        { status: 400 }
      );
    }

    await prisma.calendarEvent.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Event deleted successfully' });
  } catch (error: any) {
    console.error('[DELETE /api/calendar/events] Error:', error);
    return NextResponse.json({ error: 'Failed to delete calendar event' }, { status: 500 });
  }
}
