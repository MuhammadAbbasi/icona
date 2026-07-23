'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { syncInvestment, syncInvestorPayout } from '@/lib/ledger/sync';

const investorSchema = z.object({
  name:    z.string().trim().min(1, 'Investor name is required'),
  phone:   z.string().trim().optional().nullable(),
  email:   z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  notes:   z.string().trim().optional().nullable(),
});

const investmentSchema = z.object({
  investorId:      z.string().min(1),
  investorName:    z.string().trim().optional(),
  investorPhone:   z.string().trim().optional().nullable(),
  investorEmail:   z.string().trim().optional().nullable(),
  investorAddress: z.string().trim().optional().nullable(),
  investorNotes:   z.string().trim().optional().nullable(),
  projectId:       z.string().optional().nullable(),
  amount:          z.number().positive('Amount must be positive'),
  profitSharePct:  z.number().nonnegative().default(0),
  date:            z.string().optional(),
  bankAccountId:   z.string().optional().nullable(),
  notes:           z.string().trim().optional().nullable(),
});

const payoutSchema = z.object({
  investorId:    z.string().min(1),
  projectId:     z.string().optional().nullable(),
  amount:        z.number().positive('Amount must be positive'),
  date:          z.string().optional(),
  paymentMethod: z.string().trim().optional().nullable(),
  bankAccountId: z.string().optional().nullable(),
  notes:         z.string().trim().optional().nullable(),
});

export type CreateInvestorInput = z.infer<typeof investorSchema>;
export type CreateInvestmentInput = z.infer<typeof investmentSchema>;
export type InvestorPayoutInput = z.infer<typeof payoutSchema>;

