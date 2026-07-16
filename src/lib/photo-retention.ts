import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/mail';

export async function checkAndProcessArchivedPhotos() {
  const tenDaysAgo = new Date();
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

  // Find all photos archived > 10 days ago that haven't had a retention alert sent
  const photosPendingAlert = await prisma.taskPhoto.findMany({
    where: {
      archived: true,
      archivedAt: {
        lte: tenDaysAgo,
      },
      retentionAlertSent: false,
    },
    include: {
      project: { select: { name: true } },
    },
  });

  if (photosPendingAlert.length === 0) {
    return { alertCount: 0 };
  }

  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { email: true },
  });
  const adminEmails = admins.map((a) => a.email).filter(Boolean);

  if (adminEmails.length === 0) {
    console.warn('[Photo Retention Cron]: No admin emails found to notify.');
    return { alertCount: 0, error: 'No admin emails' };
  }

  const nextAuthUrl = process.env.NEXTAUTH_URL || 'https://icon.muhammadabbasi.com';
  let successCount = 0;

  for (const photo of photosPendingAlert) {
    try {
      const retainLink = `${nextAuthUrl}/api/photos/${photo.id}/retention-action?action=retain`;
      const deleteLink = `${nextAuthUrl}/api/photos/${photo.id}/retention-action?action=delete_permanent`;

      await sendEmail({
        to: adminEmails,
        subject: `[ICON ERP] Action Required: Photo Retention Alert - Project: ${photo.project.name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #d97706; margin-top: 0;">Action Required: Photo Retention</h2>
            <p>The following photo has been in the project archive for <strong>10 days</strong>. Please decide whether to retain it in the active project directory or delete it permanently from storage.</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
              <tr>
                <td style="padding: 6px 0; color: #718096; font-weight: bold; width: 140px;">Photo Name:</td>
                <td style="padding: 6px 0; color: #2d3748;">${photo.originalName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #718096; font-weight: bold;">Parent Entity:</td>
                <td style="padding: 6px 0; color: #2d3748;">${photo.parentTitle} (${photo.parentType})</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #718096; font-weight: bold;">Date Archived:</td>
                <td style="padding: 6px 0; color: #2d3748;">${photo.archivedAt?.toLocaleDateString() || 'N/A'}</td>
              </tr>
            </table>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 14px; color: #4a5568; margin-bottom: 25px;">
              Click one of the direct action buttons below to apply your decision instantly:
            </p>
            <div style="display: flex; gap: 15px; justify-content: center; margin-top: 20px;">
              <a href="${retainLink}" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; margin-right: 15px;">
                Retain & Restore Photo
              </a>
              <a href="${deleteLink}" style="display: inline-block; background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">
                Delete Permanently
              </a>
            </div>
          </div>
        `,
      });

      // Update db so we don't send multiple alerts
      await prisma.taskPhoto.update({
        where: { id: photo.id },
        data: {
          retentionAlertSent: true,
        },
      });

      successCount++;
    } catch (err) {
      console.error(`Failed to process retention alert for photo ${photo.id}:`, err);
    }
  }

  return { alertCount: successCount };
}
