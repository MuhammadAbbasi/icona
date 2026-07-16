// Chart of Accounts for a construction SME. Groups organize the tree; only leaf
// (non-group) ledger accounts may be posted to. Bank-account and per-loan /
// per-owner ledgers are created dynamically in later phases under their groups.

import { prisma } from '@/lib/prisma';
import { AccountType, LedgerSide, Prisma } from '@prisma/client';

type Client = typeof prisma | Prisma.TransactionClient;

interface AccountDef {
  code: string;
  name: string;
  type: AccountType;
  isGroup?: boolean;
  parent?: string; // parent code
}

// Codes are stable identifiers; keep them even if names change.
export const CHART_OF_ACCOUNTS: AccountDef[] = [
  // Assets
  { code: '1000', name: 'Assets', type: 'ASSET', isGroup: true },
  { code: '1100', name: 'Cash in Hand', type: 'ASSET', parent: '1000' },
  { code: '1150', name: 'Company Account', type: 'ASSET', parent: '1000' }, // company cash pool (payout-to-company)
  { code: '1200', name: 'Bank Accounts', type: 'ASSET', isGroup: true, parent: '1000' },
  { code: '1250', name: 'Cheques / Pay Orders Issued', type: 'ASSET', parent: '1000' },
  { code: '1300', name: 'Accounts Receivable', type: 'ASSET', parent: '1000' },
  { code: '1350', name: 'Retention Receivable', type: 'ASSET', parent: '1000' },
  { code: '1400', name: 'Work In Progress', type: 'ASSET', parent: '1000' },

  // Liabilities
  { code: '2000', name: 'Liabilities', type: 'LIABILITY', isGroup: true },
  { code: '2100', name: 'Accounts Payable', type: 'LIABILITY', parent: '2000' },
  { code: '2150', name: 'Retention Payable', type: 'LIABILITY', parent: '2000' },
  { code: '2200', name: 'Loans Payable', type: 'LIABILITY', isGroup: true, parent: '2000' },
  { code: '2250', name: 'Interest Payable', type: 'LIABILITY', parent: '2000' },
  { code: '2300', name: 'Salaries Payable', type: 'LIABILITY', parent: '2000' },
  { code: '2400', name: 'Taxes Payable', type: 'LIABILITY', parent: '2000' },

  // Equity
  { code: '3000', name: 'Equity', type: 'EQUITY', isGroup: true },
  { code: '3100', name: 'Owner Capital', type: 'EQUITY', parent: '3000' },
  { code: '3110', name: 'Owner Drawings', type: 'EQUITY', parent: '3000' },
  { code: '3200', name: 'Investor Capital', type: 'EQUITY', isGroup: true, parent: '3000' },
  { code: '3900', name: 'Opening Balance Equity', type: 'EQUITY', parent: '3000' },

  // Income
  { code: '4000', name: 'Income', type: 'INCOME', isGroup: true },
  { code: '4100', name: 'Contract Revenue', type: 'INCOME', parent: '4000' },
  { code: '4900', name: 'Other Income', type: 'INCOME', parent: '4000' },

  // Expenses
  { code: '5000', name: 'Expenses', type: 'EXPENSE', isGroup: true },
  { code: '5100', name: 'Materials', type: 'EXPENSE', parent: '5000' },
  { code: '5200', name: 'Labour', type: 'EXPENSE', parent: '5000' },
  { code: '5300', name: 'Subcontractor', type: 'EXPENSE', parent: '5000' },
  { code: '5400', name: 'Equipment', type: 'EXPENSE', parent: '5000' },
  { code: '5500', name: 'Overheads', type: 'EXPENSE', parent: '5000' },
  { code: '5600', name: 'Interest Expense', type: 'EXPENSE', parent: '5000' },
  { code: '5700', name: 'Salaries', type: 'EXPENSE', parent: '5000' },
];

/** Assets and expenses are debit-normal; liabilities, equity and income are
 *  credit-normal. */
export function normalSideFor(type: AccountType): LedgerSide {
  return type === 'ASSET' || type === 'EXPENSE' ? 'D' : 'C';
}

/** Idempotent: safe to run repeatedly. Parents appear before children in the
 *  list, so the parent id is always resolvable. */
export async function seedChartOfAccounts(client: Client = prisma): Promise<number> {
  for (const def of CHART_OF_ACCOUNTS) {
    const parent = def.parent
      ? await client.ledgerAccount.findUnique({ where: { code: def.parent }, select: { id: true } })
      : null;
    const data = {
      name: def.name,
      type: def.type,
      normalSide: normalSideFor(def.type),
      isGroup: !!def.isGroup,
      parentId: parent?.id ?? null,
    };
    await client.ledgerAccount.upsert({
      where: { code: def.code },
      create: { code: def.code, ...data },
      update: data,
    });
  }
  return client.ledgerAccount.count();
}
