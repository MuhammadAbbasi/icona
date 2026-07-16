export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/Header';
import { ProjectHierarchy } from '@/components/projects/ProjectHierarchy';
import { ProjectSettingsButton } from '@/components/projects/ProjectSettingsButton';
import { ProjectOverviewButton } from '@/components/projects/ProjectOverviewButton';
import { ProjectDocumentsButton } from '@/components/projects/ProjectDocumentsButton';
import { ProjectMeta } from '@/components/projects/ProjectMeta';
import { ProjectLedger } from '@/components/projects/ProjectLedger';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Image as ImageIcon, ListChecks, Wallet, HardHat } from 'lucide-react';
import { STATUS_CONFIG, PRIORITY_CONFIG, formatCurrency, workValue, cn, sumAmounts, lineAmount, originalLineAmount, effectiveQuantity, effectiveRate } from '@/lib/utils';
import { computeFinancials } from '@/lib/finance';
import type { ProjectStatus, Priority } from '@/types';
import { getProjectLabourSummary, getSiteVisits } from '@/app/actions/workerLogs';
import { getProjectSubcontractors } from '@/app/actions/subcontractors';
import { ProjectLabourLog } from '@/components/projects/ProjectLabourLog';

interface Props { params: { id: string }; searchParams?: { tab?: string } }

export async function generateMetadata({ params }: Props) {
  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { name: true } });
  return { title: project?.name ?? 'Project' };
}

