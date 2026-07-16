export const dynamic = 'force-dynamic'
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/Header';
import { CompaniesManager } from '@/components/companies/CompaniesManager';

export const metadata = { title: 'Companies' };

export default async function CompaniesPage() {
  const session = await getServerSession(authOptions);
  if (!['ADMIN', 'MANAGER'].includes(session?.user?.role ?? '')) redirect('/');

  const companies = await prisma.company.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { projects: true, ownerProjects: true, users: true } } },
  });

  const processedCompanies = companies.map((c) => ({
    ...c,
    _count: {
      users: c._count.users,
      projects: c.type === 'MAIN' ? c._count.ownerProjects : c._count.projects,
    },
  }));

  const isAdmin = session?.user?.role === 'ADMIN';

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Companies"
        description={`${companies.length} compan${companies.length !== 1 ? 'ies' : 'y'} in workspace`}
      />
      <div className="flex-1 p-6 animate-fade-in">
        <CompaniesManager initialCompanies={processedCompanies as any} isAdmin={isAdmin} />
      </div>
    </div>
  );
}
