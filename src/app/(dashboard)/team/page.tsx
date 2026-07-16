export const dynamic = 'force-dynamic'
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/Header';
import { MembersManager } from '@/components/team/MembersManager';
import { VendorsManager } from '@/components/team/VendorsManager';
import { LaboursManager } from '@/components/team/LaboursManager';
import { getInactiveWorkerAlerts } from '@/app/actions/workers';

export const metadata = { title: 'Members' };

export default async function TeamPage() {
  const session = await getServerSession(authOptions);
  if (!['ADMIN', 'MANAGER'].includes(session?.user?.role ?? '')) redirect('/');

  const isAdmin = session?.user?.role === 'ADMIN';

  const [users, companies, vendors, projects, workers, teams, alerts] = await Promise.all([
    prisma.user.findMany({
      orderBy: { name: 'asc' },
      include: {
        company: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        _count: { select: { assignedTasks: true, teamMemberships: true } },
        assignedTasks: {
          select: { domain: { select: { project: { select: { id: true, name: true, status: true } } } } },
        },
      },
    }),
    prisma.company.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.vendor.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, supplies: true, contactName: true, phone: true, email: true, address: true, notes: true },
    }),
    prisma.project.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.worker.findMany({
      orderBy: { name: 'asc' },
      include: { team: { select: { id: true, name: true } } },
    }),
    prisma.team.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    getInactiveWorkerAlerts(),
  ]);

  // Derive each member's distinct projects from their assigned tasks.
  const members = users.map((u) => {
    const projectMap = new Map<string, { id: string; name: string; status: string }>();
    for (const t of u.assignedTasks) {
      const p = t.domain.project;
      if (!projectMap.has(p.id)) projectMap.set(p.id, p);
    }
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      salary: u.salary,
      phone: u.phone,
      position: u.position,
      department: u.department,
      address: u.address,
      companyId: u.companyId,
      company: u.company,
      paymentType: u.paymentType,
      projectId: u.projectId,
      project: u.project,
      taskCount: u._count.assignedTasks,
      teamCount: u._count.teamMemberships,
      createdAt: u.createdAt.toISOString(),
      avatar: u.avatar,
      projects: Array.from(projectMap.values()),
    };
  });

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Members" description={`${members.length} member${members.length !== 1 ? 's' : ''}`} />
      <div className="flex-1 p-6 animate-fade-in space-y-10">
        <MembersManager
          initialMembers={members}
          companies={companies}
          projects={projects}
          isAdmin={isAdmin}
          currentUserId={session!.user.id}
        />
        <LaboursManager initialLabours={workers as any} teams={teams} initialAlerts={alerts} />
        <VendorsManager initialVendors={vendors} canEdit />
      </div>
    </div>
  );
}