export default async function ProjectDetailPage({ params, searchParams }: Props) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  const canEdit = ['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(role ?? '');
  const canDelete = ['ADMIN', 'MANAGER'].includes(role ?? '');
  // Creating revisions and editing revised quantities/rates is ADMIN/MANAGER only.
  const canRevise = ['ADMIN', 'MANAGER'].includes(role ?? '');
  const canViewFinance = ['ADMIN', 'MANAGER'].includes(role ?? '');
  const isAdmin = role === 'ADMIN';

  // These reads are independent of one another — fire them together rather than
  // awaiting in series, so the page is bounded by the slowest query, not the sum.
  const [project, users, ledger] = await Promise.all([
    prisma.project.findUnique({
      where: { id: params.id },
      include: {
        company: { select: { id: true, name: true, email: true, phone: true } },
        ownerCompany: { select: { id: true, name: true } },
        boqSourceFile: { select: { id: true } },
        revisions: {
          orderBy: { index: 'asc' },
          select: { id: true, index: true, label: true, note: true, createdAt: true },
        },
        teams: {
          include: {
            workers: {
              select: {
                id: true,
                name: true,
                role: true,
                dailyWage: true,
              },
            },
          },
        },
        engagedUsers: true,
        domains: {
          orderBy: { createdAt: 'asc' },
          include: {
            tasks: {
              orderBy: { createdAt: 'asc' },
              include: {
                assignee: { select: { id: true, name: true, email: true, avatar: true } },
                subtasks: {
                  orderBy: { createdAt: 'asc' },
                  include: {
                    quantityRevisions: { select: { revisionIndex: true, quantity: true, rate: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'MANAGER', 'EMPLOYEE'] } },
      select: { id: true, name: true, role: true, companyId: true },
      orderBy: { name: 'asc' },
    }),
    // Financial ledger + owner list (staff only) — owners are ADMIN users.
    canViewFinance
      ? Promise.all([
          prisma.transaction.findMany({
            where: { projectId: params.id },
            orderBy: { date: 'desc' },
            select: {
              id: true, type: true, amount: true, date: true,
              category: true, description: true, paymentMethod: true,
              isPaid: true,
              dueDate: true,
              vendorInvoiceNo: true,
              invoiceUrl: true,
              owner: { select: { id: true, name: true } },
              recordedBy: { select: { id: true, name: true } },
            },
          }),
          prisma.user.findMany({
            where: { role: 'ADMIN' },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
          }),
          prisma.bankAccount.findMany({
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
          }),
          prisma.loan.findMany({
            where: { projectId: params.id },
            orderBy: { receivedDate: 'desc' },
            include: {
              bankAccount: { select: { name: true } },
              repayments: {
                orderBy: { date: 'desc' },
                include: {
                  bankAccount: { select: { name: true } }
                }
              }
            }
          }),
          prisma.investment.findMany({
            where: { projectId: params.id },
            orderBy: { date: 'desc' },
            include: {
              investor: { select: { name: true } },
              bankAccount: { select: { name: true } }
            }
          }),
          prisma.investorPayout.findMany({
            where: { projectId: params.id },
            orderBy: { date: 'desc' },
            include: {
              investor: { select: { name: true } },
              bankAccount: { select: { name: true } }
            }
          }),
          prisma.lender.findMany({
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
          }),
          prisma.investor.findMany({
            orderBy: { name: 'asc' },
            include: {
              investments: {
                where: {
                  OR: [
                    { projectId: null },
                    { project: { deletedAt: null } }
                  ]
                },
                select: { amount: true }
              },
              payouts: {
                where: {
                  OR: [
                    { projectId: null },
                    { project: { deletedAt: null } }
                  ]
                },
                select: { amount: true }
              }
            }
          }),
          prisma.investment.findMany({
            where: { projectId: null },
            select: { amount: true }
          }),
          prisma.investorPayout.findMany({
            where: { projectId: null },
            select: { amount: true }
          })
        ])
      : Promise.resolve<[never[], never[], never[], never[], never[], never[], never[], never[], never[], never[]]>([[], [], [], [], [], [], [], [], [], []]),
  ]);

  if (!project || project.deletedAt !== null) notFound();

  const [
    transactionsData,
    owners,
    bankAccounts,
    loansData,
    investmentsData,
    investorPayoutsData,
    lenders,
    investorsRaw,
    companyInvestmentsData,
    companyPayoutsData
  ] = ledger;

  // Serialize dates for the client component.
  const transactions = transactionsData.map((t) => ({
    ...t,
    date: t.date.toISOString(),
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
  }));

  const loans = loansData.map((l) => ({
    ...l,
    receivedDate: l.receivedDate.toISOString(),
    dueDate: l.dueDate ? l.dueDate.toISOString() : null,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
    repayments: l.repayments.map((r: any) => ({
      ...r,
      date: r.date.toISOString(),
      createdAt: r.createdAt.toISOString(),
    }))
  }));

  const investors = (investorsRaw || []).map((i: any) => {
    const totalInvested = (i.investments || []).reduce((sum: number, inv: any) => sum + inv.amount, 0);
    const totalPayouts = (i.payouts || []).reduce((sum: number, p: any) => sum + p.amount, 0);
    return {
      id: i.id,
      name: i.name,
      netOwed: totalInvested - totalPayouts,
    };
  });

  const investments = (investmentsData || []).map((inv: any) => ({
    ...inv,
    date: inv.date.toISOString(),
    createdAt: inv.createdAt.toISOString(),
  }));

  const investorPayouts = (investorPayoutsData || []).map((ip: any) => ({
    ...ip,
    date: ip.date.toISOString(),
    createdAt: ip.createdAt.toISOString(),
  }));

  const companyInvestmentsTotal = (companyInvestmentsData || []).reduce((sum: number, inv: any) => sum + inv.amount, 0);
  const companyPayoutsTotal = (companyPayoutsData || []).reduce((sum: number, p: any) => sum + p.amount, 0);

  const financials = computeFinancials(
    project.budget,
    transactions,
    loans,
    investments,
    investorPayouts,
    companyInvestmentsTotal,
    companyPayoutsTotal
  );

  const allTasks = project.domains.flatMap((d) => d.tasks);
  const doneTasks = allTasks.filter((t) => t.status === 'DONE').length;
  // Approved BOQ contract value = Σ (quantity × rate) of every priced line.
  const boqValue = workValue(allTasks).total;

  const activeTab = searchParams?.tab || 'progress';
  const labourSummary = canEdit ? await getProjectLabourSummary(project.id) : null;
  const projectSubcontractors = canEdit ? await getProjectSubcontractors(project.id) : { engaged: [], registry: [] };
  const projectSiteVisits = canEdit ? await getSiteVisits(project.id) : [];
  const staffUsers = canEdit
    ? await prisma.user.findMany({ where: { role: { in: ['ADMIN', 'MANAGER', 'EMPLOYEE'] }, status: 'ACTIVE' }, select: { id: true, name: true }, orderBy: { name: 'asc' } })
    : [];

  const projectWorkers = await prisma.worker.findMany({
    where: {
      teamId: { in: project.teams.map((t) => t.id) },
      status: 'ACTIVE',
    },
    select: {
      id: true,
      name: true,
      role: true,
      dailyWage: true,
    },
    orderBy: { name: 'asc' },
  });

  // Sort revisions by index asc
  const sortedRevisions = [...(project.revisions || [])].sort((a, b) => a.index - b.index);

  // Per-domain totals for the overview summary.
  const overviewDomains = project.domains.map((d: any) => {
    const totals = [
      // Index 0: baseline (original R0)
      d.tasks.reduce(
        (sum: number, t: any) => sum + (t.subtasks.length 
          ? t.subtasks.reduce((subSum: number, s: any) => subSum + originalLineAmount(s), 0)
          : originalLineAmount(t)),
        0
      ),
      // Index K >= 1: for each revision in sortedRevisions
      ...sortedRevisions.map((rev) => 
        d.tasks.reduce(
          (sum: number, t: any) => sum + (t.subtasks.length 
            ? t.subtasks.reduce((subSum: number, s: any) => subSum + (effectiveQuantity(s, rev.index) * effectiveRate(s, rev.index)), 0)
            : (effectiveQuantity(t, rev.index) * effectiveRate(t, rev.index))),
          0
        )
      )
    ];

    return {
      name: d.name as string,
      color: d.color as string | null,
      totals,
    };
  });

  const statusCfg = STATUS_CONFIG[project.status as ProjectStatus];
  const priorityCfg = PRIORITY_CONFIG[project.priority as Priority];

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title={project.name}
        description={project.company.name}
        action={
          <div className="flex items-center gap-2">
            <ProjectOverviewButton
              projectName={project.name}
              domains={overviewDomains}
              coveredArea={project.coveredArea}
              rebate={project.rebate}
              sstRate={project.sstRate}
              revisions={sortedRevisions}
            />
            <ProjectDocumentsButton
              projectId={project.id}
              canManage={canDelete}
              hasOriginalFile={!!project.boqSourceFile}
            />
            <Link href={`/projects/${project.id}/gallery`}>
              <Button variant="outline" className="gap-2 text-xs font-semibold h-9 border-border bg-card">
                <ImageIcon className="h-4 w-4 text-primary" />
                Photo Gallery
              </Button>
            </Link>
            {canEdit && (
              <ProjectSettingsButton
                project={{
                  id: project.id,
                  name: project.name,
                  description: project.description,
                  status: project.status,
                  priority: project.priority,
                  startDate: project.startDate,
                  endDate: project.endDate,
                  budget: project.budget,
                  coveredArea: project.coveredArea,
                  rebate: project.rebate,
                  sstRate: project.sstRate,
                }}
                isAdmin={isAdmin}
              />
            )}
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-6 animate-fade-in">
        {/* Project summary bar */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 p-5 rounded-xl border bg-card">
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-md', statusCfg?.color)}>
                {statusCfg?.label}
              </span>
              <span className={cn('text-xs font-medium flex items-center gap-1.5', priorityCfg?.color)}>
                <span className={cn('h-2 w-2 rounded-full', priorityCfg?.dot)} />
                {priorityCfg?.label} Priority
              </span>
              {project.budget && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                  Budget: {formatCurrency(project.budget)}
                </span>
              )}
            </div>
            {project.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{project.description}</p>
            )}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{doneTasks} of {allTasks.length} tasks complete</span>
                <span className="font-semibold text-foreground">{project.progress}%</span>
              </div>
              <Progress value={project.progress} className="h-2" />
            </div>
          </div>

          <ProjectMeta project={project as any} />
        </div>

        {/* Tabs switcher */}
        <div className="flex border-b border-border/60 pb-1 flex-wrap">
          <Link
            href={`/projects/${project.id}?tab=progress`}
            scroll={false}
            className={cn(
              'text-sm font-semibold px-4 py-2 border-b-2 transition-all mr-4 flex items-center gap-1.5',
              activeTab === 'progress' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <ListChecks className="h-4 w-4" /> Work &amp; Progress
          </Link>
          {canViewFinance && (
            <Link
              href={`/projects/${project.id}?tab=finance`}
              scroll={false}
              className={cn(
                'text-sm font-semibold px-4 py-2 border-b-2 transition-all mr-4 flex items-center gap-1.5',
                activeTab === 'finance' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Wallet className="h-4 w-4" /> Treasury &amp; Ledger
            </Link>
          )}
          {canEdit && (
            <Link
              href={`/projects/${project.id}?tab=labour`}
              scroll={false}
              className={cn(
                'text-sm font-semibold px-4 py-2 border-b-2 transition-all flex items-center gap-1.5',
                activeTab === 'labour' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <HardHat className="h-4 w-4" /> Labour Log
            </Link>
          )}
        </div>

        {/* Tab contents */}
        {activeTab === 'progress' && (
          <ProjectHierarchy
            domains={project.domains as any}
            projectId={project.id}
            canEdit={canEdit}
            canRevise={canRevise}
            isAdmin={isAdmin}
            revisions={project.revisions as any}
            hasOriginalFile={!!project.boqSourceFile}
            users={users}
          />
        )}

        {activeTab === 'finance' && canViewFinance && (
          <ProjectLedger
            projectId={project.id}
            transactions={transactions}
            financials={financials}
            boqValue={boqValue}
            owners={owners}
            bankAccounts={bankAccounts}
            loans={loans}
            investments={investments}
            investorPayouts={investorPayouts}
            lenders={lenders}
            investors={investors}
            canEdit={canDelete}
            canDelete={isAdmin}
          />
        )}

        {activeTab === 'labour' && canEdit && labourSummary && (
          <ProjectLabourLog
            projectId={project.id}
            summary={labourSummary}
            teamWorkers={projectWorkers}
            bankAccounts={bankAccounts || []}
            canEdit={canEdit}
            subcontractors={projectSubcontractors}
            siteVisits={projectSiteVisits}
            staffUsers={staffUsers}
          />
        )}
      </div>
    </div>
  );
}
