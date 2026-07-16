// Work In Progress / over-under billing. Compares the value of work EARNED (BOQ
// completed value) with the value BILLED (money received via INCOME) per project.
// Overbilled = billed ahead of work done (a liability); underbilled = work ahead
// of billing (an asset). `revenueLedgerCheck` ties GL revenue to received income.

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { workValue } from '@/lib/utils';
import { accountBalance } from './balances';

type Client = typeof prisma | Prisma.TransactionClient;

export interface WipRow {
  projectId: string;
  name: string;
  contractValue: number; // total BOQ value (effective)
  earned: number;        // value of completed work
  billed: number;        // money received (INCOME)
  overUnder: number;     // billed - earned  (+ overbilled, - underbilled)
  status: 'OVERBILLED' | 'UNDERBILLED' | 'BALANCED';
}

export async function wipReport(projectId: string | null = null, client: Client = prisma): Promise<WipRow[]> {
  const projects = await client.project.findMany({
    where: { deletedAt: null, ...(projectId ? { id: projectId } : {}) },
    select: {
      id: true,
      name: true,
      domains: {
        select: {
          tasks: {
            select: {
              status: true,
              subtasks: {
                select: {
                  quantity: true, rate: true, completed: true,
                  quantityRevisions: { select: { revisionIndex: true, quantity: true, rate: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const income = await client.transaction.groupBy({
    by: ['projectId'],
    where: { type: 'INCOME', ...(projectId ? { projectId } : {}) },
    _sum: { amount: true },
  });
  const billedByProject = new Map(income.map((r) => [r.projectId, r._sum.amount ?? 0]));

  return projects.map((p) => {
    const tasks = p.domains.flatMap((d) => d.tasks);
    const wv = workValue(tasks as any);
    const billed = billedByProject.get(p.id) ?? 0;
    const overUnder = Math.round((billed - wv.completed) * 100) / 100;
    return {
      projectId: p.id,
      name: p.name,
      contractValue: wv.total,
      earned: wv.completed,
      billed,
      overUnder,
      status: overUnder > 0 ? 'OVERBILLED' : overUnder < 0 ? 'UNDERBILLED' : 'BALANCED',
    };
  });
}

/** GL Contract Revenue credit must equal total received INCOME (cash basis). */
export async function revenueLedgerCheck(client: Client = prisma) {
  const rev = await client.ledgerAccount.findUnique({ where: { code: '4100' }, select: { id: true } });
  const glCredit = rev ? (await accountBalance(rev.id, client)).balance.negated() : new Prisma.Decimal(0);
  const inc = await client.transaction.aggregate({ where: { type: 'INCOME' }, _sum: { amount: true } });
  const received = new Prisma.Decimal(inc._sum.amount ?? 0);
  return { glRevenueCredit: glCredit.toString(), incomeSum: received.toString(), matches: glCredit.equals(received) };
}
