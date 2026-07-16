// Bank reconciliation: import a statement, match its lines to ledger lines on
// the bank account, and surface the unmatched ones as reconciling items so an
// uncleared cheque or a missing entry can never hide.

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { resolveMoneyAccountId } from './provision';

type Client = typeof prisma | Prisma.TransactionClient;

export async function createReconciliation(
  input: { bankAccountId: string; statementDate: Date; closingBalance: number | string; createdById?: string | null },
  client: Client = prisma,
) {
  return client.bankReconciliation.create({
    data: {
      bankAccountId: input.bankAccountId,
      statementDate: input.statementDate,
      closingBalance: new Prisma.Decimal(input.closingBalance),
      createdById: input.createdById ?? null,
    },
  });
}

export async function addStatementLines(
  reconciliationId: string,
  lines: { date: Date; description?: string | null; amount: number | string }[],
  client: Client = prisma,
) {
  if (!lines.length) return 0;
  await client.bankStatementLine.createMany({
    data: lines.map((l) => ({
      reconciliationId,
      date: l.date,
      description: l.description ?? null,
      amount: new Prisma.Decimal(l.amount),
    })),
  });
  return lines.length;
}

/** Match a statement line to a ledger line (one-to-one). */
export async function matchStatementLine(statementLineId: string, journalLineId: string, client: Client = prisma) {
  return client.bankStatementLine.update({
    where: { id: statementLineId },
    data: { matchedJournalLineId: journalLineId },
  });
}

export async function unmatchedStatementLines(reconciliationId: string, client: Client = prisma) {
  return client.bankStatementLine.findMany({
    where: { reconciliationId, matchedJournalLineId: null },
    orderBy: { date: 'asc' },
  });
}

/** Ledger lines on a bank account that are not yet matched to any statement line
 *  - the "outstanding" / uncleared items (e.g. issued but uncleared cheques). */
export async function unclearedLedgerLines(bankAccountId: string, client: Client = prisma) {
  const accountId = await resolveMoneyAccountId(bankAccountId, client);
  const matched = await client.bankStatementLine.findMany({
    where: { matchedJournalLineId: { not: null } },
    select: { matchedJournalLineId: true },
  });
  const matchedIds = matched.map((m) => m.matchedJournalLineId as string);
  return client.journalLine.findMany({
    where: { accountId, id: { notIn: matchedIds.length ? matchedIds : ['__none__'] } },
    orderBy: { createdAt: 'asc' },
  });
}
