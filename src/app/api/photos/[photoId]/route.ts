import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/mail';

export const runtime = 'nodejs';

/**
 * Handle archiving a photo (marked archived: true) and notifying the admin.
 */
export async function DELETE(
  req: Request,
  { params }: { params: { photoId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  const isAuthorized = ['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(role);
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // TaskPhoto has no orgId column, so the tenant fence goes through the
    // owning project — otherwise any staff user in any org could archive any
    // other org's photos by id.
    const photo = await prisma.taskPhoto.findUnique({
      where: { id: params.photoId },
      include: {
        project: { select: { name: true, orgId: true } },
      },
    });

    if (!photo || photo.project.orgId !== (session.user as { orgId?: string }).orgId) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    if (photo.archived) {
      return NextResponse.json({ error: 'Photo is already archived' }, { status: 400 });
    }

    // Archive the photo record
    const updatedPhoto = await prisma.taskPhoto.update({
      where: { id: params.photoId },
      data: {
        archived: true,
        archivedAt: new Date(),
      },
    });

    // Notify all Admin users immediately via email
    try {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { email: true },
      });
      const adminEmails = admins.map((a) => a.email).filter(Boolean);

      if (adminEmails.length > 0) {
        const nextAuthUrl = process.env.NEXTAUTH_URL || '';
        const archiveLink = `${nextAuthUrl}/projects/${photo.projectId}/gallery?archived=true`;

        await sendEmail({
          to: adminEmails,
          subject: `[ICON ERP] Photo Attachment Archived - Project: ${photo.project.name}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-lg">
              <h2 style="color: #ef4444; margin-top: 0;">Photo Attachment Archived</h2>
              <p>A photo attachment has been archived and removed from the active view in the project: <strong>${photo.project.name}</strong>.</p>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 6px 0; color: #718096; font-weight: bold; width: 140px;">Photo Name:</td>
                  <td style="padding: 6px 0; color: #2d3748;">${photo.originalName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #718096; font-weight: bold;">Parent Entity:</td>
                  <td style="padding: 6px 0; color: #2d3748;">${photo.parentTitle} (${photo.parentType})</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #718096; font-weight: bold;">Archived By:</td>
                  <td style="padding: 6px 0; color: #2d3748;">${session.user.name} (${session.user.role})</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #718096; font-weight: bold;">Date Archived:</td>
                  <td style="padding: 6px 0; color: #2d3748;">${new Date().toLocaleString()}</td>
                </tr>
              </table>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="font-size: 13px; color: #718096;">
                Admins and Managers can review or permanently delete/restore this photo from the project archive. 
                After 10 days, you will receive a notification to either retain or permanently delete this photo.
              </p>
              <div style="margin-top: 25px; text-align: center;">
                <a href="${archiveLink}" style="display: inline-block; background-color: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">
                  Open Project Photo Archive
                </a>
              </div>
            </div>
          `,
        });
      }
    } catch (emailErr) {
      console.error('[Archival Notification Email Error]:', emailErr);
    }

    return NextResponse.json({ ok: true, photo: updatedPhoto });
  } catch (error: any) {
    console.error('[DELETE /api/photos/[photoId]]', error);
    return NextResponse.json({ error: error.message || 'Archival failed' }, { status: 500 });
  }
}

/**
 * Handle permanent restoration (un-archive) or permanent deletion.
 */
export async function PATCH(
  req: Request,
  { params }: { params: { photoId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only Admin or Manager can restore or permanently handle photos
  const role = session.user.role;
  const isAuthorized = ['ADMIN', 'MANAGER'].includes(role);
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const action = body.action; // 'restore' | 'delete_permanent' | 'retain'

    // Same tenant fence as DELETE above — TaskPhoto has no orgId of its own.
    const photo = await prisma.taskPhoto.findUnique({
      where: { id: params.photoId },
      include: { project: { select: { orgId: true } } },
    });

    if (!photo || photo.project.orgId !== (session.user as { orgId?: string }).orgId) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    if (action === 'restore' || action === 'retain') {
      const restored = await prisma.taskPhoto.update({
        where: { id: params.photoId },
        data: {
          archived: false,
          archivedAt: null,
          retentionAlertSent: false,
        },
      });
      return NextResponse.json({ ok: true, photo: restored });
    }

    if (action === 'delete_permanent') {
      // Permanently delete from DB
      await prisma.taskPhoto.delete({
        where: { id: params.photoId },
      });

      // Note: In a complete cloud system, we could trigger Cloudinary asset deletion here.
      // But keeping local records clean is the primary DB goal.

      return NextResponse.json({ ok: true, deleted: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('[PATCH /api/photos/[photoId]]', error);
    return NextResponse.json({ error: error.message || 'Action failed' }, { status: 500 });
  }
}
