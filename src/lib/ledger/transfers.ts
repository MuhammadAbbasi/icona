// Bank/cash money movements as vouchers. A transfer creates a BankTransfer
// record and posts one balanced entry (Dr destination / Cr source), so total
// assets are unchanged and both sides always reconcile.

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { postJournal } from './postJournal';
import { resolveMoneyAccountId, CASH_ENDPOINT } from './provision';

type Client = typeof prisma | Prisma.TransactionClient;

export interface TransferInput {
  /** "CASH" or a bankAccountId. */
  from: string;
  /** "CASH" or a bankAccountId. */
  to: string;
  amount: number | string;
  date?: Date;
  memo?: string | null;
  createdById?: string | null;
}

export async function postBankTransfer(input: TransferInput, client: Client = prisma) {
  if (input.from === input.to) throw new Error('Transfer source and destination must differ');
  const amount = new Prisma.Decimal(input.amount);
  if (amount.lte(0)) throw new Error('Transfer amount must be greater than 0');

  const fromAccountId = await resolveMoneyAccountId(input.from, client);
  const toAccountId = await resolveMoneyAccountId(input.to, client);
  const date = input.date ?? new Date();

  const transfer = await client.bankTransfer.create({
    data: {
      fromBankAccountId: input.from === CASH_ENDPOINT ? null : input.from,
      toBankAccountId: input.to === CASH_ENDPOINT ? null : input.to,
      amount,
      date,
      memo: input.memo ?? null,
      createdById: input.createdById ?? null,
    },
  });

  const entry = await postJournal(
    {
      postingDate: date,
      voucherType: 'BANK_TRANSFER',
      voucherId: transfer.id,
      idempotencyKey: `BANK_TRANSFER:${transfer.id}`,
      memo: input.memo ?? null,
      createdById: input.createdById ?? null,
      lines: [
        { accountId: toAccountId, side: 'D', amount: amount.toString() },
        { accountId: fromAccountId, side: 'C', amount: amount.toString() },
      ],
    },
    client,
  );

  await client.bankTransfer.update({ where: { id: transfer.id }, data: { journalEntryId: entry.id } });
  return { transfer, entry };
}
