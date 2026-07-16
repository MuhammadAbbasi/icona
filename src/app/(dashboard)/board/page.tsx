export const dynamic = 'force-dynamic'
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/Header';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { AddProjectButton } from '@/components/projects/AddProjectButton';
import { mergeColumnLabels } from '@/lib/utils';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { companyIds?: string };
}) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role ?? '';
  const canDrag = ['ADMIN', 'MANAGER'].includes(role);
  const canEditColumns = role === 'ADMIN';

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

  const [projects, companies, columnOverrides] = await Promise.all([
    prisma.project.findMany({
      where: projectFilter,
      orderBy: { updatedAt: 'desc' },
      include: {
        company: { select: { id: true, name: true } },
        ownerCompany: { select: { id: true, name: true } },
        domains: {
          include: {
            tasks: {
              select: {
                status: true,
                subtasks: { select: { completed: true, quantity: true, rate: true } },
              },
            },
          },
        },
      },
    }),
    prisma.company.findMany({ select: { id: true, name: true, type: true }, orderBy: { name: 'asc' } }),
    prisma.boardColumn.findMany({ select: { id: true, label: true } }),
  ]);

  const columns = mergeColumnLabels(columnOverrides);

  // Per-project client collection (Σ INCOME) for the "Collected vs Budget" bar.
  const projectIds = projects.map((p) => p.id);
  
  const [incomeByProject, unpaidExpensesByProject, loansByProject] = await Promise.all([
    projectIds.length
      ? prisma.transaction.groupBy({
          by: ['projectId'],
          where: { type: 'INCOME', projectId: { in: projectIds } },
          _sum: { amount: true },
        })
      : Promise.resolve([]),
    projectIds.length
      ? prisma.transaction.groupBy({
          by: ['projectId'],
          where: { type: 'EXPENSE', isPaid: false, projectId: { in: projectIds } },
          _sum: { amount: true },
        })
      : Promise.resolve([]),
    projectIds.length
      ? prisma.loan.findMany({
          where: { projectId: { in: projectIds } },
          select: { projectId: true, amount: true, interestAmount: true, amountPaid: true }
        })
      : Promise.resolve([])
  ]);

  const receivedMap = new Map(incomeByProject.map((g) => [g.projectId, g._sum.amount ?? 0]));
  const unpaidMap = new Map(unpaidExpensesByProject.map((g) => [g.projectId, g._sum.amount ?? 0]));
  
  const loansMap = new Map<string, number>();
  for (const l of loansByProject) {
    const outstanding = (l.amount + l.interestAmount) - l.amountPaid;
    loansMap.set(l.projectId, (loansMap.get(l.projectId) ?? 0) + outstanding);
  }

  const projectsWithFinance = projects.map((p) => {
    const received = receivedMap.get(p.id) ?? 0;
    const unpaidExpenses = unpaidMap.get(p.id) ?? 0;
    const loansOutstanding = loansMap.get(p.id) ?? 0;
    const outstandingLiabilities = unpaidExpenses + loansOutstanding;
    return {
      ...p,
      received,
      outstandingLiabilities
    };
  });

  const ownCompanies = companies.filter((c) => c.type === 'MAIN');
  const totalCount = projects.length;
  const ongoingCount = projects.filter((p) => p.status === 'ONGOING').length;
  const reviewCount = projects.filter((p) => p.status === 'UNDER_REVIEW' || p.status === 'UNDER_CUSTOMER_REVIEW').length;
  const completedCount = projects.filter((p) => p.status === 'COMPLETED').length;

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Project Board"
        description={`${projects.length} projects across all phases`}
        ownCompanies={ownCompanies}
        center={
          <div className="flex items-center gap-3 text-xs bg-muted/40 px-4 py-1.5 rounded-full border border-border/60 shadow-sm">
            <div className="flex items-center gap-1.5 text-foreground/80 font-medium">
              <span className="font-semibold text-foreground">{totalCount}</span> Total
            </div>
            <span className="text-muted-foreground/30 font-light">|</span>
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
              <span className="font-semibold">{ongoingCount}</span> Ongoing
            </div>
            <span className="text-muted-foreground/30 font-light">|</span>
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
              <span className="font-semibold">{reviewCount}</span> In Review
            </div>
            <span className="text-muted-foreground/30 font-light">|</span>
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="font-semibold">{completedCount}</span> Completed
            </div>
          </div>
        }
        action={
          canDrag ? <AddProjectButton companies={companies} /> : undefined
        }
      />
      <div className="flex-1 overflow-hidden p-6">
        <KanbanBoard
          initialProjects={projectsWithFinance as any}
          initialColumns={columns}
          canDrag={canDrag}
          canEditColumns={canEditColumns}
        />
      </div>
    </div>
  );
}
