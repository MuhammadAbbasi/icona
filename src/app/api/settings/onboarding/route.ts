import { NextResponse } from 'next/server';
import { systemPrisma } from '@/lib/prisma';

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

    // 4. Invite email handling (mock)
    if (inviteEmails && inviteEmails.length > 0) {
      console.log(`[Onboarding] Invites queued for ${inviteEmails.join(', ')} in organization ${orgId}`);
      // In production, send invite emails here
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
