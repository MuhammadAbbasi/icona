// The one and only way money enters the books. Validates that an entry is
// balanced (sum of debits == sum of credits), that amounts are positive, and
// that accounts are postable (leaf + active); creates the entry and its lines
// atomically; and is idempotent by `idempotencyKey` so a source event can never
// post twice. Nothing else may write a balance.

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import type { PostInput } from './types';

type Client = typeof prisma | Prisma.TransactionClient;

export async function postJournal(input: PostInput, client: Client = prisma) {
  if (!input.idempotencyKey) throw new Error('postJournal: idempotencyKey is required');

  // Already posted? Return it unchanged (idempotent).
  const existing = await client.journalEntry.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    include: { lines: true },
  });
  if (existing) return existing;

  if (!input.lines || input.lines.length < 2) {
    throw new Error('postJournal: an entry needs at least two lines');
  }

  const codes = Array.from(new Set(input.lines.map((l) => l.accountCode).filter(Boolean) as string[]));
  const ids = Array.from(new Set(input.lines.map((l) => l.accountId).filter(Boolean) as string[]));
  const or: Prisma.LedgerAccountWhereInput[] = [];
  if (codes.length) or.push({ code: { in: codes } });
  if (ids.length) or.push({ id: { in: ids } });
  const accounts = or.length ? await client.ledgerAccount.findMany({ where: { OR: or } }) : [];
  const byCode = new Map(accounts.map((a) => [a.code, a]));
  const byId = new Map(accounts.map((a) => [a.id, a]));

  let debit = new Prisma.Decimal(0);
  let credit = new Prisma.Decimal(0);

  const lineData = input.lines.map((l) => {
    const acc = l.accountId ? byId.get(l.accountId) : l.accountCode ? byCode.get(l.accountCode) : undefined;
    if (!acc) throw new Error(`postJournal: unknown ledger account ${l.accountId ?? l.accountCode}`);
    if (acc.isGroup) throw new Error(`postJournal: cannot post to group account ${acc.code}`);
    if (!acc.active) throw new Error(`postJournal: account ${acc.code} is inactive`);

    const amount = new Prisma.Decimal(l.amount);
    if (amount.lte(0)) throw new Error('postJournal: line amount must be greater than 0');
    if (l.side === 'D') debit = debit.add(amount);
    else if (l.side === 'C') credit = credit.add(amount);
    else throw new Error(`postJournal: side must be D or C, got ${l.side}`);

    return {
      accountId: acc.id,
      side: l.side,
      amount,
      projectId: l.projectId ?? input.projectId ?? null,
      costCode: l.costCode ?? null,
      partyType: l.partyType ?? null,
      partyId: l.partyId ?? null,
      againstVoucherType: l.againstVoucherType ?? null,
      againstVoucherId: l.againstVoucherId ?? null,
      memo: l.memo ?? null,
    };
  });

  if (!debit.equals(credit)) {
    throw new Error(`postJournal: unbalanced entry (debit ${debit.toString()} != credit ${credit.toString()})`);
  }

  try {
    // A create with nested line creates is a single atomic write.
    return await client.journalEntry.create({
      data: {
        postingDate: input.postingDate,
        voucherType: input.voucherType,
        voucherId: input.voucherId ?? null,
        idempotencyKey: input.idempotencyKey,
        projectId: input.projectId ?? null,
        memo: input.memo ?? null,
        reversalOfId: input.reversalOfId ?? null,
        createdById: input.createdById ?? null,
        lines: { create: lineData },
      },
      include: { lines: true },
    });
  } catch (e: unknown) {
    // Concurrent post with the same key: the unique constraint saved us.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const again = await client.journalEntry.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { lines: true },
      });
      if (again) return again;
    }
    throw e;
  }
}
