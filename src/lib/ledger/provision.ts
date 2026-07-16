// Bridges the existing BankAccount records to the general ledger: each bank
// account gets exactly one Asset ledger account (under the "Bank Accounts"
// group), and its opening balance is posted so nothing is off-book. Cash in Hand
// is the seeded "1100" ledger.

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { postJournal } from './postJournal';

type Client = typeof prisma | Prisma.TransactionClient;

export const CASH_ENDPOINT = 'CASH';

interface BankLike {
  id: string;
  name: string;
  initialBalance?: number | null;
}

/** Get-or-create the ledger account for a bank account. Posts its opening
 *  balance once (idempotent). */
export async function ensureBankLedger(bank: BankLike, createdById: string | null = null, client: Client = prisma) {
  const existing = await client.ledgerAccount.findUnique({ where: { bankAccountId: bank.id } });
  if (existing) return existing;

  const parent = await client.ledgerAccount.findUnique({ where: { code: '1200' }, select: { id: true } });
  const account = await client.ledgerAccount.create({
    data: {
      code: `BANK:${bank.id}`,
      name: bank.name,
      type: 'ASSET',
      normalSide: 'D',
      isGroup: false,
      parentId: parent?.id ?? null,
      bankAccountId: bank.id,
    },
  });

  const opening = Number(bank.initialBalance ?? 0);
  if (opening > 0) {
    await postJournal(
      {
        postingDate: new Date(),
        voucherType: 'OPENING',
        voucherId: bank.id,
        idempotencyKey: `OPENING:BANK:${bank.id}`,
        memo: `Opening balance - ${bank.name}`,
        createdById,
        lines: [
          { accountId: account.id, side: 'D', amount: opening },
          { accountCode: '3900', side: 'C', amount: opening }, // Opening Balance Equity
        ],
      },
      client,
    );
  }

  return account;
}

/** Get-or-create the per-loan Liability ledger (under Loans Payable, 2200). The
 *  display name includes the lender and the project it belongs to, and is
 *  refreshed on projection so older accounts get the friendly name too. */
export async function ensureLoanLedger(
  loan: { id: string; provider?: string | null; projectName?: string | null },
  client: Client = prisma,
) {
  const name = `Loan - ${loan.provider || loan.id}` + (loan.projectName ? ` (${loan.projectName})` : '');
  const existing = await client.ledgerAccount.findUnique({ where: { code: `LOAN:${loan.id}` } });
  if (existing) {
    // Backfill the friendly name when we now know the project.
    if (loan.projectName && existing.name !== name) {
      return client.ledgerAccount.update({ where: { id: existing.id }, data: { name } });
    }
    return existing;
  }
  const parent = await client.ledgerAccount.findUnique({ where: { code: '2200' }, select: { id: true } });
  return client.ledgerAccount.create({
    data: {
      code: `LOAN:${loan.id}`,
      name,
      type: 'LIABILITY',
      normalSide: 'C',
      isGroup: false,
      parentId: parent?.id ?? null,
    },
  });
}

/** Get-or-create the per-investor Equity ledger (under Investor Capital, 3200). */
export async function ensureInvestorLedger(investor: { id: string; name?: string | null }, client: Client = prisma) {
  const existing = await client.ledgerAccount.findUnique({ where: { code: `INVESTOR:${investor.id}` } });
  if (existing) return existing;
  const parent = await client.ledgerAccount.findUnique({ where: { code: '3200' }, select: { id: true } });
  return client.ledgerAccount.create({
    data: {
      code: `INVESTOR:${investor.id}`,
      name: `Investor - ${investor.name || investor.id}`,
      type: 'EQUITY',
      normalSide: 'C',
      isGroup: false,
      parentId: parent?.id ?? null,
    },
  });
}

/** Resolve a money endpoint ("CASH" or a bankAccountId) to a ledger account id. */
export async function resolveMoneyAccountId(endpoint: string, client: Client = prisma): Promise<string> {
  if (endpoint === CASH_ENDPOINT) {
    const cash = await client.ledgerAccount.findUnique({ where: { code: '1100' }, select: { id: true } });
    if (!cash) throw new Error('Cash in Hand ledger (1100) is missing - seed the chart of accounts');
    return cash.id;
  }
  const led = await client.ledgerAccount.findUnique({ where: { bankAccountId: endpoint }, select: { id: true } });
  if (!led) throw new Error(`No ledger account for bank ${endpoint} - provision it first`);
  return led.id;
}

/** Backfill: ensure every existing bank account has a ledger account. */
export async function provisionAllBankLedgers(client: Client = prisma): Promise<number> {
  const banks = await client.bankAccount.findMany();
  for (const b of banks) await ensureBankLedger(b, null, client);
  return banks.length;
}
