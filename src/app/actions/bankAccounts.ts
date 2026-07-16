'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureBankLedger } from '@/lib/ledger/provision';

const bankAccountSchema = z.object({
  name:           z.string().trim().min(1, 'Account name is required'),
  bankName:       z.string().trim().optional().nullable(),
  accountNumber:  z.string().trim().optional().nullable(),
  branch:         z.string().trim().optional().nullable(),
  initialBalance: z.number().default(0),
});

export type BankAccountInput = z.infer<typeof bankAccountSchema>;

export async function getBankAccounts() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role ?? '';
  if (!['ADMIN', 'MANAGER'].includes(role)) {
    return { ok: false, error: 'Forbidden: Admin/Manager only.', data: [] };
  }

  const accounts = await prisma.bankAccount.findMany({
    orderBy: { name: 'asc' },
    include: {
      transactions: {
        where: {
          project: { deletedAt: null }
        },
        select: { type: true, amount: true, isPaid: true }
      },
      overheads: {
        select: { amount: true }
      },
      loans: {
        where: {
          project: { deletedAt: null }
        },
        select: { amount: true }
      },
      repayments: {
        where: {
          loan: { project: { deletedAt: null } }
        },
        select: { amount: true }
      },
      investments: {
        where: {
          OR: [
            { projectId: null },
            { project: { deletedAt: null } }
          ]
        },
        select: { amount: true }
      },
      investorPayouts: {
        where: {
          OR: [
            { projectId: null },
            { project: { deletedAt: null } }
          ]
        },
        select: { amount: true }
      }
    }
  });

  const data = accounts.map(acc => {
    let credits = 0;
    let debits = 0;

    // Transactions
    for (const t of acc.transactions) {
      if (t.type === 'INCOME') {
        credits += t.amount;
      } else if (t.type === 'EXPENSE' || t.type === 'DRAWING') {
        if (t.type === 'EXPENSE' && t.isPaid === false) continue;
        debits += t.amount;
      }
    }

    // Overheads (company expenses)
    for (const o of acc.overheads) {
      debits += o.amount;
    }

    // Start loans received (cash injected)
    for (const l of acc.loans) {
      credits += l.amount;
    }

    // Start loan repayments made
    for (const r of acc.repayments) {
      debits += r.amount;
    }

    // Investments received (cash injected)
    for (const inv of acc.investments) {
      credits += inv.amount;
    }

    // Investor payouts made
    for (const ip of acc.investorPayouts) {
      debits += ip.amount;
    }

    const balance = acc.initialBalance + credits - debits;

    return {
      id: acc.id,
      name: acc.name,
      bankName: acc.bankName || '',
      accountNumber: acc.accountNumber || '',
      branch: acc.branch || '',
      initialBalance: acc.initialBalance,
      credits,
      debits,
      balance,
      createdAt: acc.createdAt.toISOString()
    };
  });

  return { ok: true, data };
}

export async function createBankAccount(input: BankAccountInput) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role ?? '';
  if (!['ADMIN', 'MANAGER'].includes(role)) {
    return { ok: false, error: 'Forbidden: Admin/Manager only.' };
  }

  const parsed = bankAccountSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }

  const data = parsed.data;

  // Check unique name
  const existing = await prisma.bankAccount.findUnique({
    where: { name: data.name }
  });
  if (existing) {
    return { ok: false, error: 'A bank account with this name already exists.' };
  }

  const created = await prisma.bankAccount.create({
    data: {
      name: data.name,
      bankName: data.bankName || null,
      accountNumber: data.accountNumber || null,
      branch: data.branch || null,
      initialBalance: data.initialBalance,
    }
  });

  // Provision the matching ledger account (Asset) + opening balance so the
  // account is on the books from day one.
  await ensureBankLedger(created, session?.user?.id ?? null);

  revalidatePath('/ledger');
  return { ok: true };
}

export async function updateBankAccount(id: string, input: BankAccountInput) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role ?? '';
  if (!['ADMIN', 'MANAGER'].includes(role)) {
    return { ok: false, error: 'Forbidden: Admin/Manager only.' };
  }

  const parsed = bankAccountSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }

  const data = parsed.data;

  const existing = await prisma.bankAccount.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, error: 'Bank account not found.' };
  }

  // Check unique name if changed
  if (existing.name !== data.name) {
    const dupe = await prisma.bankAccount.findUnique({ where: { name: data.name } });
    if (dupe) {
      return { ok: false, error: 'A bank account with this name already exists.' };
    }
  }

  await prisma.bankAccount.update({
    where: { id },
    data: {
      name: data.name,
      bankName: data.bankName || null,
      accountNumber: data.accountNumber || null,
      branch: data.branch || null,
      initialBalance: data.initialBalance,
    }
  });

  // Keep the ledger account in step: ensure it exists, and mirror a rename.
  const ledger = await ensureBankLedger({ id, name: data.name, initialBalance: existing.initialBalance }, session?.user?.id ?? null);
  if (ledger.name !== data.name) {
    await prisma.ledgerAccount.update({ where: { id: ledger.id }, data: { name: data.name } });
  }

  revalidatePath('/ledger');
  return { ok: true };
}

export async function deleteBankAccount(id: string) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return { ok: false, error: 'Forbidden: Admin only.' };
  }

  // Check if bank account has associated transactions/overheads/loans
  const account = await prisma.bankAccount.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          transactions: true,
          overheads: true,
          loans: true,
          repayments: true,
        }
      }
    }
  });

  if (!account) {
    return { ok: false, error: 'Bank account not found.' };
  }

  const totalAssociations = 
    account._count.transactions + 
    account._count.overheads + 
    account._count.loans + 
    account._count.repayments;

  if (totalAssociations > 0) {
    return { 
      ok: false, 
      error: 'Cannot delete bank account. It has associated transactions, overheads, or loans. Please reassign them first.' 
    };
  }

  await prisma.bankAccount.delete({ where: { id } });

  revalidatePath('/ledger');
  return { ok: true };
}
