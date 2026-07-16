// Balances are always DERIVED from the journal, never stored in a second place.
// An original entry and its reversal both remain and cancel out, so the trial
// balance stays at zero and no figure is hidden.

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

type Client = typeof prisma | Prisma.TransactionClient;

export interface AccountBalance {
  accountId: string;
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
  balance: Prisma.Decimal; // debit - credit (positive = net debit)
}

/** Net balance for a single ledger account. */
export async function accountBalance(accountId: string, client: Client = prisma): Promise<AccountBalance> {
  const rows = await client.journalLine.groupBy({
    by: ['side'],
    where: { accountId },
    _sum: { amount: true },
  });
  let debit = new Prisma.Decimal(0);
  let credit = new Prisma.Decimal(0);
  for (const r of rows) {
    const amt = r._sum.amount ?? new Prisma.Decimal(0);
    if (r.side === 'D') debit = amt; else credit = amt;
  }
  return { accountId, debit, credit, balance: debit.sub(credit) };
}

export interface TrialBalance {
  accounts: AccountBalance[];
  totalDebit: Prisma.Decimal;
  totalCredit: Prisma.Decimal;
  /** Must always be true for a healthy ledger. */
  balanced: boolean;
}

/** Trial balance across all accounts. `balanced` must be true at all times. */
export async function trialBalance(client: Client = prisma): Promise<TrialBalance> {
  const rows = await client.journalLine.groupBy({
    by: ['accountId', 'side'],
    _sum: { amount: true },
  });

  const map = new Map<string, { debit: Prisma.Decimal; credit: Prisma.Decimal }>();
  for (const r of rows) {
    const cur = map.get(r.accountId) ?? { debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(0) };
    const amt = r._sum.amount ?? new Prisma.Decimal(0);
    if (r.side === 'D') cur.debit = cur.debit.add(amt); else cur.credit = cur.credit.add(amt);
    map.set(r.accountId, cur);
  }

  let totalDebit = new Prisma.Decimal(0);
  let totalCredit = new Prisma.Decimal(0);
  const accounts: AccountBalance[] = [];
  for (const [accountId, v] of Array.from(map.entries())) {
    totalDebit = totalDebit.add(v.debit);
    totalCredit = totalCredit.add(v.credit);
    accounts.push({ accountId, debit: v.debit, credit: v.credit, balance: v.debit.sub(v.credit) });
  }

  return { accounts, totalDebit, totalCredit, balanced: totalDebit.equals(totalCredit) };
}
