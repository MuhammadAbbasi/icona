export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { Header } from '@/components/layout/Header';
import { FinancialStatements } from '@/components/finance/FinancialStatements';
import { trialBalanceReport, balanceSheet, incomeStatement, bankCashBalances } from '@/lib/ledger/statements';
import { apAging } from '@/lib/ledger/apAging';
import { wipReport } from '@/lib/ledger/wip';

export const metadata = { title: 'Financial Statements' };

export default async function StatementsPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role ?? '';
  if (!['ADMIN', 'MANAGER'].includes(role)) redirect('/');

  // All read from the current ledger state (no mutation on load). The "Refresh
  // from ledger" button re-runs the projector to sync it with the source data.
  const [trialBalance, bs, pnl, bankCash, ap, wip] = await Promise.all([
    trialBalanceReport(),
    balanceSheet(),
    incomeStatement(),
    bankCashBalances(),
    apAging(null),
    wipReport(null),
  ]);

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Financial Statements" description="Double-entry general ledger reports across the company" />
      <div className="flex-1 p-6 animate-fade-in">
        <FinancialStatements data={{ trialBalance, balanceSheet: bs, incomeStatement: pnl, bankCash, apAging: ap, wip }} />
      </div>
    </div>
  );
}
