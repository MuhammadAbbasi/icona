import { prisma } from '@/lib/prisma';
import { sendEmail } from './mail';

export async function checkAndSendDeadlineEmails() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fetch all projects that are active (not completed) and have an end date (deadline)
  const projects = await prisma.project.findMany({
    where: {
      deletedAt: null,
      status: { not: 'COMPLETED' },
      endDate: { not: null },
    },
    include: {
      company: { select: { name: true } },
    },
    orderBy: { endDate: 'asc' },
  });

  const overdue: typeof projects = [];
  const dueToday: typeof projects = [];
  const upcoming: { project: typeof projects[0]; daysRemaining: number }[] = [];

  for (const project of projects) {
    if (!project.endDate) continue;

    const endDate = new Date(project.endDate);
    endDate.setHours(0, 0, 0, 0);

    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      overdue.push(project);
    } else if (diffDays === 0) {
      dueToday.push(project);
    } else if (diffDays === 1 || diffDays === 3 || diffDays === 7) {
      upcoming.push({ project, daysRemaining: diffDays });
    }
  }

  // If there are no alerts to send, we don't need to send an empty email
  if (overdue.length === 0 && dueToday.length === 0 && upcoming.length === 0) {
    console.log('⏰ No project deadlines are overdue, due today, or approaching (1, 3, or 7 days). Email skipped.');
    return { success: true, message: 'No deadlines to alert.' };
  }

  // Create email HTML body
  let htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.6;">
      <div style="background-color: #1e293b; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 22px;">ICON ERP Project Deadlines Update</h1>
        <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.8;">Automated Status Report</p>
      </div>
      <div style="background-color: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
  `;

  // 1. Overdue Projects
  if (overdue.length > 0) {
    htmlContent += `
      <h2 style="color: #ef4444; border-bottom: 2px solid #ef4444; padding-bottom: 5px; font-size: 18px; margin-top: 10px;">⚠️ OVERDUE PROJECTS</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
        <thead>
          <tr style="background-color: #f1f5f9; text-align: left;">
            <th style="padding: 10px; border: 1px solid #cbd5e1; font-size: 13px;">Project Name</th>
            <th style="padding: 10px; border: 1px solid #cbd5e1; font-size: 13px;">Client</th>
            <th style="padding: 10px; border: 1px solid #cbd5e1; font-size: 13px;">Deadline</th>
          </tr>
        </thead>
        <tbody>
    `;
    for (const proj of overdue) {
      const formattedDate = new Date(proj.endDate!).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      htmlContent += `
        <tr>
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 13px; font-weight: bold;"><a href="${process.env.NEXTAUTH_URL}/projects/${proj.id}" style="color: #4f46e5; text-decoration: none;">${proj.name}</a></td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 13px;">${proj.company.name}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 13px; color: #ef4444; font-weight: bold;">${formattedDate}</td>
        </tr>
      `;
    }
    htmlContent += `</tbody></table>`;
  }

  // 2. Due Today Projects
  if (dueToday.length > 0) {
    htmlContent += `
      <h2 style="color: #f59e0b; border-bottom: 2px solid #f59e0b; padding-bottom: 5px; font-size: 18px; margin-top: 10px;">🚨 DUE TODAY</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
        <thead>
          <tr style="background-color: #f1f5f9; text-align: left;">
            <th style="padding: 10px; border: 1px solid #cbd5e1; font-size: 13px;">Project Name</th>
            <th style="padding: 10px; border: 1px solid #cbd5e1; font-size: 13px;">Client</th>
            <th style="padding: 10px; border: 1px solid #cbd5e1; font-size: 13px;">Deadline</th>
          </tr>
        </thead>
        <tbody>
    `;
    for (const proj of dueToday) {
      const formattedDate = new Date(proj.endDate!).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      htmlContent += `
        <tr>
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 13px; font-weight: bold;"><a href="${process.env.NEXTAUTH_URL}/projects/${proj.id}" style="color: #4f46e5; text-decoration: none;">${proj.name}</a></td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 13px;">${proj.company.name}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 13px; color: #f59e0b; font-weight: bold;">${formattedDate} (Today)</td>
        </tr>
      `;
    }
    htmlContent += `</tbody></table>`;
  }

  // 3. Upcoming Deadlines
  if (upcoming.length > 0) {
    htmlContent += `
      <h2 style="color: #10b981; border-bottom: 2px solid #10b981; padding-bottom: 5px; font-size: 18px; margin-top: 10px;">📅 UPCOMING DEADLINES</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
        <thead>
          <tr style="background-color: #f1f5f9; text-align: left;">
            <th style="padding: 10px; border: 1px solid #cbd5e1; font-size: 13px;">Project Name</th>
            <th style="padding: 10px; border: 1px solid #cbd5e1; font-size: 13px;">Client</th>
            <th style="padding: 10px; border: 1px solid #cbd5e1; font-size: 13px;">Deadline</th>
            <th style="padding: 10px; border: 1px solid #cbd5e1; font-size: 13px;">Time Left</th>
          </tr>
        </thead>
        <tbody>
    `;
    for (const item of upcoming) {
      const proj = item.project;
      const formattedDate = new Date(proj.endDate!).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      htmlContent += `
        <tr>
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 13px; font-weight: bold;"><a href="${process.env.NEXTAUTH_URL}/projects/${proj.id}" style="color: #4f46e5; text-decoration: none;">${proj.name}</a></td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 13px;">${proj.company.name}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 13px;">${formattedDate}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 13px; font-weight: bold; color: #4f46e5;">In ${item.daysRemaining} days</td>
        </tr>
      `;
    }
    htmlContent += `</tbody></table>`;
  }

  htmlContent += `
        <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 20px; font-size: 11px; color: #64748b; text-align: center;">
          This is an automated notification from the ICON SERVICES Project Portal.<br/>
          Manage email preferences in the <a href="${process.env.NEXTAUTH_URL}/settings" style="color: #4f46e5; text-decoration: underline;">User Settings panel</a>.
        </div>
      </div>
    </div>
  `;

  // Recipients
  const recipients = ['info@icon.muhammadabbasi.com', 'muhammadabbasi.llm@gmail.com'];

  // Send the email
  const sendRes = await sendEmail({
    to: recipients,
    subject: `[ICON ERP] Project Deadlines Alert Summary - ${new Date().toLocaleDateString('en-GB')}`,
    html: htmlContent,
  });

  return sendRes;
}

export async function sendDeadlineUpdatedEmail(project: { id: string; name: string; endDate: Date | null }, oldDeadline: Date | null) {
  const recipients = ['info@icon.muhammadabbasi.com', 'muhammadabbasi.llm@gmail.com'];

  const formatDate = (d: Date | null) => {
    if (!d) return 'None';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const oldStr = formatDate(oldDeadline);
  const newStr = formatDate(project.endDate);

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.6;">
      <div style="background-color: #4f46e5; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 22px;">Project Deadline Changed</h1>
        <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.8;">ERP Real-time Notification</p>
      </div>
      <div style="background-color: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
        <p style="font-size: 14px;">Hello, the deadline for the project <b>"${project.name}"</b> has been updated.</p>
        
        <div style="background-color: #ffffff; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; margin: 15px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 5px 0; font-weight: bold; width: 40%; font-size: 13px;">Project:</td>
              <td style="padding: 5px 0; font-size: 13px;"><a href="${process.env.NEXTAUTH_URL}/projects/${project.id}" style="color: #4f46e5; text-decoration: none; font-weight: bold;">${project.name}</a></td>
            </tr>
            <tr>
              <td style="padding: 5px 0; font-weight: bold; font-size: 13px;">Previous Deadline:</td>
              <td style="padding: 5px 0; font-size: 13px; text-decoration: line-through; color: #64748b;">${oldStr}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; font-weight: bold; font-size: 13px;">New Deadline:</td>
              <td style="padding: 5px 0; font-size: 13px; color: #ef4444; font-weight: bold;">${newStr}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 13px; color: #64748b;">You can view the full details and task breakdown for this project by visiting the workspace dashboard.</p>
        
        <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 20px; font-size: 11px; color: #64748b; text-align: center;">
          This is an automated notification from the ICON SERVICES Project Portal.<br/>
          Manage email preferences in the <a href="${process.env.NEXTAUTH_URL}/settings" style="color: #4f46e5; text-decoration: underline;">User Settings panel</a>.
        </div>
      </div>
    </div>
  `;

  try {
    await sendEmail({
      to: recipients,
      subject: `[ICON ERP] Deadline Changed: ${project.name}`,
      html: htmlContent,
    });
    console.log(`✉️ Deadline update email sent for project ${project.name}`);
  } catch (error) {
    console.error(`❌ Failed to send deadline change email for ${project.name}:`, error);
  }
}
