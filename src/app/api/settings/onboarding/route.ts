import { NextResponse } from 'next/server';
import { systemPrisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/mail';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orgId, currency, timezone, taxRules, address, hierarchyLevels, planId, inviteEmails } = body;

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required.' },
        { status: 400 }
      );
    }

    // 1. Verify organization exists
    const org = await systemPrisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found.' },
        { status: 404 }
      );
    }

    // Levels: ordered array of level names, length 2-4 (see Organization.hierarchyDepth).
    const levels: string[] = Array.isArray(hierarchyLevels) && hierarchyLevels.length >= 2
      ? hierarchyLevels.slice(0, 4)
      : ['Domain', 'Task', 'Subtask'];

    // 2. Update Organization details. Billing starts as a 14-day free trial —
    // no card is collected; a payment-provider webhook flips billingStatus later.
    await systemPrisma.organization.update({
      where: { id: orgId },
      data: {
        baseCurrency: currency || 'PKR',
        timezone: timezone || 'Asia/Karachi',
        hierarchyDepth: levels.length,
        terminology: { levels },
        planId: planId || 'growth_monthly',
        billingStatus: 'TRIAL',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });

    // 2b. Replace this org's tax rules with whatever the wizard submitted.
    // Onboarding only ever runs once per org, so a delete+recreate is simplest
    // and correct (no existing rules to preserve on first setup).
    const rules: { name: string; rate: number; appliesTo: string }[] = Array.isArray(taxRules)
      ? taxRules.filter((r) => r?.name?.trim() && Number.isFinite(Number(r.rate)))
      : [];
    await systemPrisma.taxRule.deleteMany({ where: { orgId } });
    if (rules.length > 0) {
      await systemPrisma.taxRule.createMany({
        data: rules.map((r) => ({
          orgId,
          name: r.name.trim(),
          rate: Number(r.rate),
          appliesTo: ['INCOME', 'EXPENSE', 'BOTH'].includes(r.appliesTo) ? r.appliesTo : 'BOTH',
        })),
      });
    }

    // 3. Update the main Company address
    const mainCompany = await systemPrisma.company.findFirst({
      where: { orgId, type: 'MAIN' },
    });

    if (mainCompany && address) {
      await systemPrisma.company.update({
        where: { id: mainCompany.id },
        data: { address: address.trim() },
      });
    }

    // 4. Invite email handling & Employee user creation
    if (inviteEmails && Array.isArray(inviteEmails) && inviteEmails.length > 0) {
      const base = process.env.NEXTAUTH_URL || 'http://localhost:4266';
      for (const rawEmail of inviteEmails) {
        const email = String(rawEmail).trim().toLowerCase();
        if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) continue;

        try {
          // Check if user already exists
          const existing = await systemPrisma.user.findUnique({ where: { email } });
          if (!existing) {
            // Create user account with EMPLOYEE role under this org
            const nameFromEmail = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
            await systemPrisma.user.create({
              data: {
                email,
                name: nameFromEmail,
                role: 'EMPLOYEE',
                orgId,
                companyId: mainCompany?.id ?? null,
                password: '', // Onboarding invite: sets password via reset link or initial login
                taskAssignNotifications: true,
                dailyTaskDigest: true,
              },
            });
          }

          // Dispatch joining invitation email
          const joinUrl = `${base}/signup?email=${encodeURIComponent(email)}&orgId=${orgId}`;
          const mailHtml = `
            <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #0F172A; background-color: #F8FAFC;">
              <div style="background-color: #1A365D; padding: 28px 24px; border-radius: 12px 12px 0 0; text-align: center; color: #FFFFFF;">
                <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">Team Invitation</h1>
                <p style="margin: 6px 0 0 0; font-size: 13px; color: #38BDF8; font-weight: 500;">ICONA - Construction ERP & CRM</p>
              </div>
              <div style="background-color: #FFFFFF; padding: 32px 28px; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.05);">
                <p style="margin-top: 0; font-size: 15px; color: #0F172A;">Hello,</p>
                <p style="font-size: 14px; color: #64748B; line-height: 1.6;">You have been invited to join <strong>${org.name}</strong> on ICONA Construction Software as a team member.</p>
                <div style="text-align: center; margin: 28px 0;">
                  <a href="${joinUrl}" style="display: inline-block; background-color: #2563EB; color: #FFFFFF; padding: 14px 32px; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
                    Join Your Workspace
                  </a>
                </div>
                <p style="font-size: 12px; color: #94A3B8; margin-bottom: 0; text-align: center;">© ICONA Construction Software. All rights reserved.</p>
              </div>
            </div>
          `;

          await sendEmail({
            to: email,
            subject: `Invitation to join ${org.name} on ICONA`,
            html: mailHtml,
            orgId,
          });
        } catch (inviteErr) {
          console.error(`Failed to create/invite employee ${email}:`, inviteErr);
        }
      }
    }

    return NextResponse.json(
      {
        message: 'Onboarding settings applied successfully.',
        // The wizard needs this to create the first project (BOQ import).
        companyId: mainCompany?.id ?? null,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error during onboarding settings save:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during onboarding.' },
      { status: 500 }
    );
  }
}
