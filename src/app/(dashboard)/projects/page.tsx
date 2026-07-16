export const dynamic = 'force-dynamic'
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/Header';
import { ProjectsGrid } from '@/components/projects/ProjectsGrid';
import { AddProjectButton } from '@/components/projects/AddProjectButton';

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: { companyIds?: string };
}) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  const selectedCompanyIds = typeof searchParams?.companyIds === 'string'
    ? searchParams.companyIds.split(',').filter(Boolean)
    : [];

  const projectFilter: any = { deletedAt: null };
  if (role === 'CLIENT') {
    projectFilter.company = { users: { some: { id: session?.user?.id } } };
  }
  if (selectedCompanyIds.length > 0) {
    projectFilter.ownerCompanyId = { in: selectedCompanyIds };
  }

  const fetchDeleted = role === 'ADMIN';

  const [projects, deletedProjects, companies] = await Promise.all([
    prisma.project.findMany({
      where: projectFilter,
      orderBy: { updatedAt: 'desc' },
      include: {
        company: { select: { id: true, name: true } },
        ownerCompany: { select: { id: true, name: true } },
        domains: {
          include: {
            tasks: { select: { id: true, status: true } },
          },
        },
      },
    }),
    fetchDeleted
      ? prisma.project.findMany({
          where: {
            deletedAt: { not: null },
            ...(selectedCompanyIds.length > 0 ? { ownerCompanyId: { in: selectedCompanyIds } } : {}),
          },
          orderBy: { updatedAt: 'desc' },
          include: {
            company: { select: { id: true, name: true } },
            ownerCompany: { select: { id: true, name: true } },
            domains: {
              include: {
                tasks: { select: { id: true, status: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
    prisma.company.findMany({ select: { id: true, name: true, type: true }, orderBy: { name: 'asc' } }),
  ]);

  const ownCompanies = companies.filter((c) => c.type === 'MAIN');
  const canCreate = ['ADMIN', 'MANAGER'].includes(role ?? '');

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Projects"
        description={`${projects.length} project${projects.length !== 1 ? 's' : ''} in your workspace`}
        ownCompanies={ownCompanies}
        action={canCreate ? <AddProjectButton companies={companies} /> : undefined}
      />
      <div className="flex-1 p-6 animate-fade-in">
        <ProjectsGrid
          projects={projects as any}
          deletedProjects={deletedProjects as any}
          isAdmin={role === 'ADMIN'}
        />
      </div>
    </div>
  );
}
