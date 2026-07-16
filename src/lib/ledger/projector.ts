// Non-invasive projector: reads the existing Transaction workflow and mirrors it
// into the double-entry ledger WITHOUT touching the transaction actions or UI.
// It is idempotent (keyed by the transaction's content signature) and
// change-aware: when a bill's amount changes (the partial-payment shrink), the
// stale entry is reversed and a fresh one posted, so the GL always matches the
// current transactions and nothing is duplicated.
//
// Scope so far: EXPENSE (Accounts Payable + cash/bank expenses) and INCOME
// (client receipts -> Contract Revenue, cash basis, matching the current
// receipts-only workflow). DRAWING/loans/investments are projected in Phase 4.

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { postJournal } from './postJournal';
import { reverseEntry } from './reverse';
import { ensureBankLedger } from './provision';

type Client = typeof prisma | Prisma.TransactionClient;

type TxnRecord = {
  id: string;
  type: string;
  amount: number;
  date: Date;
  category: string | null;
  description: string | null;
  isPaid: boolean;
  bankAccountId: string | null;
  workerId: string | null;
  ownerId: string | null;
  projectId: string;
};

// Map a transaction category (or a worker payment) to a P&L expense account.
const EXPENSE_BY_CATEGORY: Record<string, string> = {
  'Worker/Supervisor': '5200',
  Worker: '5200',
  Labour: '5200',
  Labor: '5200',
  Supplier: '5100',
  Material: '5100',
  Materials: '5100',
  Subcontractor: '5300',
  Transporter: '5400',
  Equipment: '5400',
  Utilities: '5500',
  Permits: '5500',
  Overhead: '5500',
  Misc: '5500',
};

function expenseAccountCode(txn: TxnRecord): string {
  if (txn.workerId) return '5200'; // Labour
  const c = (txn.category ?? '').trim();
  return EXPENSE_BY_CATEGORY[c] ?? '5500'; // default: Overheads
}

// The money account something settles through: a bank ledger, or Cash in Hand.
export async function moneyAccountId(bankAccountId: string | null | undefined, client: Client): Promise<string> {
  if (bankAccountId) {
    const bank = await client.bankAccount.findUnique({ where: { id: bankAccountId } });
    if (!bank) throw new Error(`Bank account ${bankAccountId} not found`);
    const led = await ensureBankLedger(bank, null, client);
    return led.id;
  }
  const cash = await client.ledgerAccount.findUnique({ where: { code: '1100' }, select: { id: true } });
  if (!cash) throw new Error('Cash in Hand (1100) missing - seed the chart of accounts');
  return cash.id;
}

const bankOrCashAccountId = (txn: TxnRecord, client: Client) => moneyAccountId(txn.bankAccountId, client);

async function creditAccountFor(txn: TxnRecord, client: Client): Promise<{ id: string; partyType: string | null; partyId: string | null }> {
  if (!txn.isPaid) {
    // Unpaid bill -> Accounts Payable liability (kept until settled).
    const ap = await client.ledgerAccount.findUnique({ where: { code: '2100' }, select: { id: true } });
    if (!ap) throw new Error('Accounts Payable (2100) missing - seed the chart of accounts');
    return { id: ap.id, partyType: txn.workerId ? 'WORKER' : 'SUPPLIER', partyId: txn.workerId ?? null };
  }
  return { id: await bankOrCashAccountId(txn, client), partyType: null, partyId: null };
}

/** Project one EXPENSE transaction into the ledger (idempotent, change-aware). */
export async function projectExpenseTxn(txn: TxnRecord, client: Client = prisma) {
  if (txn.type !== 'EXPENSE') return null;

  const amount = new Prisma.Decimal(txn.amount);
  if (amount.lte(0)) return null;

  const expenseCode = expenseAccountCode(txn);
  const credit = await creditAccountFor(txn, client);

  // Signature so a changed amount / paid-state / account produces a new key.
  const signature = `${amount.toString()}|${expenseCode}|${txn.isPaid ? 'P' : 'U'}|${credit.id}`;
  const key = `TXN:${txn.id}:${signature}`;

  const posted = await client.journalEntry.findFirst({
    where: { voucherType: 'EXPENSE', voucherId: txn.id, status: 'POSTED' },
  });
  if (posted && posted.idempotencyKey === key) return posted; // already up to date
  if (posted) await reverseEntry(posted.id, 'projection update', client); // stale -> reverse

  return postJournal(
    {
      postingDate: txn.date,
      voucherType: 'EXPENSE',
      voucherId: txn.id,
      idempotencyKey: key,
      projectId: txn.projectId,
      memo: txn.description ?? txn.category ?? 'Expense',
      lines: [
        { accountCode: expenseCode, side: 'D', amount: amount.toString(), projectId: txn.projectId },
        {
          accountId: credit.id,
          side: 'C',
          amount: amount.toString(),
          projectId: txn.projectId,
          partyType: credit.partyType,
          partyId: credit.partyId,
          againstVoucherType: 'TRANSACTION',
          againstVoucherId: txn.id,
        },
      ],
    },
    client,
  );
}

