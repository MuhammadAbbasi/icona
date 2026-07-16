'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { syncOverhead } from '@/lib/ledger/sync';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function requireStaff() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role ?? '';
  return { ok: ['ADMIN', 'MANAGER'].includes(role), session, role };
}

/** A company must exist and be a MAIN business unit to carry overheads. */
async function assertMainCompany(companyId: string): Promise<string | null> {
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { type: true } });
  if (!company) return 'Company not found.';
  if (company.type !== 'MAIN') return 'Overheads can only be recorded against a main company.';
  return null;
}

/* ── Manual overhead entries ─────────────────────────────────────────────── */

const overheadSchema = z.object({
  companyId:     z.string().min(1),
  // Preset value (RENT, SALARIES…) OR a free-text custom category the admin typed.
  category:      z.string().trim().min(1, 'Pick or enter a category').max(40),
  amount:        z.number().positive('Amount must be greater than zero'),
  date:          z.string().optional(),            // YYYY-MM-DD
  description:   z.string().trim().optional().nullable(),
  paymentMethod: z.string().trim().optional().nullable(),
});

export type CreateOverheadInput = z.infer<typeof overheadSchema>;

/** Record a manual company overhead (rent, bills, marketing…). ADMIN/MANAGER. */
export async function createOverhead(input: CreateOverheadInput): Promise<ActionResult> {
  const { ok, session } = await requireStaff();
  if (!ok) return { ok: false, error: 'Forbidden: Admin/Manager only.' };

  const parsed = overheadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0].message };
  const d = parsed.data;

  const companyError = await assertMainCompany(d.companyId);
  if (companyError) return { ok: false, error: companyError };

  const createdOvh = await prisma.overheadExpense.create({
    data: {
      companyId:     d.companyId,
      category:      d.category,
      amount:        d.amount,
      date:          d.date ? new Date(d.date) : new Date(),
      description:   d.description || null,
      paymentMethod: d.paymentMethod || null,
      source:        'MANUAL',
      recordedById:  session!.user.id,
    },
  });
  void syncOverhead(createdOvh.id); // non-blocking ledger mirror

  revalidatePath('/overheads');
  return { ok: true };
}

/** Remove an overhead entry from the ledger. ADMIN only. */
export async function deleteOverhead(id: string): Promise<ActionResult> {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') return { ok: false, error: 'Forbidden: Admin only.' };

  const row = await prisma.overheadExpense.findUnique({ where: { id }, select: { id: true } });
  if (!row) return { ok: false, error: 'Overhead not found.' };

  // A salary row simply disappears from the ledger; the staff member then shows
  // as unpaid again in the Monthly Routine Expenses list (paid state is derived).
  await prisma.overheadExpense.delete({ where: { id } });
  void syncOverhead(id); // row gone -> reverse its ledger entry
  revalidatePath('/overheads');
  return { ok: true };
}

/* ── Monthly routine expenses: individual staff salary payments ──────────── */

const paySalarySchema = z.object({
  companyId: z.string().min(1),
  userId:    z.string().min(1),
  salary:    z.number().min(0, 'Salary cannot be negative'),
  bonus:     z.number().min(0, 'Bonus cannot be negative'),
  date:      z.string().min(1),  // YYYY-MM-DD
  paymentMethod: z.string().trim().optional().nullable(),
});

export type PaySalaryInput = z.infer<typeof paySalarySchema>;

/**
 * Mark one staff member's salary (+ optional bonus) as paid for the month the
 * date falls in. Posts it as its own SALARIES overhead row. ADMIN/MANAGER.
 * Idempotent per person per month — a second payment for the same month is
 * blocked (delete the ledger row first to redo it).
 */
export async function payRoutineSalary(input: PaySalaryInput): Promise<ActionResult> {
  const { ok, session } = await requireStaff();
  if (!ok) return { ok: false, error: 'Forbidden: Admin/Manager only.' };

  const parsed = paySalarySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0].message };
  const d = parsed.data;

  const companyError = await assertMainCompany(d.companyId);
  if (companyError) return { ok: false, error: companyError };

  const user = await prisma.user.findUnique({ where: { id: d.userId }, select: { name: true } });
  if (!user) return { ok: false, error: 'Staff member not found.' };

  const period = d.date.slice(0, 7); // YYYY-MM

  const already = await prisma.overheadExpense.findFirst({
    where: { staffUserId: d.userId, period, companyId: d.companyId },
    select: { id: true },
  });
  if (already) return { ok: false, error: `${user.name}'s salary is already recorded for this month.` };

  const createdSalary = await prisma.overheadExpense.create({
    data: {
      companyId:    d.companyId,
      category:     'SALARIES',
      amount:       d.salary + d.bonus,
      date:         new Date(d.date),
      description:  d.bonus > 0 ? `${user.name} (salary + bonus ${d.bonus.toLocaleString('en-PK')})` : user.name,
      paymentMethod: d.paymentMethod || null,
      source:       'SALARY',
      staffUserId:  d.userId,
      period,
      recordedById: session!.user.id,
    },
  });
  void syncOverhead(createdSalary.id); // non-blocking ledger mirror

  revalidatePath('/overheads');
  return { ok: true };
}
