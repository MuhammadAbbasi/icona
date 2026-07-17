import { NextResponse } from 'next/server';
import { systemPrisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orgId, currency, timezone, taxRate, address, terminology, planId, inviteEmails } = body;

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

    // 2. Update Organization details. Billing starts as a 14-day free trial —
    // no card is collected; a payment-provider webhook flips billingStatus later.
    await systemPrisma.organization.update({
      where: { id: orgId },
      data: {
        baseCurrency: currency || 'PKR',
        timezone: timezone || 'Asia/Karachi',
        taxRate: Number(taxRate || 15),
        terminology: terminology || null,
        planId: planId || 'growth_monthly',
        billingStatus: 'TRIAL',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });

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
