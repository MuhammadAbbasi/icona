'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { syncTransaction } from '@/lib/ledger/sync';

async function role() {
  const session = await getServerSession(authOptions);
  return { role: session?.user?.role ?? '', userId: session?.user?.id ?? null };
}
const isStaff = (r: string) => ['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(r);
const isManager = (r: string) => ['ADMIN', 'MANAGER'].includes(r);

export interface SubcontractorInput {
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  maxMembers?: number | null;
  status?: string;
  memberNames?: string[]; // optional named crew members
}

/** Registry list (for pickers and management). */
export async function getSubcontractors() {
  const { role: r } = await role();
  if (!isStaff(r)) return { ok: false as const, error: 'Forbidden', data: [] };
  const rows = await prisma.subcontractor.findMany({
    orderBy: { name: 'asc' },
    include: { members: { select: { id: true, name: true, role: true } } },
  });
  return { ok: true as const, data: rows };
}

export async function createSubcontractor(input: SubcontractorInput) {
  const { role: r } = await role();
  if (!isManager(r)) return { ok: false, error: 'Forbidden: Admin/Manager only.' };
  if (!input.name?.trim()) return { ok: false, error: 'Name is required.' };

  const dupe = await prisma.subcontractor.findUnique({ where: { name: input.name.trim() } });
  if (dupe) return { ok: false, error: 'A subcontractor with this name already exists.' };

  const created = await prisma.subcontractor.create({
    data: {
      name: input.name.trim(),
      contactName: input.contactName || null,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
      notes: input.notes || null,
      maxMembers: input.maxMembers ?? null,
      status: input.status || 'ACTIVE',
      members: input.memberNames?.length
        ? { create: input.memberNames.filter((n) => n.trim()).map((n) => ({ name: n.trim() })) }
        : undefined,
    },
  });
  revalidatePath('/teams');
  return { ok: true, id: created.id };
}

export async function updateSubcontractor(id: string, input: SubcontractorInput) {
  const { role: r } = await role();
  if (!isManager(r)) return { ok: false, error: 'Forbidden: Admin/Manager only.' };
  if (!input.name?.trim()) return { ok: false, error: 'Name is required.' };

  const existing = await prisma.subcontractor.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: 'Subcontractor not found.' };
  if (existing.name !== input.name.trim()) {
    const dupe = await prisma.subcontractor.findUnique({ where: { name: input.name.trim() } });
    if (dupe) return { ok: false, error: 'A subcontractor with this name already exists.' };
  }

  await prisma.$transaction(async (tx) => {
    await tx.subcontractor.update({
      where: { id },
      data: {
        name: input.name.trim(),
        contactName: input.contactName || null,
        phone: input.phone || null,
        email: input.email || null,
        address: input.address || null,
        notes: input.notes || null,
        maxMembers: input.maxMembers ?? null,
        status: input.status || 'ACTIVE',
      },
    });
    // Replace named members if provided.
    if (input.memberNames) {
      await tx.subcontractorMember.deleteMany({ where: { subcontractorId: id } });
      const names = input.memberNames.filter((n) => n.trim());
      if (names.length) {
        await tx.subcontractorMember.createMany({ data: names.map((n) => ({ subcontractorId: id, name: n.trim() })) });
      }
    }
  });
  revalidatePath('/teams');
  return { ok: true };
}

export async function deleteSubcontractor(id: string) {
  const { role: r } = await role();
  if (r !== 'ADMIN') return { ok: false, error: 'Forbidden: Admin only.' };

  const [engagements, logs, payments] = await Promise.all([
    prisma.subcontractorEngagement.count({ where: { subcontractorId: id } }),
    prisma.subcontractorLog.count({ where: { subcontractorId: id } }),
    prisma.transaction.count({ where: { subcontractorId: id } }),
  ]);
  if (engagements + logs + payments > 0) {
    return { ok: false, error: 'Cannot delete: this subcontractor has project engagements, attendance or payments.' };
  }
  await prisma.subcontractor.delete({ where: { id } });
  revalidatePath('/teams');
  return { ok: true };
}

/** Log the crew's headcount for a day; upsert the per-project engagement. */
export async function saveSubcontractorLog(input: {
  projectId: string; subcontractorId: string; date: string; headcount: number; contractAmount?: number;
}) {
  const { role: r } = await role();
  if (!isStaff(r)) return { ok: false, error: 'Forbidden' };

  const date = new Date(input.date);
  date.setUTCHours(0, 0, 0, 0);

  await prisma.subcontractorEngagement.upsert({
    where: { subcontractorId_projectId: { subcontractorId: input.subcontractorId, projectId: input.projectId } },
    create: { subcontractorId: input.subcontractorId, projectId: input.projectId, contractAmount: input.contractAmount ?? 0, startDate: date },
    update: input.contractAmount != null ? { contractAmount: input.contractAmount } : {},
  });

  if (input.headcount > 0) {
    await prisma.subcontractorLog.upsert({
      where: { subcontractorId_projectId_date: { subcontractorId: input.subcontractorId, projectId: input.projectId, date } },
      create: { subcontractorId: input.subcontractorId, projectId: input.projectId, date, headcount: input.headcount },
      update: { headcount: input.headcount },
    });
  } else {
    await prisma.subcontractorLog.deleteMany({ where: { subcontractorId: input.subcontractorId, projectId: input.projectId, date } });
  }

  revalidatePath(`/projects/${input.projectId}`);
  return { ok: true };
}

