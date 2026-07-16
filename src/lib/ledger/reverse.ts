// Corrections are never edits or deletes. To undo a posted entry we post its
// mirror image (debits and credits swapped) and mark the original VOIDED, linked
// to its reversal. Both remain on the books and net to zero, so the audit trail
// is intact and balances stay correct.

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { postJournal } from './postJournal';

type Client = typeof prisma | Prisma.TransactionClient;

export async function reverseEntry(entryId: string, reason: string, client: Client = prisma) {
  const entry = await client.journalEntry.findUnique({
    where: { id: entryId },
    include: { lines: true },
  });
  if (!entry) throw new Error('reverseEntry: entry not found');
  if (entry.status === 'VOIDED') throw new Error('reverseEntry: entry is already reversed');

  const reversal = await postJournal(
    {
      postingDate: new Date(),
      voucherType: 'JOURNAL',
      voucherId: entry.id,
      idempotencyKey: `REVERSAL:${entry.id}`,
      projectId: entry.projectId,
      memo: `Reversal of ${entry.voucherType} ${entry.voucherId ?? entry.id}: ${reason}`,
      reversalOfId: entry.id,
      lines: entry.lines.map((l) => ({
        accountId: l.accountId,
        side: l.side === 'D' ? 'C' : 'D',
        amount: l.amount.toString(),
        projectId: l.projectId,
        costCode: l.costCode,
        partyType: l.partyType,
        partyId: l.partyId,
        againstVoucherType: l.againstVoucherType,
        againstVoucherId: l.againstVoucherId,
        memo: l.memo,
      })),
    },
    client,
  );

  await client.journalEntry.update({ where: { id: entry.id }, data: { status: 'VOIDED' } });
  return reversal;
}
