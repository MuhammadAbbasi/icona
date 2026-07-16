// Accounts Payable aging. Reads the unpaid EXPENSE transactions (your source of
// truth for bills) and buckets them by how overdue they are, so nothing on hold
// or delayed can hide. `apLedgerCheck` proves the GL Accounts Payable balance
// equals the outstanding total (the projector and the source stay in step).

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { accountBalance } from './balances';

type Client = typeof prisma | Prisma.TransactionClient;

export interface AgingItem {
  id: string;
  projectId: string;
  amount: number;
  dueDate: Date | null;
  category: string | null;
  description: string | null;
  vendorInvoiceNo: string | null;
  workerId: string | null;
  bucket: 'current' | 'd1_30' | 'd31_60' | 'd61_90' | 'd90plus';
  daysOverdue: number;
}

const DAY = 24 * 60 * 60 * 1000;

function bucketFor(dueDate: Date | null, asOf: Date): { bucket: AgingItem['bucket']; days: number } {
  if (!dueDate) return { bucket: 'current', days: 0 };
  const days = Math.floor((asOf.getTime() - new Date(dueDate).getTime()) / DAY);
  if (days <= 0) return { bucket: 'current', days: 0 };
  if (days <= 30) return { bucket: 'd1_30', days };
  if (days <= 60) return { bucket: 'd31_60', days };
  if (days <= 90) return { bucket: 'd61_90', days };
  return { bucket: 'd90plus', days };
}

export async function apAging(projectId: string | null = null, asOf: Date = new Date(), client: Client = prisma) {
  const bills = await client.transaction.findMany({
    where: { type: 'EXPENSE', isPaid: false, ...(projectId ? { projectId } : {}) },
    select: {
      id: true, projectId: true, amount: true, dueDate: true,
      category: true, description: true, vendorInvoiceNo: true, workerId: true,
    },
    orderBy: { dueDate: 'asc' },
  });

  const totals = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90plus: 0 };
  const items: AgingItem[] = bills.map((b) => {
    const { bucket, days } = bucketFor(b.dueDate, asOf);
    totals[bucket] += b.amount;
    return { ...b, bucket, daysOverdue: days };
  });

  const total = items.reduce((s, i) => s + i.amount, 0);
  return { items, totals, total };
}

/** Tie-out: the GL Accounts Payable credit balance must equal the outstanding
 *  unpaid total. Any drift means the projector needs to run. */
export async function apLedgerCheck(client: Client = prisma) {
  const ap = await client.ledgerAccount.findUnique({ where: { code: '2100' }, select: { id: true } });
  const glCredit = ap ? (await accountBalance(ap.id, client)).balance.negated() : new Prisma.Decimal(0);
  const { total } = await apAging(null, new Date(), client);
  const unpaid = new Prisma.Decimal(total);
  return {
    glApCredit: glCredit.toString(),
    unpaidSum: unpaid.toString(),
    matches: glCredit.equals(unpaid),
  };
}
