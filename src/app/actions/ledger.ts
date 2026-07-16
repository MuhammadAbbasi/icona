'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { seedChartOfAccounts } from '@/lib/ledger/coa';
import { trialBalance, accountBalance } from '@/lib/ledger/balances';
import { provisionAllBankLedgers, ensureBankLedger } from '@/lib/ledger/provision';
import { projectTransactions } from '@/lib/ledger/projector';
import { projectFinance } from '@/lib/ledger/financeProjector';
import { apAging, apLedgerCheck } from '@/lib/ledger/apAging';
import { wipReport, revenueLedgerCheck } from '@/lib/ledger/wip';
import { acquireSyncLock, releaseSyncLock } from '@/lib/ledger/sync';

/** Seed / refresh the Chart of Accounts. Idempotent. ADMIN only. */
export async function seedCoaAction() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') return { ok: false, error: 'Forbidden' };
  const count = await seedChartOfAccounts();
  return { ok: true, accounts: count };
}

/** Trial balance snapshot (must be balanced). ADMIN / MANAGER. */
export async function trialBalanceAction() {
  const session = await getServerSession(authOptions);
  if (!['ADMIN', 'MANAGER'].includes(session?.user?.role ?? '')) return { ok: false, error: 'Forbidden' };
  const tb = await trialBalance();
  return {
    ok: true,
    balanced: tb.balanced,
    totalDebit: tb.totalDebit.toString(),
    totalCredit: tb.totalCredit.toString(),
    accountCount: tb.accounts.length,
  };
}

/** GL-derived balance for each bank account plus Cash in Hand. Kept separate
 *  from the legacy getBankAccounts() until the Phase 5 cut-over. ADMIN/MANAGER. */
export async function getBankLedgerBalances() {
  const session = await getServerSession(authOptions);
  if (!['ADMIN', 'MANAGER'].includes(session?.user?.role ?? '')) return { ok: false, error: 'Forbidden' };

  await provisionAllBankLedgers();
  const banks = await prisma.bankAccount.findMany({ orderBy: { name: 'asc' } });

  const accounts: { id: string; name: string; balance: string }[] = [];
  for (const b of banks) {
    const ledger = await ensureBankLedger(b);
    const bal = await accountBalance(ledger.id);
    accounts.push({ id: b.id, name: b.name, balance: bal.balance.toString() });
  }

  const cash = await prisma.ledgerAccount.findUnique({ where: { code: '1100' }, select: { id: true } });
  const cashBal = cash ? (await accountBalance(cash.id)).balance.toString() : '0';

  return { ok: true, accounts, cash: cashBal };
}

/** Project EXPENSE + INCOME transactions into the ledger (non-invasive mirror).
 *  Idempotent and change-aware. ADMIN / MANAGER. Returns AP + revenue tie-outs. */
export async function projectLedgerAction(projectId?: string) {
  const session = await getServerSession(authOptions);
  if (!['ADMIN', 'MANAGER'].includes(session?.user?.role ?? '')) return { ok: false, error: 'Forbidden' };

  // Single-flight: if another refresh is already running, don't pile on.
  if (!(await acquireSyncLock())) {
    return { ok: false, busy: true, error: 'A ledger refresh is already running. Try again in a moment.' };
  }
  try {
    const count = await projectTransactions(projectId ?? null);
    const finance = await projectFinance(projectId ?? null);
    const ap = await apLedgerCheck();
    const rev = await revenueLedgerCheck();
    const tb = await trialBalance();
    return { ok: true, projectedTransactions: count, finance, ap, revenue: rev, trialBalanced: tb.balanced };
  } finally {
    await releaseSyncLock();
  }
}

/** Accounts Payable aging (unpaid bills by overdue bucket). ADMIN / MANAGER. */
export async function getApAging(projectId?: string) {
  const session = await getServerSession(authOptions);
  if (!['ADMIN', 'MANAGER'].includes(session?.user?.role ?? '')) return { ok: false, error: 'Forbidden' };
  const aging = await apAging(projectId ?? null);
  return { ok: true, ...aging };
}

/** WIP / over-under billing per project (BOQ earned value vs money billed).
 *  ADMIN / MANAGER. */
export async function getWipReport(projectId?: string) {
  const session = await getServerSession(authOptions);
  if (!['ADMIN', 'MANAGER'].includes(session?.user?.role ?? '')) return { ok: false, error: 'Forbidden' };
  const rows = await wipReport(projectId ?? null);
  return { ok: true, rows };
}