/** Pay a subcontractor: an EXPENSE transaction (category Subcontractor) that
 *  flows to the ledger's 5300 account and the project dashboard. */
export async function paySubcontractor(input: {
  projectId: string; subcontractorId: string; amount: number; date: string;
  paymentMethod?: string; bankAccountId?: string | null; notes?: string | null;
}) {
  const { role: r, userId } = await role();
  if (!isManager(r)) return { ok: false, error: 'Forbidden: Admin/Manager only.' };
  if (!input.amount || input.amount <= 0) return { ok: false, error: 'Amount must be greater than zero.' };

  const sub = await prisma.subcontractor.findUnique({ where: { id: input.subcontractorId }, select: { name: true } });
  if (!sub) return { ok: false, error: 'Subcontractor not found.' };

  const created = await prisma.transaction.create({
    data: {
      projectId: input.projectId,
      type: 'EXPENSE',
      amount: input.amount,
      date: input.date ? new Date(input.date) : new Date(),
      category: 'Subcontractor',
      description: input.notes ? `${sub.name} - ${input.notes}` : `Payment to ${sub.name}`,
      paymentMethod: input.paymentMethod || 'Cash',
      bankAccountId: input.bankAccountId || null,
      subcontractorId: input.subcontractorId,
      isPaid: true,
      recordedById: userId,
    },
  });
  void syncTransaction(created.id); // non-blocking ledger mirror

  revalidatePath(`/projects/${input.projectId}`);
  return { ok: true };
}

export interface ProjectSubcontractorRow {
  subcontractorId: string;
  name: string;
  maxMembers: number | null;
  contractAmount: number;
  paid: number;
  remaining: number;
  totalCrewDays: number; // Σ headcount
  logs: { date: string; headcount: number }[];
}

/** Engaged subcontractors on a project with contract/paid/remaining + headcount,
 *  plus the registry list for the picker. */
export async function getProjectSubcontractors(projectId: string): Promise<{
  engaged: ProjectSubcontractorRow[];
  registry: { id: string; name: string; maxMembers: number | null }[];
}> {
  const { role: r } = await role();
  if (!isStaff(r)) return { engaged: [], registry: [] };

  const [engagements, logs, payments, registry] = await Promise.all([
    prisma.subcontractorEngagement.findMany({
      where: { projectId },
      include: { subcontractor: { select: { id: true, name: true, maxMembers: true } } },
    }),
    prisma.subcontractorLog.findMany({ where: { projectId }, orderBy: { date: 'asc' } }),
    prisma.transaction.findMany({ where: { projectId, subcontractorId: { not: null } }, select: { subcontractorId: true, amount: true } }),
    prisma.subcontractor.findMany({ where: { status: 'ACTIVE' }, select: { id: true, name: true, maxMembers: true }, orderBy: { name: 'asc' } }),
  ]);

  const paidBy = new Map<string, number>();
  for (const p of payments) if (p.subcontractorId) paidBy.set(p.subcontractorId, (paidBy.get(p.subcontractorId) ?? 0) + p.amount);

  const logsBy = new Map<string, { date: string; headcount: number }[]>();
  const daysBy = new Map<string, number>();
  for (const l of logs) {
    const arr = logsBy.get(l.subcontractorId) ?? [];
    arr.push({ date: l.date.toISOString().slice(0, 10), headcount: l.headcount });
    logsBy.set(l.subcontractorId, arr);
    daysBy.set(l.subcontractorId, (daysBy.get(l.subcontractorId) ?? 0) + l.headcount);
  }

  const engaged: ProjectSubcontractorRow[] = engagements.map((e) => {
    const paid = paidBy.get(e.subcontractorId) ?? 0;
    return {
      subcontractorId: e.subcontractorId,
      name: e.subcontractor.name,
      maxMembers: e.subcontractor.maxMembers,
      contractAmount: e.contractAmount,
      paid,
      remaining: e.contractAmount - paid,
      totalCrewDays: daysBy.get(e.subcontractorId) ?? 0,
      logs: logsBy.get(e.subcontractorId) ?? [],
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  return { engaged, registry };
}
