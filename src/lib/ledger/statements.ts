// GL-derived financial statements: Trial Balance, Balance Sheet, Profit & Loss,
// and a Bank/Cash position. All are read from the journal (single source of
// truth) and joined with the chart of accounts for names. Amounts are returned
// as strings so they serialize cleanly to client components.

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { trialBalance } from './balances';

type Client = typeof prisma | Prisma.TransactionClient;

async function accountsById(client: Client) {
  const rows = await client.ledgerAccount.findMany({
    select: { id: true, code: true, name: true, type: true, isGroup: true },
  });
  return new Map(rows.map((a) => [a.id, a]));
}

export interface StatementLine { code: string; name: string; amount: string }

export async function trialBalanceReport(client: Client = prisma) {
  const tb = await trialBalance(client);
  const meta = await accountsById(client);
  const rows = tb.accounts
    .map((a) => {
      const m = meta.get(a.accountId);
      return m && !m.isGroup ? { code: m.code, name: m.name, type: m.type, debit: a.debit.toString(), credit: a.credit.toString() } : null;
    })
    .filter(Boolean)
    .sort((a, b) => (a!.code || '').localeCompare(b!.code || ''));
  return { rows: rows as { code: string; name: string; type: string; debit: string; credit: string }[], totalDebit: tb.totalDebit.toString(), totalCredit: tb.totalCredit.toString(), balanced: tb.balanced };
}

/** Net income for the period = income (credit) - expense (debit). */
async function periodNetIncome(client: Client): Promise<Prisma.Decimal> {
  const tb = await trialBalance(client);
  const meta = await accountsById(client);
  let income = new Prisma.Decimal(0);
  let expense = new Prisma.Decimal(0);
  for (const a of tb.accounts) {
    const m = meta.get(a.accountId);
    if (!m || m.isGroup) continue;
    if (m.type === 'INCOME') income = income.add(a.balance.negated());
    else if (m.type === 'EXPENSE') expense = expense.add(a.balance);
  }
  return income.sub(expense);
}

export async function balanceSheet(client: Client = prisma) {
  const tb = await trialBalance(client);
  const meta = await accountsById(client);

  const assets: StatementLine[] = [];
  const liabilities: StatementLine[] = [];
  const equity: StatementLine[] = [];
  let totalAssets = new Prisma.Decimal(0);
  let totalLiabilities = new Prisma.Decimal(0);
  let totalEquity = new Prisma.Decimal(0);

  for (const a of tb.accounts) {
    const m = meta.get(a.accountId);
    if (!m || m.isGroup) continue;
    // Assets are debit-positive; liabilities/equity are credit-positive.
    if (m.type === 'ASSET') {
      if (a.balance.isZero()) continue;
      assets.push({ code: m.code, name: m.name, amount: a.balance.toString() });
      totalAssets = totalAssets.add(a.balance);
    } else if (m.type === 'LIABILITY') {
      const v = a.balance.negated();
      if (v.isZero()) continue;
      liabilities.push({ code: m.code, name: m.name, amount: v.toString() });
      totalLiabilities = totalLiabilities.add(v);
    } else if (m.type === 'EQUITY') {
      const v = a.balance.negated();
      if (v.isZero()) continue;
      equity.push({ code: m.code, name: m.name, amount: v.toString() });
      totalEquity = totalEquity.add(v);
    }
  }

  // Current-period earnings (income - expense) belong to equity.
  const netIncome = await periodNetIncome(client);
  if (!netIncome.isZero()) {
    equity.push({ code: '', name: 'Current Period Earnings', amount: netIncome.toString() });
    totalEquity = totalEquity.add(netIncome);
  }

  const rightSide = totalLiabilities.add(totalEquity);
  return {
    assets, liabilities, equity,
    totalAssets: totalAssets.toString(),
    totalLiabilities: totalLiabilities.toString(),
    totalEquity: totalEquity.toString(),
    liabilitiesPlusEquity: rightSide.toString(),
    balanced: totalAssets.equals(rightSide),
  };
}

export async function incomeStatement(client: Client = prisma) {
  const tb = await trialBalance(client);
  const meta = await accountsById(client);

  const income: StatementLine[] = [];
  const expense: StatementLine[] = [];
  let incomeTotal = new Prisma.Decimal(0);
  let expenseTotal = new Prisma.Decimal(0);

  for (const a of tb.accounts) {
    const m = meta.get(a.accountId);
    if (!m || m.isGroup) continue;
    if (m.type === 'INCOME') {
      const v = a.balance.negated();
      if (v.isZero()) continue;
      income.push({ code: m.code, name: m.name, amount: v.toString() });
      incomeTotal = incomeTotal.add(v);
    } else if (m.type === 'EXPENSE') {
      if (a.balance.isZero()) continue;
      expense.push({ code: m.code, name: m.name, amount: a.balance.toString() });
      expenseTotal = expenseTotal.add(a.balance);
    }
  }

  const netProfit = incomeTotal.sub(expenseTotal);
  return {
    income, expense,
    incomeTotal: incomeTotal.toString(),
    expenseTotal: expenseTotal.toString(),
    netProfit: netProfit.toString(),
  };
}

/** Cash + bank ledger balances (the cash position). */
export async function bankCashBalances(client: Client = prisma) {
  const accts = await client.ledgerAccount.findMany({
    where: { OR: [{ code: '1100' }, { code: '1150' }, { bankAccountId: { not: null } }] },
    select: { id: true, name: true },
  });
  const tb = await trialBalance(client);
  const byId = new Map(tb.accounts.map((a) => [a.accountId, a.balance]));
  const rows: StatementLine[] = [];
  let total = new Prisma.Decimal(0);
  for (const a of accts) {
    const bal = byId.get(a.id) ?? new Prisma.Decimal(0);
    rows.push({ code: '', name: a.name, amount: bal.toString() });
    total = total.add(bal);
  }
  return { rows, total: total.toString() };
}
