'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { computeFinancials, type ProjectFinancials } from '@/lib/finance';
import { syncTransaction } from '@/lib/ledger/sync';

const txnSchema = z.object({
  projectId:       z.string().min(1),
  type:            z.enum(['INCOME', 'EXPENSE', 'DRAWING']),
  amount:          z.number().positive('Amount must be greater than zero'),
  date:            z.string().optional(),            // YYYY-MM-DD
  category:        z.string().trim().optional().nullable(),
  description:     z.string().trim().optional().nullable(),
  paymentMethod:   z.string().trim().optional().nullable(),
  ownerId:         z.string().optional().nullable(),
  workerId:        z.string().optional().nullable(),
  bankAccountId:   z.string().optional().nullable(),
  isPaid:          z.boolean().optional(),
  dueDate:         z.string().optional().nullable(),
  vendorInvoiceNo: z.string().trim().optional().nullable(),
  invoiceUrl:      z.string().trim().optional().nullable(),
  invoicePath:     z.string().trim().optional().nullable(),
});

export type CreateTransactionInput = z.infer<typeof txnSchema>;

export interface ActionResult {
  ok: boolean;
  error?: string;
  /** soft-escrow notice when the entry pushes cash-on-hand below zero */
  warning?: string;
}

/** Log a new ledger entry. ADMIN/MANAGER only. Soft escrow: never blocks. */
export async function createTransaction(input: CreateTransactionInput): Promise<ActionResult> {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role ?? '';
  if (!['ADMIN', 'MANAGER'].includes(role)) {
    return { ok: false, error: 'Forbidden: Admin/Manager only.' };
  }

  const parsed = txnSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }
  const data = parsed.data;

  if (data.type === 'DRAWING' && !data.ownerId) {
    return { ok: false, error: 'Please select the owner for this drawing.' };
  }

  const isPaid = data.type === 'EXPENSE' ? (data.isPaid ?? true) : true;

  // Soft escrow — warn (but allow) when expense/drawing exceeds cash on hand.
  let warning: string | undefined;
  if ((data.type === 'EXPENSE' && isPaid) || data.type === 'DRAWING') {
    const [existingTxns, existingLoans, existingInvestments, existingPayouts, companyInvestments, companyPayouts] = await Promise.all([
      prisma.transaction.findMany({
        where: { projectId: data.projectId },
        select: { type: true, amount: true, isPaid: true },
      }),
      prisma.loan.findMany({
        where: { projectId: data.projectId },
        select: { amount: true, interestAmount: true, amountPaid: true }
      }),
      prisma.investment.findMany({
        where: { projectId: data.projectId },
        select: { amount: true }
      }),
      prisma.investorPayout.findMany({
        where: { projectId: data.projectId },
        select: { amount: true }
      }),
      prisma.investment.findMany({
        where: { projectId: null },
        select: { amount: true }
      }),
      prisma.investorPayout.findMany({
        where: { projectId: null },
        select: { amount: true }
      })
    ]);
    const companyInvestmentsTotal = companyInvestments.reduce((sum, inv) => sum + inv.amount, 0);
    const companyPayoutsTotal = companyPayouts.reduce((sum, p) => sum + p.amount, 0);
    const { cashOnHand } = computeFinancials(
      0,
      existingTxns,
      existingLoans,
      existingInvestments,
      existingPayouts,
      companyInvestmentsTotal,
      companyPayoutsTotal
    );
    if (data.amount > cashOnHand) {
      const deficit = data.amount - cashOnHand;
      warning = `This ${data.type.toLowerCase()} exceeds available project cash by PKR ${deficit.toLocaleString('en-PK')}. Recorded as a deficit.`;
    }
  }

  const created = await prisma.transaction.create({
    data: {
      projectId:     data.projectId,
      type:          data.type,
      amount:        data.amount,
      date:          data.date ? new Date(data.date) : new Date(),
      category:      data.category || null,
      description:   data.description || null,
      paymentMethod: isPaid ? (data.paymentMethod || null) : null,
      bankAccountId: isPaid ? (data.bankAccountId || null) : null,
      isPaid:        isPaid,
      dueDate:       !isPaid && data.dueDate ? new Date(data.dueDate) : null,
      vendorInvoiceNo: data.type === 'EXPENSE' ? (data.vendorInvoiceNo || null) : null,
      invoiceUrl:      data.type === 'EXPENSE' ? (data.invoiceUrl || null) : null,
      invoicePath:     data.type === 'EXPENSE' ? (data.invoicePath || null) : null,
      ownerId:       data.type === 'DRAWING' ? (data.ownerId === 'company' ? null : (data.ownerId || null)) : null,
      workerId:      data.type === 'EXPENSE' ? (data.workerId || null) : null,
      recordedById:  session!.user.id,
    },
  });
  void syncTransaction(created.id); // non-blocking ledger mirror

  revalidatePath(`/projects/${data.projectId}`);
  revalidatePath('/ledger');
  revalidatePath('/');
  return { ok: true, warning };
}

