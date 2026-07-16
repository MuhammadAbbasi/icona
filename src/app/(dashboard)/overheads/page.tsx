export const dynamic = 'force-dynamic'
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/Header';
import { OverheadsManager } from '@/components/finance/OverheadsManager';
import { DEFAULT_MONTHLY_SALARY } from '@/lib/finance';

export const metadata = { title: 'Overheads' };

const STAFF_ROLES = ['ADMIN', 'MANAGER', 'EMPLOYEE'];

export default async function OverheadsPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role ?? '';
  if (!['ADMIN', 'MANAGER'].includes(role)) redirect('/');

  const mainCompanies = (await prisma.company.findMany({
    where: { type: 'MAIN' },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  }))
    // ICON SERVICES is the primary business unit — show it first / as the default.
    .sort((a, b) =>
      a.name === 'ICON SERVICES' ? -1 : b.name === 'ICON SERVICES' ? 1 : a.name.localeCompare(b.name),
    );
  const mainIds = mainCompanies.map((c) => c.id);

  // Owned-project transactions, tagged with the executing main company, so the
  // client can roll each company's income / direct costs / drawings per period.
  const ownedProjects = await prisma.project.findMany({
    where: { ownerCompanyId: { in: mainIds }, deletedAt: null },
    select: { id: true, ownerCompanyId: true },
  });
  const projectCompany = new Map(ownedProjects.map((p) => [p.id, p.ownerCompanyId!]));
  const projectIds = ownedProjects.map((p) => p.id);

  const [rawTxns, overheads, staff] = await Promise.all([
    projectIds.length
      ? prisma.transaction.findMany({
          where: { projectId: { in: projectIds } },
          select: { type: true, amount: true, date: true, projectId: true },
        })
      : Promise.resolve([] as { type: string; amount: number; date: Date; projectId: string }[]),
    prisma.overheadExpense.findMany({
      where: { companyId: { in: mainIds } },
      orderBy: { date: 'desc' },
    }),
    prisma.user.findMany({
      where: { status: 'ACTIVE', role: { in: STAFF_ROLES } },
      select: { id: true, name: true, salary: true, companyId: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const projectTxns = rawTxns.map((t) => ({
    companyId: projectCompany.get(t.projectId)!,
    type: t.type,
    amount: t.amount,
    date: t.date.toISOString(),
  }));

  // Active staff grouped by main company — the roster for Monthly Routine Expenses.
  // Anyone with no salary on record defaults to the standard monthly figure.
  const staffByCompany = mainCompanies.map((c) => ({
    companyId: c.id,
    members: staff
      .filter((u) => u.companyId === c.id)
      .map((u) => ({ userId: u.id, name: u.name, salary: u.salary ?? DEFAULT_MONTHLY_SALARY })),
  }));
  const unassignedStaffCount = staff.filter((u) => !u.companyId || !mainIds.includes(u.companyId)).length;

  const serializedOverheads = overheads.map((o) => ({
    id: o.id,
    companyId: o.companyId,
    category: o.category,
    amount: o.amount,
    date: o.date.toISOString(),
    description: o.description,
    paymentMethod: o.paymentMethod,
    source: o.source,
    staffUserId: o.staffUserId,
    period: o.period,
  }));

  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Overheads" description="Company operating costs & profit after overheads" />
      <div className="flex-1 p-6 animate-fade-in">
        {mainCompanies.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No main companies yet. Mark a company as “Main” under Companies to start tracking its overheads.
          </p>
        ) : (
          <OverheadsManager
            mainCompanies={mainCompanies}
            projectTxns={projectTxns}
            overheads={serializedOverheads}
            staffByCompany={staffByCompany}
            unassignedStaffCount={unassignedStaffCount}
            currentPeriod={currentPeriod}
            isAdmin={role === 'ADMIN'}
          />
        )}
      </div>
    </div>
  );
}
