export const dynamic = 'force-dynamic'
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/Header';
import { GlobalLedger } from '@/components/finance/GlobalLedger';
import { getBankAccounts } from '@/app/actions/bankAccounts';
import { getLenders } from '@/app/actions/loans';
import { getInvestors } from '@/app/actions/investments';

export const metadata = { title: 'Finances' };

export default async function LedgerPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role ?? '';
  if (!['ADMIN', 'MANAGER'].includes(role)) redirect('/');

  const [txns, projects, owners, bankAccountsResult, loansData, lendersResult, investorsResult, investmentsData, investorPayoutsData] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        project: { deletedAt: null }
      },
      orderBy: { date: 'desc' },
      select: {
        id: true, type: true, amount: true, date: true,
        category: true, description: true, paymentMethod: true,
        isPaid: true,
        vendorInvoiceNo: true,
        invoiceUrl: true,
        project: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
        recordedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.project.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, budget: true, company: { select: { name: true } } },
    }),
    prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    getBankAccounts(),
    prisma.loan.findMany({
      where: { project: { deletedAt: null } },
      include: {
        project: { select: { id: true, name: true } },
        bankAccount: { select: { name: true } },
        repayments: {
          include: {
            bankAccount: { select: { name: true } }
          }
        }
      }
    }),
    getLenders(),
    getInvestors(),
    prisma.investment.findMany({
      where: {
        OR: [
          { projectId: null },
          { project: { deletedAt: null } }
        ]
      },
      include: {
        investor: { select: { name: true } },
        project: { select: { id: true, name: true } },
        bankAccount: { select: { name: true } }
      }
    }),
    prisma.investorPayout.findMany({
      where: {
        OR: [
          { projectId: null },
          { project: { deletedAt: null } }
        ]
      },
      include: {
        investor: { select: { name: true } },
        project: { select: { id: true, name: true } },
        bankAccount: { select: { name: true } }
      }
    })
  ]);

  // Serialize dates for the client component.
  const transactions = txns.map((t: any) => ({ ...t, date: t.date.toISOString() }));
  const projectRows = projects.map((p: any) => ({
    id: p.id, name: p.name, budget: p.budget ?? 0, company: p.company.name,
  }));
  const bankAccounts = bankAccountsResult.data || [];
  const loans = loansData.map((l: any) => ({
    ...l,
    receivedDate: l.receivedDate.toISOString(),
    repayments: (l.repayments || []).map((r: any) => ({
      ...r,
      date: r.date.toISOString(),
      createdAt: r.createdAt.toISOString()
    }))
  }));
  const lenders = lendersResult.data || [];
  const investors = investorsResult.data || [];
  const investments = (investmentsData || []).map((inv: any) => ({
    ...inv,
    date: inv.date.toISOString(),
  }));
  const investorPayouts = (investorPayoutsData || []).map((p: any) => ({
    ...p,
    date: p.date.toISOString(),
  }));

  const isAdmin = role === 'ADMIN';

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Finances" description="Company-wide treasury & ledger across all projects" />
      <div className="flex-1 p-6 animate-fade-in">
        <GlobalLedger
          transactions={transactions}
          projects={projectRows}
          owners={owners}
          bankAccounts={bankAccounts}
          loans={loans}
          lenders={lenders}
          investors={investors}
          investments={investments}
          investorPayouts={investorPayouts}
          canEdit={['ADMIN', 'MANAGER'].includes(role)}
          canDelete={isAdmin}
        />
      </div>
    </div>
  );
}
