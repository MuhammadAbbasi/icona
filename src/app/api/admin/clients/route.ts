import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/adminAuth';
import { systemPrisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const admin = await requireAdminUser(req);
  if ('error' in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  try {
    const clients = await systemPrisma.organization.findMany({
      include: {
        _count: {
          select: {
            projects: true,
            users: true,
          },
        },
        users: {
          take: 1,
          where: { role: 'ADMIN' },
          select: { name: true, email: true, phone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedClients = clients.map((c) => {
      const planTier = c.planId || 'starter';
      const projectLimit = planTier === 'enterprise' ? 'Unlimited' : planTier === 'growth' ? 5 : 1;
      const userLimit = planTier === 'enterprise' ? 'Unlimited' : planTier === 'growth' ? 15 : 3;
      const owner = c.users[0] || { name: 'Unassigned Owner', email: 'n/a', phone: 'n/a' };

      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        status: c.status,
        billingStatus: c.billingStatus,
        planTier,
        ownerName: owner.name,
        ownerEmail: owner.email,
        ownerPhone: owner.phone || 'n/a',
        projectsCount: c._count.projects,
        projectsMax: projectLimit,
        usersCount: c._count.users,
        usersMax: userLimit,
        monthlyQueries: Math.floor(Math.random() * 400) + 50,
        createdAt: c.createdAt,
      };
    });

    return NextResponse.json({ clients: formattedClients });
  } catch (error) {
    console.error('Failed to fetch clients:', error);
    return NextResponse.json({ error: 'Failed to retrieve clients list' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const admin = await requireAdminUser(req);
  if ('error' in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  try {
    const body = await req.json();
    const { id, status, billingStatus, planId } = body;

    if (!id) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    const updated = await systemPrisma.organization.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(billingStatus && { billingStatus }),
        ...(planId && { planId }),
      },
    });

    return NextResponse.json({ success: true, client: updated });
  } catch (error) {
    console.error('Failed to update client:', error);
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
  }
}
