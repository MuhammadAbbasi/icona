'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { syncLoan, syncLoanRepayment } from '@/lib/ledger/sync';

const loanSchema = z.object({
  projectId:      z.string().min(1),
  lenderId:       z.string().min(1),
  lenderName:     z.string().trim().optional(),
  lenderPhone:    z.string().trim().optional().nullable(),
  lenderEmail:    z.string().trim().optional().nullable(),
  lenderAddress:  z.string().trim().optional().nullable(),
  lenderNotes:    z.string().trim().optional().nullable(),
  provider:       z.string().trim().optional().nullable(),
  amount:         z.number().positive('Amount must be positive'),
  interestRate:   z.number().nonnegative().default(0),
  interestAmount: z.number().nonnegative().default(0),
  receivedDate:   z.string().optional(),
  dueDate:        z.string().optional().nullable(),
  notes:          z.string().trim().optional().nullable(),
  bankAccountId:  z.string().optional().nullable(),
});

const repaymentSchema = z.object({
  loanId:         z.string().min(1),
  amount:         z.number().positive('Amount must be positive'),
  date:           z.string().optional(),
  paymentMethod:  z.string().trim().optional().nullable(),
  bankAccountId:  z.string().optional().nullable(),
  notes:          z.string().trim().optional().nullable(),
});

export type CreateLoanInput = z.infer<typeof loanSchema>;
export type RepayLoanInput = z.infer<typeof repaymentSchema>;

export async function createLoan(input: CreateLoanInput) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role ?? '';
  if (!['ADMIN', 'MANAGER'].includes(role)) {
    return { ok: false, error: 'Forbidden: Admin/Manager only.' };
  }

  const parsed = loanSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }

  const data = parsed.data;
  const totalPayable = data.amount + data.interestAmount;

  let lenderId = data.lenderId;
  let providerName = data.provider || '';

  if (lenderId === 'new') {
    if (!data.lenderName) {
      return { ok: false, error: 'Lender name is required for new lenders.' };
    }
    const existing = await prisma.lender.findUnique({
      where: { name: data.lenderName }
    });
    if (existing) {
      lenderId = existing.id;
      providerName = existing.name;
    } else {
      const newLender = await prisma.lender.create({
        data: {
          name: data.lenderName,
          phone: data.lenderPhone,
          email: data.lenderEmail,
          address: data.lenderAddress,
          notes: data.lenderNotes,
        }
      });
      lenderId = newLender.id;
      providerName = newLender.name;
    }
  } else if (lenderId && lenderId !== 'none') {
    const existingLender = await prisma.lender.findUnique({
      where: { id: lenderId }
    });
    if (existingLender) {
      providerName = existingLender.name;
    }
  }

  const createdLoan = await prisma.loan.create({
    data: {
      projectId:     data.projectId,
      provider:      providerName,
      lenderId:      (lenderId !== 'new' && lenderId !== 'none') ? lenderId : null,
      amount:        data.amount,
      interestRate:  data.interestRate,
      interestAmount: data.interestAmount,
      totalPayable,
      receivedDate:  data.receivedDate ? new Date(data.receivedDate) : new Date(),
      dueDate:       data.dueDate ? new Date(data.dueDate) : null,
      notes:         data.notes || null,
      bankAccountId: (data.bankAccountId && data.bankAccountId !== 'none') ? data.bankAccountId : null,
    }
  });
  void syncLoan(createdLoan.id); // non-blocking ledger mirror

  revalidatePath(`/projects/${data.projectId}`);
  revalidatePath('/ledger');
  return { ok: true };
}

export async function repayLoan(input: RepayLoanInput) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role ?? '';
  if (!['ADMIN', 'MANAGER'].includes(role)) {
    return { ok: false, error: 'Forbidden: Admin/Manager only.' };
  }

  const parsed = repaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }

  const data = parsed.data;

  // Fetch loan to verify outstanding balance
  const loan = await prisma.loan.findUnique({
    where: { id: data.loanId },
    select: { id: true, projectId: true, totalPayable: true, amountPaid: true }
  });

  if (!loan) {
    return { ok: false, error: 'Loan not found.' };
  }

  const outstanding = loan.totalPayable - loan.amountPaid;
  if (data.amount > outstanding + 0.01) { // tolerance for float precision
    return { 
      ok: false, 
      error: `Repayment amount (PKR ${data.amount.toLocaleString()}) cannot exceed outstanding loan balance (PKR ${outstanding.toLocaleString()}).` 
    };
  }

  // Create repayment and update loan amountPaid in a transaction
  const [rep] = await prisma.$transaction([
    prisma.loanRepayment.create({
      data: {
        loanId:        data.loanId,
        amount:        data.amount,
        date:          data.date ? new Date(data.date) : new Date(),
        paymentMethod: data.paymentMethod || null,
        bankAccountId: data.bankAccountId || null,
        notes:         data.notes || null,
      }
    }),
    prisma.loan.update({
      where: { id: data.loanId },
      data: {
        amountPaid: {
          increment: data.amount
        }
      }
    })
  ]);
  void syncLoanRepayment(rep.id); // non-blocking ledger mirror

  revalidatePath(`/projects/${loan.projectId}`);
  revalidatePath('/ledger');
  return { ok: true };
}

export async function deleteLoan(loanId: string) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return { ok: false, error: 'Forbidden: Admin only.' };
  }

  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    select: { projectId: true, repayments: { select: { id: true } } }
  });

  if (!loan) {
    return { ok: false, error: 'Loan not found.' };
  }
  const repaymentIds = loan.repayments.map((r: { id: string }) => r.id);

  await prisma.loan.delete({ where: { id: loanId } });
  // Rows gone (repayments cascade) -> reverse their ledger entries.
  void syncLoan(loanId);
  for (const rid of repaymentIds) void syncLoanRepayment(rid);

  revalidatePath(`/projects/${loan.projectId}`);
  revalidatePath('/ledger');
  return { ok: true };
}

