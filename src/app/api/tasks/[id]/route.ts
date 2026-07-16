import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser } from '@/lib/apiAuth';
import { z } from 'zod';
import { sendEmail } from '@/lib/mail';

import { recalculateProjectProgress } from '@/lib/progress';

const schema = z.object({
  title:       z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status:      z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED']).optional(),
  priority:    z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  dueDate:     z.string().optional().nullable(),
  assigneeId:  z.string().optional().nullable(),
  completedAt: z.string().optional().nullable(),
  loggedHours: z.number().nonnegative().optional().nullable(),
  // Task-level pricing (measurement-driven tasks with no priced subtasks).
  unit:        z.string().optional().nullable(),
  quantity:    z.number().nonnegative().optional().nullable(),
  rate:        z.number().nonnegative().optional().nullable(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser(req);
  if (!['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(user?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { title, description, status, priority, dueDate, assigneeId, completedAt, loggedHours, unit, quantity, rate } = parsed.data;

  const task = await prisma.task.update({
    where: { id: params.id },
    data: {
      ...(title       && { title: title.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(status      && { status }),
      ...(priority    && { priority }),
      ...(dueDate     !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(assigneeId  !== undefined && { assigneeId: assigneeId || null }),
      ...(completedAt !== undefined && { completedAt: completedAt ? new Date(completedAt) : null }),
      ...(loggedHours !== undefined && { loggedHours: loggedHours ?? null }),
      ...(unit        !== undefined && { unit: unit || null }),
      ...(quantity    !== undefined && { quantity: quantity ?? null }),
      ...(rate        !== undefined && { rate: rate ?? null }),
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

  return NextResponse.json(task);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser(req);
  if (!['ADMIN', 'MANAGER'].includes(user?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden: Admin/Manager only' }, { status: 403 });
  }

  const task = await prisma.task.findUnique({
    where: { id: params.id },
    select: { domain: { select: { projectId: true } }, title: true },
  });

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const projectId = task.domain?.projectId;

  // Intercept and archive task photo attachments
  const taskPhotos = await prisma.taskPhoto.findMany({
    where: { taskId: params.id },
  });

  if (taskPhotos.length > 0) {
    // Archive them and save archived status
    await prisma.taskPhoto.updateMany({
      where: { taskId: params.id },
      data: {
        archived: true,
        archivedAt: new Date(),
      },
    });

    // Notify admins
    try {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { email: true },
      });
      const adminEmails = admins.map((a) => a.email).filter(Boolean);

      if (adminEmails.length > 0 && projectId) {
        const nextAuthUrl = process.env.NEXTAUTH_URL || '';
        const archiveLink = `${nextAuthUrl}/projects/${projectId}/gallery?archived=true`;
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { name: true },
        });

        await sendEmail({
          to: adminEmails,
          subject: `[ICON ERP] Photo Attachments Archived due to Task Deletion - Project: ${project?.name || 'Unknown'}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #ef4444; margin-top: 0;">Task Deleted: Photos Archived</h2>
              <p>The task <strong>"${task.title}" (ID: ${params.id})</strong> has been deleted in project <strong>${project?.name || 'Unknown'}</strong>.</p>
              <p><strong>${taskPhotos.length} photo(s)</strong> attached to this task have been automatically sent to the archive.</p>
              <div style="margin-top: 25px; text-align: center;">
                <a href="${archiveLink}" style="display: inline-block; background-color: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">
                  Open Project Photo Archive
                </a>
              </div>
            </div>
          `,
        });
      }
    } catch (err) {
      console.error('Failed to notify admins of task deletion photos archive:', err);
    }
  }

  await prisma.task.delete({ where: { id: params.id } });

  if (projectId) {
    await recalculateProjectProgress(projectId);
  }

  return NextResponse.json({ message: 'Deleted' });
}