export async function getInvestors() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role ?? '';
  const orgId = session?.user?.orgId;
  if (!['ADMIN', 'MANAGER'].includes(role) || !orgId) {
    return { ok: false, error: 'Forbidden', data: [] };
  }

  const investors = await prisma.investor.findMany({
    where: {
      orgId
    },
    orderBy: { name: 'asc' },
    include: {
      investments: {
        where: {
          OR: [
            { projectId: null },
            { project: { deletedAt: null } }
          ]
        },
        select: { amount: true }
      },
      payouts: {
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

  const data = investors.map(i => {
    const totalInvested = i.investments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalPayouts = i.payouts.reduce((sum, p) => sum + p.amount, 0);
    return {
      id: i.id,
      name: i.name,
      contactName: i.contactName || '',
      phone: i.phone || '',
      email: i.email || '',
      address: i.address || '',
      notes: i.notes || '',
      totalInvested,
      totalPayouts,
      netOwed: totalInvested - totalPayouts,
    };
  });

  return { ok: true, data };
}

export interface InvestorEditInput {
  name: string; contactName?: string | null; phone?: string | null; email?: string | null; address?: string | null; notes?: string | null;
}

export async function updateInvestor(id: string, input: InvestorEditInput) {
  const session = await getServerSession(authOptions);
  if (!['ADMIN', 'MANAGER'].includes(session?.user?.role ?? '')) return { ok: false, error: 'Forbidden' };
  if (!input.name?.trim()) return { ok: false, error: 'Name is required.' };
  const existing = await prisma.investor.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: 'Investor not found.' };
  if (existing.name !== input.name.trim()) {
    const dupe = await prisma.investor.findUnique({ where: { name: input.name.trim() } });
    if (dupe) return { ok: false, error: 'An investor with this name already exists.' };
  }
  await prisma.investor.update({
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

export async function deleteInvestor(id: string) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') return { ok: false, error: 'Forbidden: Admin only.' };
  const [inv, pay] = await Promise.all([
    prisma.investment.count({ where: { investorId: id } }),
    prisma.investorPayout.count({ where: { investorId: id } }),
  ]);
  if (inv + pay > 0) return { ok: false, error: 'Cannot delete: this investor has investments or payouts.' };
  await prisma.investor.delete({ where: { id } });
  revalidatePath('/ledger');
  return { ok: true };
}

/** Full detail for an investor: profile + investments (with profit-share) and
 *  payouts, for the registry detail view. */
export async function getInvestorDetail(id: string) {
  const session = await getServerSession(authOptions);
  if (!['ADMIN', 'MANAGER'].includes(session?.user?.role ?? '')) return { ok: false, error: 'Forbidden' };
  const investor = await prisma.investor.findUnique({
    where: { id },
    include: {
      investments: { orderBy: { date: 'desc' }, include: { project: { select: { name: true } }, bankAccount: { select: { name: true } } } },
      payouts: { orderBy: { date: 'desc' }, include: { project: { select: { name: true } }, bankAccount: { select: { name: true } } } },
    },
  });
  if (!investor) return { ok: false, error: 'Investor not found.' };

  const investments = investor.investments.map((i) => ({
    id: i.id, project: i.project?.name ?? 'Company', amount: i.amount, profitSharePct: i.profitSharePct,
    date: i.date.toISOString(), bank: i.bankAccount?.name ?? null,
  }));
  const payouts = investor.payouts.map((p) => ({
    id: p.id, project: p.project?.name ?? 'Company', amount: p.amount, date: p.date.toISOString(), method: p.paymentMethod, bank: p.bankAccount?.name ?? null,
  }));
  const totalInvested = investments.reduce((s, i) => s + i.amount, 0);
  const totalPayouts = payouts.reduce((s, p) => s + p.amount, 0);
  const shares = investments.map((i) => i.profitSharePct).filter((x) => x > 0);
  return {
    ok: true,
    investor: { id: investor.id, name: investor.name, contactName: investor.contactName || '', phone: investor.phone || '', email: investor.email || '', address: investor.address || '', notes: investor.notes || '' },
    investments, payouts,
    summary: { totalInvested, totalPayouts, netOwed: totalInvested - totalPayouts, profitSharePct: shares.length ? shares[0] : 0 },
  };
}

export async function createInvestor(input: CreateInvestorInput) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role ?? '';
  if (!['ADMIN', 'MANAGER'].includes(role)) {
    return { ok: false, error: 'Forbidden' };
  }

  const parsed = investorSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }

  const data = parsed.data;

  // Check unique name
  const existing = await prisma.investor.findUnique({
    where: { name: data.name }
  });
  if (existing) {
    return { ok: false, error: 'An investor with this name already exists.' };
  }

  const investor = await prisma.investor.create({
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email,
      address: data.address,
      notes: data.notes,
    }
  });

  return { ok: true, data: investor };
}

export async function createInvestment(input: CreateInvestmentInput) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role ?? '';
  if (!['ADMIN', 'MANAGER'].includes(role)) {
    return { ok: false, error: 'Forbidden' };
  }

  const parsed = investmentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }

  const data = parsed.data;

  let investorId = data.investorId;

  // Handle inline investor creation
  if (investorId === 'new') {
    if (!data.investorName) {
      return { ok: false, error: 'Investor name is required for new investors.' };
    }
    const existing = await prisma.investor.findUnique({
      where: { name: data.investorName }
    });
    if (existing) {
      investorId = existing.id;
    } else {
      const newInv = await prisma.investor.create({
        data: {
          name: data.investorName,
          phone: data.investorPhone,
          email: data.investorEmail,
          address: data.investorAddress,
          notes: data.investorNotes,
        }
      });
      investorId = newInv.id;
    }
  }

  const createdInv = await prisma.investment.create({
    data: {
      investorId,
      projectId:      data.projectId || null,
      amount:         data.amount,
      profitSharePct:  data.profitSharePct,
      date:           data.date ? new Date(data.date) : new Date(),
      bankAccountId:  (data.bankAccountId && data.bankAccountId !== 'none') ? data.bankAccountId : null,
      notes:          data.notes || null,
    }
  });
  void syncInvestment(createdInv.id); // non-blocking ledger mirror

  if (data.projectId) {
    revalidatePath(`/projects/${data.projectId}`);
  }
  revalidatePath('/ledger');
  return { ok: true };
}

export async function payInvestor(input: InvestorPayoutInput) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role ?? '';
  if (!['ADMIN', 'MANAGER'].includes(role)) {
    return { ok: false, error: 'Forbidden' };
  }

  const parsed = payoutSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }

  const data = parsed.data;

  const createdPayout = await prisma.investorPayout.create({
    data: {
      investorId:    data.investorId,
      projectId:     data.projectId || null,
      amount:        data.amount,
      date:          data.date ? new Date(data.date) : new Date(),
      paymentMethod: data.paymentMethod || null,
      bankAccountId: (data.bankAccountId && data.bankAccountId !== 'none') ? data.bankAccountId : null,
      notes:         data.notes || null,
    }
  });
  void syncInvestorPayout(createdPayout.id); // non-blocking ledger mirror

  if (data.projectId) {
    revalidatePath(`/projects/${data.projectId}`);
  }
  revalidatePath('/ledger');
  return { ok: true };
}