export async function getLoans(projectId: string) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role ?? '';
  if (!['ADMIN', 'MANAGER'].includes(role)) {
    return { ok: false, error: 'Forbidden', data: [] };
  }

  const loans = await prisma.loan.findMany({
    where: { projectId },
    orderBy: { receivedDate: 'desc' },
    include: {
      bankAccount: { select: { name: true } },
      repayments: {
        orderBy: { date: 'desc' },
        include: {
          bankAccount: { select: { name: true } }
        }
      }
    }
  });

  return { ok: true, data: loans };
}

export async function getLenders() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role ?? '';
  const orgId = session?.user?.orgId;
  if (!['ADMIN', 'MANAGER'].includes(role) || !orgId) {
    return { ok: false, error: 'Forbidden', data: [] };
  }

  const lenders = await prisma.lender.findMany({
    where: {
      orgId
    },
    orderBy: { name: 'asc' },
    include: {
      loans: {
        where: {
          project: { deletedAt: null }
        },
        select: {
          amount: true,
          interestAmount: true,
          amountPaid: true,
          totalPayable: true,
        }
      }
    }
  });

  const data = lenders.map(l => {
    const totalBorrowed = l.loans.reduce((sum, loan) => sum + loan.amount, 0);
    const totalInterest = l.loans.reduce((sum, loan) => sum + loan.interestAmount, 0);
    const totalPaid = l.loans.reduce((sum, loan) => sum + loan.amountPaid, 0);
    const totalPayable = l.loans.reduce((sum, loan) => sum + loan.totalPayable, 0);
    return {
      id: l.id,
      name: l.name,
      contactName: l.contactName || '',
      phone: l.phone || '',
      email: l.email || '',
      address: l.address || '',
      notes: l.notes || '',
      totalBorrowed,
      totalInterest,
      totalPaid,
      totalPayable,
      outstanding: totalPayable - totalPaid,
    };
  });

  return { ok: true, data };
}

export interface LenderEditInput {
  name: string; contactName?: string | null; phone?: string | null; email?: string | null; address?: string | null; notes?: string | null;
}

export async function updateLender(id: string, input: LenderEditInput) {
  const session = await getServerSession(authOptions);
  if (!['ADMIN', 'MANAGER'].includes(session?.user?.role ?? '')) return { ok: false, error: 'Forbidden' };
  if (!input.name?.trim()) return { ok: false, error: 'Name is required.' };
  const existing = await prisma.lender.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: 'Lender not found.' };
  if (existing.name !== input.name.trim()) {
    const dupe = await prisma.lender.findUnique({ where: { name: input.name.trim() } });
    if (dupe) return { ok: false, error: 'A lender with this name already exists.' };
  }
  await prisma.lender.update({
    where: { id },
    data: {
      name: input.name.trim(),
      contactName: input.contactName || null,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
      notes: input.notes || null,
    },
  });
  revalidatePath('/ledger');
  return { ok: true };
}

export async function deleteLender(id: string) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') return { ok: false, error: 'Forbidden: Admin only.' };
  const count = await prisma.loan.count({ where: { lenderId: id } });
  if (count > 0) return { ok: false, error: 'Cannot delete: this lender has loans. Reassign or remove them first.' };
  await prisma.lender.delete({ where: { id } });
  revalidatePath('/ledger');
  return { ok: true };
}

/** Full detail for a lender: profile + every loan (with per-loan figures) and
 *  repayments, for the registry detail view. */
export async function getLenderDetail(id: string) {
  const session = await getServerSession(authOptions);
  if (!['ADMIN', 'MANAGER'].includes(session?.user?.role ?? '')) return { ok: false, error: 'Forbidden' };
  const lender = await prisma.lender.findUnique({
    where: { id },
    include: {
      loans: {
        orderBy: { receivedDate: 'desc' },
        include: {
          project: { select: { name: true } },
          repayments: { orderBy: { date: 'desc' }, include: { bankAccount: { select: { name: true } } } },
        },
      },
    },
  });
  if (!lender) return { ok: false, error: 'Lender not found.' };

  const loans = lender.loans.map((l) => ({
    id: l.id,
    project: l.project?.name ?? '-',
    provider: l.provider,
    amount: l.amount,
    interestRate: l.interestRate,
    interestAmount: l.interestAmount,
    totalPayable: l.totalPayable,
    amountPaid: l.amountPaid,
    outstanding: l.totalPayable - l.amountPaid,
    receivedDate: l.receivedDate.toISOString(),
    dueDate: l.dueDate ? l.dueDate.toISOString() : null,
    repayments: l.repayments.map((r) => ({ id: r.id, amount: r.amount, date: r.date.toISOString(), method: r.paymentMethod, bank: r.bankAccount?.name ?? null })),
  }));
  const rates = lender.loans.map((l) => l.interestRate).filter((r) => r > 0);
  return {
    ok: true,
    lender: { id: lender.id, name: lender.name, contactName: lender.contactName || '', phone: lender.phone || '', email: lender.email || '', address: lender.address || '', notes: lender.notes || '' },
    loans,
    summary: {
      totalBorrowed: loans.reduce((s, l) => s + l.amount, 0),
      totalInterest: loans.reduce((s, l) => s + l.interestAmount, 0),
      totalPayable: loans.reduce((s, l) => s + l.totalPayable, 0),
      totalPaid: loans.reduce((s, l) => s + l.amountPaid, 0),
      outstanding: loans.reduce((s, l) => s + l.outstanding, 0),
      interestRate: rates.length ? rates[0] : 0,
    },
  };
}