/** Project one INCOME transaction (client receipt) into the ledger. Cash basis:
 *  revenue is recognized on receipt, matching the receipts-only workflow. */
export async function projectIncomeTxn(txn: TxnRecord, client: Client = prisma) {
  if (txn.type !== 'INCOME') return null;

  const amount = new Prisma.Decimal(txn.amount);
  if (amount.lte(0)) return null;

  const moneyId = await bankOrCashAccountId(txn, client);
  const revenue = await client.ledgerAccount.findUnique({ where: { code: '4100' }, select: { id: true } });
  if (!revenue) throw new Error('Contract Revenue (4100) missing - seed the chart of accounts');

  const signature = `${amount.toString()}|INC|${moneyId}`;
  const key = `TXN:${txn.id}:${signature}`;

  const posted = await client.journalEntry.findFirst({
    where: { voucherType: 'INCOME', voucherId: txn.id, status: 'POSTED' },
  });
  if (posted && posted.idempotencyKey === key) return posted;
  if (posted) await reverseEntry(posted.id, 'projection update', client);

  return postJournal(
    {
      postingDate: txn.date,
      voucherType: 'INCOME',
      voucherId: txn.id,
      idempotencyKey: key,
      projectId: txn.projectId,
      memo: txn.description ?? txn.category ?? 'Client receipt',
      lines: [
        { accountId: moneyId, side: 'D', amount: amount.toString(), projectId: txn.projectId },
        {
          accountId: revenue.id,
          side: 'C',
          amount: amount.toString(),
          projectId: txn.projectId,
          partyType: 'CLIENT',
          againstVoucherType: 'TRANSACTION',
          againstVoucherId: txn.id,
        },
      ],
    },
    client,
  );
}

/** Project one DRAWING transaction. An owner drawing is an equity withdrawal
 *  (Dr Owner Drawings); a company payout (no owner) is a transfer into the
 *  Company Account (Dr Company Account). Both credit the bank/cash it left. */
export async function projectDrawingTxn(txn: TxnRecord, client: Client = prisma) {
  if (txn.type !== 'DRAWING') return null;

  const amount = new Prisma.Decimal(txn.amount);
  if (amount.lte(0)) return null;

  const moneyId = await moneyAccountId(txn.bankAccountId, client);
  const debitCode = txn.ownerId ? '3110' : '1150'; // Owner Drawings vs Company Account
  const debit = await client.ledgerAccount.findUnique({ where: { code: debitCode }, select: { id: true } });
  if (!debit) throw new Error(`Ledger account ${debitCode} missing - seed the chart of accounts`);

  const who = txn.ownerId ? `O:${txn.ownerId}` : 'COMPANY';
  const signature = `${amount.toString()}|DRW|${who}|${moneyId}`;
  const key = `TXN:${txn.id}:${signature}`;

  const posted = await client.journalEntry.findFirst({
    where: { voucherType: 'DRAWING', voucherId: txn.id, status: 'POSTED' },
  });
  if (posted && posted.idempotencyKey === key) return posted;
  if (posted) await reverseEntry(posted.id, 'projection update', client);

  return postJournal(
    {
      postingDate: txn.date,
      voucherType: 'DRAWING',
      voucherId: txn.id,
      idempotencyKey: key,
      projectId: txn.projectId,
      memo: txn.description ?? (txn.ownerId ? 'Owner drawing' : 'Payout to company'),
      lines: [
        {
          accountId: debit.id, side: 'D', amount: amount.toString(), projectId: txn.projectId,
          partyType: txn.ownerId ? 'OWNER' : null, partyId: txn.ownerId ?? null,
        },
        {
          accountId: moneyId, side: 'C', amount: amount.toString(), projectId: txn.projectId,
          againstVoucherType: 'TRANSACTION', againstVoucherId: txn.id,
        },
      ],
    },
    client,
  );
}

/** Dispatch a single transaction to the ledger by type. */
export async function projectTxn(txn: TxnRecord, client: Client = prisma) {
  if (txn.type === 'EXPENSE') return projectExpenseTxn(txn, client);
  if (txn.type === 'INCOME') return projectIncomeTxn(txn, client);
  if (txn.type === 'DRAWING') return projectDrawingTxn(txn, client);
  return null;
}

const TXN_SELECT = {
  id: true, type: true, amount: true, date: true, category: true,
  description: true, isPaid: true, bankAccountId: true, workerId: true, ownerId: true, projectId: true,
} as const;

/** Project all EXPENSE + INCOME + DRAWING transactions (optionally per project). */
export async function projectTransactions(projectId: string | null = null, client: Client = prisma): Promise<number> {
  const txns = await client.transaction.findMany({
    where: { type: { in: ['EXPENSE', 'INCOME', 'DRAWING'] }, ...(projectId ? { projectId } : {}) },
    select: TXN_SELECT,
    orderBy: { date: 'asc' },
  });
  for (const t of txns) await projectTxn(t as TxnRecord, client);
  return txns.length;
}
