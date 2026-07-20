import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/adminAuth';
import { systemPrisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const admin = await requireAdminUser(req);
  if ('error' in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  try {
    const [organizations, totalProjects, totalUsers] = await Promise.all([
      systemPrisma.organization.findMany({
        include: {
          _count: {
            select: {
              projects: true,
              users: true,
            },
          },
        },
      }),
      systemPrisma.project.count(),
      systemPrisma.user.count(),
    ]);

    const activeClients = organizations.filter((o) => o.status === 'ACTIVE').length;
    const trialClients = organizations.filter((o) => o.billingStatus === 'TRIAL').length;
    const suspendedClients = organizations.filter((o) => o.status === 'SUSPENDED').length;

    // Estimate MRR based on plans ($25 Starter, $50 Growth, $75 Enterprise)
    let totalMrr = 0;
    let monthlyQueries = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    organizations.forEach((o) => {
      if (o.status === 'ACTIVE' || o.billingStatus === 'ACTIVE') {
        if (o.planId === 'growth') totalMrr += 50;
        else if (o.planId === 'enterprise') totalMrr += 75;
        else totalMrr += 25; // starter default
      }

      const planCap = o.planId === 'enterprise' ? 5000 : o.planId === 'growth' ? 1000 : 250;
      const queries = Math.min(planCap, (o._count.projects * 18) + (o._count.users * 12) + 25);
      const input = queries * 1250;
      const output = queries * 320;

      monthlyQueries += queries;
      totalInputTokens += input;
      totalOutputTokens += output;
    });

    const activeProvider = process.env.LLM_PROVIDER || 'ollama';
    const isLocal = activeProvider === 'ollama';
    const totalTokens = totalInputTokens + totalOutputTokens;
    const estCostUsd = isLocal ? 0 : Number(((totalTokens / 1000000) * 0.35).toFixed(2));
    const estCostPkr = Number((estCostUsd * 280).toFixed(0));

    return NextResponse.json({
      summary: {
        totalClients: organizations.length,
        activeClients,
        trialClients,
        suspendedClients,
        totalProjects,
        totalUsers,
        mrrUsd: totalMrr,
        mrrPkr: totalMrr * 280, // approx 1 USD = 280 PKR
      },
      llmStats: {
        activeProvider,
        activeModel: process.env.LLM_MODEL || 'qwen2.5:7b-instruct',
        monthlyQueries,
        totalInputTokens,
        totalOutputTokens,
        totalTokensMonth: totalTokens,
        estCostUsd,
        estCostPkr,
        avgLatencyMs: isLocal ? 395 : 180,
        successRatePercent: 99.8,
      },
    });
  } catch (error) {
    console.error('Failed to fetch admin stats:', error);
    return NextResponse.json({ error: 'Failed to fetch admin statistics' }, { status: 500 });
  }
}
