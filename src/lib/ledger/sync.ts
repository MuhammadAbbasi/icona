// Inline, non-blocking ledger sync. Each finance action calls the relevant
// `syncX(id)` after it commits (fire-and-forget: `void syncX(id)`); on the
// in-process host the projection completes without the user waiting. Every
// function projects exactly one source record (idempotent + change-aware) or, if
// the record is gone, reverses its ledger entries. All errors are swallowed and
// logged so a projection hiccup can never break a save; the manual "Refresh from
// ledger" reconciles anything missed.

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { reverseEntry } from './reverse';
import { projectTxn } from './projector';
import {
  projectLoan, projectLoanRepayment, projectInvestment, projectInvestorPayout, projectOverhead,
} from './financeProjector';

type Client = typeof prisma | Prisma.TransactionClient;

/** Reverse every still-POSTED ledger entry created for a source voucher (used
 *  when the source row has been deleted). */
async function reverseAllForVoucher(voucherId: string, client: Client): Promise<void> {
  const entries = await client.journalEntry.findMany({
    where: { voucherId, status: 'POSTED' },
    select: { id: true },
  });
  for (const e of entries) await reverseEntry(e.id, 'source deleted', client);
}

async function safe(fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    console.error('[ledger sync]', e);
  }
}

// ── Single-flight guard for the batch reconcile ──────────────────────────────
// Atomic compare-and-set so ten concurrent "Refresh from ledger" clicks result
// in exactly one running projection; the rest return immediately.
export async function acquireSyncLock(): Promise<boolean> {
  await prisma.ledgerSyncState.upsert({ where: { id: 'singleton' }, create: { id: 'singleton', running: false }, update: {} });
  const res = await prisma.ledgerSyncState.updateMany({ where: { id: 'singleton', running: false }, data: { running: true } });
  return res.count > 0;
}

export async function releaseSyncLock(): Promise<void> {
  await prisma.ledgerSyncState.updateMany({ where: { id: 'singleton' }, data: { running: false, lastRunAt: new Date() } });
}

export function syncTransaction(id: string, client: Client = prisma): Promise<void> {
  return safe(async () => {
    const txn = await client.transaction.findUnique({
      where: { id },
      select: {
        id: true, type: true, amount: true, date: true, category: true,
        description: true, isPaid: true, bankAccountId: true, workerId: true, ownerId: true, projectId: true,
      },
    });
    if (!txn) return reverseAllForVoucher(id, client);
    await projectTxn(txn as any, client);
  });
}

export function syncLoan(id: string, client: Client = prisma): Promise<void> {
  return safe(async () => {
    const loan = await client.loan.findUnique({ where: { id } });
    if (!loan) return reverseAllForVoucher(id, client);
    await projectLoan(loan as any, client);
  });
}

export function syncLoanRepayment(id: string, client: Client = prisma): Promise<void> {
  return safe(async () => {
    const rep = await client.loanRepayment.findUnique({
      where: { id },
      include: { loan: { select: { projectId: true, provider: true } } },
    });
    if (!rep) return reverseAllForVoucher(id, client);
    await projectLoanRepayment({ ...rep, projectId: rep.loan.projectId, provider: rep.loan.provider } as any, client);
  });
}

export function syncInvestment(id: string, client: Client = prisma): Promise<void> {
  return safe(async () => {
    const inv = await client.investment.findUnique({ where: { id }, include: { investor: { select: { name: true } } } });
    if (!inv) return reverseAllForVoucher(id, client);
    await projectInvestment({ ...inv, investorName: inv.investor?.name ?? null } as any, client);
  });
}

export function syncInvestorPayout(id: string, client: Client = prisma): Promise<void> {
  return safe(async () => {
    const p = await client.investorPayout.findUnique({ where: { id }, include: { investor: { select: { name: true } } } });
    if (!p) return reverseAllForVoucher(id, client);
    await projectInvestorPayout({ ...p, investorName: p.investor?.name ?? null } as any, client);
  });
}

export function syncOverhead(id: string, client: Client = prisma): Promise<void> {
  return safe(async () => {
    const o = await client.overheadExpense.findUnique({ where: { id } });
    if (!o) return reverseAllForVoucher(id, client);
    await projectOverhead(o as any, client);
  });
}