/** Mark an outstanding supplier loan (unpaid expense) as paid. ADMIN/MANAGER only. */
export async function payTransaction(
  id: string, 
  bankAccountId: string, 
  paymentMethod: string, 
  date?: string,
  paymentAmount?: number
): Promise<ActionResult> {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role ?? '';
  if (!['ADMIN', 'MANAGER'].includes(role)) {
    return { ok: false, error: 'Forbidden: Admin/Manager only.' };
  }

  const txn = await prisma.transaction.findUnique({
    where: { id },
  });

  if (!txn) return { ok: false, error: 'Transaction not found.' };
  if (txn.type !== 'EXPENSE') return { ok: false, error: 'Only expenses can be marked as paid.' };
  if (txn.isPaid) return { ok: false, error: 'Transaction is already marked as paid.' };

  const finalPayAmount = paymentAmount !== undefined ? paymentAmount : txn.amount;
  if (finalPayAmount <= 0) return { ok: false, error: 'Payment amount must be greater than zero.' };

  if (finalPayAmount >= txn.amount - 0.01) {
    // Full payment
    await prisma.transaction.update({
      where: { id },
      data: {
        isPaid: true,
        bankAccountId: bankAccountId === 'none' ? null : bankAccountId,
        paymentMethod,
        date: date ? new Date(date) : new Date(),
      }
    });
    void syncTransaction(id);
  } else {
    // Partial payment:
    // 1. Update original transaction's amount to be the remaining unpaid balance
    const remainingUnpaid = txn.amount - finalPayAmount;
    await prisma.transaction.update({
      where: { id },
      data: {
        amount: remainingUnpaid,
        // remains isPaid = false
      }
    });

    // 2. Create a new transaction representing the paid portion
    const child = await prisma.transaction.create({
      data: {
        projectId: txn.projectId,
        type: 'EXPENSE',
        amount: finalPayAmount,
        isPaid: true,
        date: date ? new Date(date) : new Date(),
        category: txn.category,
        description: txn.description ? `${txn.description} (Partial Payment)` : 'Partial Payment',
        paymentMethod,
        bankAccountId: bankAccountId === 'none' ? null : bankAccountId,
        vendorInvoiceNo: txn.vendorInvoiceNo,
        invoiceUrl: txn.invoiceUrl,
        invoicePath: txn.invoicePath,
        recordedById: session?.user?.id || txn.recordedById,
        workerId: txn.workerId,
      }
    });
    void syncTransaction(id);        // parent bill shrank -> re-project
    void syncTransaction(child.id);  // paid portion
  }

  revalidatePath(`/projects/${txn.projectId}`);
  revalidatePath('/ledger');
  revalidatePath('/');
  return { ok: true };
}

/** Remove a ledger entry. ADMIN only. */
export async function deleteTransaction(id: string): Promise<ActionResult> {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return { ok: false, error: 'Forbidden: Admin only.' };
  }
  const txn = await prisma.transaction.findUnique({ where: { id }, select: { projectId: true } });
  if (!txn) return { ok: false, error: 'Transaction not found.' };

  await prisma.transaction.delete({ where: { id } });
  void syncTransaction(id); // row gone -> reverse its ledger entry
  revalidatePath(`/projects/${txn.projectId}`);
  revalidatePath('/ledger');
  revalidatePath('/');
  return { ok: true };
}

export async function getProjectFinancials(projectId: string): Promise<ProjectFinancials> {
  const [project, txns, loans, investments, investorPayouts, companyInvestments, companyPayouts] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { budget: true } }),
    prisma.transaction.findMany({
      where: { projectId },
      select: {
        type: true,
        amount: true,
        isPaid: true,
        ownerId: true,
        owner: { select: { id: true, name: true } }
      },
    }),
    prisma.loan.findMany({
      where: { projectId },
      select: { amount: true, interestAmount: true, amountPaid: true }
    }),
    prisma.investment.findMany({
      where: { projectId },
      select: { amount: true }
    }),
    prisma.investorPayout.findMany({
      where: { projectId },
      select: { amount: true }
    }),
    prisma.investment.findMany({
      where: { projectId: null },
      select: { amount: true }
    }),
    prisma.investorPayout.findMany({
      where: { projectId: null },
      select: { amount: true }
    })
  ]);
  const companyInvestmentsTotal = companyInvestments.reduce((sum, inv) => sum + inv.amount, 0);
  const companyPayoutsTotal = companyPayouts.reduce((sum, p) => sum + p.amount, 0);

  return computeFinancials(
    project?.budget ?? 0,
    txns,
    loans,
    investments,
    investorPayouts,
    companyInvestmentsTotal,
    companyPayoutsTotal
  );
}
