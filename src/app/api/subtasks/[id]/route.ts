import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser } from '@/lib/apiAuth';
import { recalculateProjectProgress } from '@/lib/progress';
import { sendEmail } from '@/lib/mail';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser(req);
  // Editing/completing a priced line is a staff action — never a CLIENT/FREELANCER.
  // Mirrors the task PATCH gate and the page's `canEdit` boundary.
  if (!['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(user?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (body.completed    !== undefined) data.completed    = Boolean(body.completed);
  if (body.completedAt  !== undefined) data.completedAt  = body.completedAt ? new Date(body.completedAt) : null;
  if (body.loggedHours  !== undefined) data.loggedHours  = body.loggedHours != null ? Number(body.loggedHours) : null;
  if (body.description  !== undefined) data.description  = body.description  || null;
  if (body.assigneeName !== undefined) data.assigneeName = body.assigneeName || null;
  if (body.labourCount  !== undefined) data.labourCount  = body.labourCount  != null ? Number(body.labourCount)  : null;
  if (body.unit         !== undefined) data.unit         = body.unit         || null;
  if (body.quantity     !== undefined) data.quantity     = body.quantity     != null ? Number(body.quantity)     : null;
  if (body.completedQuantity !== undefined) data.completedQuantity = body.completedQuantity != null ? Number(body.completedQuantity) : null;
  if (body.rate         !== undefined) data.rate         = body.rate         != null ? Number(body.rate)         : null;
  if (body.notes        !== undefined) data.notes        = body.notes        || null;

  const subtask = await prisma.subtask.update({
    where: { id: params.id },
    data,
    include: { task: { select: { domain: { select: { projectId: true } } } } },
  });

  // Completing a priced line, or changing its quantity/rate, shifts the
  // value-weighted project progress — keep the stored figure in sync.
  const projectId = subtask.task?.domain?.projectId;
  if (projectId) await recalculateProjectProgress(projectId);

  return NextResponse.json(subtask);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser(req);
  if (!['ADMIN', 'MANAGER'].includes(user?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // Capture the owning project before deleting so progress can be recalculated.
  const existing = await prisma.subtask.findUnique({
    where: { id: params.id },
    select: { task: { select: { domain: { select: { projectId: true } } } }, title: true },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
  }

  const projectId = existing?.task?.domain?.projectId;

  // Intercept and archive subtask photo attachments
  const subtaskPhotos = await prisma.taskPhoto.findMany({
    where: { subtaskId: params.id },
  });

  if (subtaskPhotos.length > 0) {
    await prisma.taskPhoto.updateMany({
      where: { subtaskId: params.id },
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
          subject: `[ICON ERP] Photo Attachments Archived due to Subtask Deletion - Project: ${project?.name || 'Unknown'}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #ef4444; margin-top: 0;">Subtask Deleted: Photos Archived</h2>
              <p>The subtask <strong>"${existing.title}" (ID: ${params.id})</strong> has been deleted in project <strong>${project?.name || 'Unknown'}</strong>.</p>
              <p><strong>${subtaskPhotos.length} photo(s)</strong> attached to this subtask have been automatically sent to the archive.</p>
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
      console.error('Failed to notify admins of subtask deletion photos archive:', err);
    }
  }

  await prisma.subtask.delete({ where: { id: params.id } });

  if (projectId) await recalculateProjectProgress(projectId);

  return NextResponse.json({ message: 'Deleted' });
}
