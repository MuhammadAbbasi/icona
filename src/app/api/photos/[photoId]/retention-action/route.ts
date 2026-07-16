import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: { photoId: string } }
) {
  const url = new URL(req.url);
  const action = url.searchParams.get('action'); // 'retain' | 'delete_permanent'

  try {
    const photo = await prisma.taskPhoto.findUnique({
      where: { id: params.photoId },
      include: {
        project: { select: { name: true } },
      },
    });

    if (!photo) {
      return new Response(
        `<html><body style="font-family:sans-serif;text-align:center;padding:50px;">
          <h1 style="color:#ef4444;">Error: Photo Not Found</h1>
          <p>The photo attachment could not be found or has already been permanently deleted.</p>
        </body></html>`,
        { headers: { 'Content-Type': 'text/html' }, status: 404 }
      );
    }

    let messageHtml = '';

    if (action === 'retain') {
      // Restore photo (un-archive)
      await prisma.taskPhoto.update({
        where: { id: params.photoId },
        data: {
          archived: false,
          archivedAt: null,
          retentionAlertSent: false,
        },
      });

      messageHtml = `
        <h1 style="color:#10b981;">Success! Photo Retained</h1>
        <p>The photo <strong>${photo.originalName}</strong> has been successfully restored and retained in the project <strong>${photo.project.name}</strong>.</p>
        <p>It is now fully active and visible to all project members again.</p>
      `;
    } else if (action === 'delete_permanent') {
      // Permanently delete
      await prisma.taskPhoto.delete({
        where: { id: params.photoId },
      });

      messageHtml = `
        <h1 style="color:#ef4444;">Success! Photo Deleted</h1>
        <p>The photo <strong>${photo.originalName}</strong> has been permanently deleted from project <strong>${photo.project.name}</strong>.</p>
        <p>All database records and file references have been removed.</p>
      `;
    } else {
      return new Response(
        `<html><body style="font-family:sans-serif;text-align:center;padding:50px;">
          <h1 style="color:#f59e0b;">Invalid Action</h1>
          <p>The requested retention action is invalid.</p>
        </body></html>`,
        { headers: { 'Content-Type': 'text/html' }, status: 400 }
      );
    }

    return new Response(
      `<html>
        <head>
          <title>Photo Retention Manager</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f8fafc;color:#1e293b;text-align:center;padding:50px 20px;margin:0;">
          <div style="max-width:500px;margin:0 auto;background:white;padding:40px;border-radius:12px;box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);border:1px solid #e2e8f0;">
            <div style="font-size:48px;margin-bottom:20px;">📷</div>
            ${messageHtml}
            <div style="margin-top:30px;border-top:1px solid #f1f5f9;padding-top:20px;">
              <p style="font-size:12px;color:#64748b;">You can close this window now.</p>
            </div>
          </div>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (error: any) {
    console.error('[GET /api/photos/[photoId]/retention-action]', error);
    return new Response(
      `<html><body style="font-family:sans-serif;text-align:center;padding:50px;">
        <h1 style="color:#ef4444;">Internal Server Error</h1>
        <p>Failed to execute action: ${error.message || error}</p>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html' }, status: 500 }
    );
  }
}
