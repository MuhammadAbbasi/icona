export const dynamic = 'force-dynamic'
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/Header';
import { TeamsManager } from '@/components/teams/TeamsManager';
import { SubcontractorsManager } from '@/components/teams/SubcontractorsManager';

export const metadata = { title: 'Teams' };

export default async function TeamsPage() {
  const session = await getServerSession(authOptions);
  if (!['ADMIN', 'MANAGER'].includes(session?.user?.role ?? '')) redirect('/');

  const [teams, allEmployees, allLabours, subcontractors] = await Promise.all([
    prisma.team.findMany({
      orderBy: { name: 'asc' },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
        },
        workers: {
          select: { id: true, name: true, role: true, status: true, dailyWage: true },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: { in: ['EMPLOYEE', 'MANAGER'] } },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    }),
    prisma.worker.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, role: true, status: true },
      orderBy: { name: 'asc' },
    }),
    prisma.subcontractor.findMany({
      orderBy: { name: 'asc' },
      include: { members: { select: { id: true, name: true, role: true } } },
    }),
  ]);

  const isAdmin = session?.user?.role === 'ADMIN';

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Teams"
        description={`${teams.length} internal team${teams.length !== 1 ? 's' : ''}`}
      />
      <div className="flex-1 p-6 animate-fade-in">
        <TeamsManager
          initialTeams={teams as any}
          allEmployees={allEmployees}
          allLabours={allLabours as any}
          isAdmin={isAdmin}
        />
        <SubcontractorsManager initial={subcontractors as any} canDelete={isAdmin} />
      </div>
    </div>
  );
}
