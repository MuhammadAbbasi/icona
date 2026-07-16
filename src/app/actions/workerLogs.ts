'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { syncTransaction } from '@/lib/ledger/sync';

async function requireStaff() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role ?? '';
  return ['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(role);
}

/** Save daily attendance logs for a project. */
export async function saveAttendance(projectId: string, dateString: string, workerIds: string[]) {
  if (!(await requireStaff())) return { ok: false, error: 'Forbidden' };

  try {
    const targetDate = new Date(dateString);
    targetDate.setUTCHours(0, 0, 0, 0);

    // Fetch the workers with their current daily wages
    const workers = await prisma.worker.findMany({
      where: { id: { in: workerIds } },
      select: { id: true, dailyWage: true },
    });

    const workerWageMap = new Map(workers.map((w) => [w.id, w.dailyWage]));

    await prisma.$transaction(async (tx) => {
      // Delete existing logs for workers NOT in the new list on this date
      await tx.workerWorkLog.deleteMany({
        where: {
          projectId,
          date: targetDate,
          workerId: { notIn: workerIds },
        },
      });

      // Fetch remaining logs on this date to know what to upsert
      const existingLogs = await tx.workerWorkLog.findMany({
        where: {
          projectId,
          date: targetDate,
        },
        select: { workerId: true },
      });

      const existingWorkerIds = new Set(existingLogs.map((l) => l.workerId));

      // Create logs for workers that don't have one yet
      const toCreate = workerIds.filter((id) => !existingWorkerIds.has(id));

      if (toCreate.length > 0) {
        await tx.workerWorkLog.createMany({
          data: toCreate.map((workerId) => ({
            workerId,
            projectId,
            date: targetDate,
            wageRate: workerWageMap.get(workerId) ?? 0,
          })),
        });
      }
    });

    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  } catch (err: any) {
    console.error('Error saving attendance:', err);
    return { ok: false, error: err.message || 'Could not save attendance.' };
  }
}

export interface WorkerLabourSummary {
  workerId: string;
  name: string;
  role: string | null;
  phone: string | null;
  dailyWage: number;
  daysWorked: number;
  totalEarned: number;
  totalPaid: number;
  remaining: number;
}

export interface AttendanceHistoryEntry {
  date: string; // YYYY-MM-DD
  workersCount: number;
  workersList: { workerId: string; name: string; role: string | null; wageRate: number }[];
}

export interface ProjectLabourSummary {
  workers: WorkerLabourSummary[];
  history: AttendanceHistoryEntry[];
  totalWorkersCount: number;
  totalManDays: number;
  totalEarnedAmount: number;
  totalPaidAmount: number;
  totalRemainingAmount: number;
}

/** Get a report of worker utilization, earnings, payments and remaining balances for a project. */
export async function getProjectLabourSummary(projectId: string): Promise<ProjectLabourSummary> {
  const defaultSummary: ProjectLabourSummary = {
    workers: [],
    history: [],
    totalWorkersCount: 0,
    totalManDays: 0,
    totalEarnedAmount: 0,
    totalPaidAmount: 0,
    totalRemainingAmount: 0,
  };

  if (!(await requireStaff())) return defaultSummary;

  try {
    // 1. Get project with its assigned teams and their workers
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        teams: {
          include: {
            workers: true,
          },
        },
      },
    });

    if (!project) return defaultSummary;

    // Collate all assigned workers
    const assignedWorkers = project.teams.flatMap((t) => t.workers);
    const assignedWorkerIds = new Set(assignedWorkers.map((w) => w.id));

    // 2. Fetch all work logs for this project
    const workLogs = await prisma.workerWorkLog.findMany({
      where: { projectId },
      include: {
        worker: {
          select: { id: true, name: true, role: true, phone: true, dailyWage: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    // 3. Fetch all EXPENSE transactions logged for workers on this project
    const transactions = await prisma.transaction.findMany({
      where: {
        projectId,
        type: 'EXPENSE',
        workerId: { not: null },
      },
      select: {
        workerId: true,
        amount: true,
      },
    });

    // Collate all workers who have logs or payments, even if unassigned from the team later
    const allWorkerMap = new Map<string, { id: string; name: string; role: string | null; phone: string | null; dailyWage: number }>();
    
    // Add assigned workers first
    for (const w of assignedWorkers) {
      allWorkerMap.set(w.id, {
        id: w.id,
        name: w.name,
        role: w.role,
        phone: w.phone,
        dailyWage: w.dailyWage,
      });
    }

    // Add workers from logs
    for (const log of workLogs) {
      if (!allWorkerMap.has(log.workerId)) {
        allWorkerMap.set(log.workerId, log.worker);
      }
    }

    const workerIdsToSummary = Array.from(allWorkerMap.keys());

    // Calculate earned and paid per worker
    const workerDays = new Map<string, number>();
    const workerEarned = new Map<string, number>();
    
    for (const log of workLogs) {
      workerDays.set(log.workerId, (workerDays.get(log.workerId) ?? 0) + 1);
      workerEarned.set(log.workerId, (workerEarned.get(log.workerId) ?? 0) + log.wageRate);
    }

    const workerPaid = new Map<string, number>();
    for (const txn of transactions) {
      if (txn.workerId) {
        workerPaid.set(txn.workerId, (workerPaid.get(txn.workerId) ?? 0) + txn.amount);
      }
    }

    // Assemble workers summary rows
    const workersSummary: WorkerLabourSummary[] = workerIdsToSummary.map((id) => {
      const w = allWorkerMap.get(id)!;
      const daysWorked = workerDays.get(id) ?? 0;
      const totalEarned = workerEarned.get(id) ?? 0;
      const totalPaid = workerPaid.get(id) ?? 0;
      const remaining = totalEarned - totalPaid;

      return {
        workerId: id,
        name: w.name,
        role: w.role,
        phone: w.phone,
        dailyWage: w.dailyWage,
        daysWorked,
        totalEarned,
        totalPaid,
        remaining,
      };
    });

    // 4. Assemble chronological history
    const historyMap = new Map<string, { date: Date; list: AttendanceHistoryEntry['workersList'] }>();
    
    for (const log of workLogs) {
      const dKey = log.date.toISOString().slice(0, 10);
      const entry = historyMap.get(dKey) ?? { date: log.date, list: [] };
      entry.list.push({
        workerId: log.workerId,
        name: log.worker.name,
        role: log.worker.role,
        wageRate: log.wageRate,
      });
      historyMap.set(dKey, entry);
    }

    const history: AttendanceHistoryEntry[] = Array.from(historyMap.entries())
      .map(([date, entry]) => ({
        date,
        workersCount: entry.list.length,
        workersList: entry.list.sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    // Totals
    const totalWorkersCount = workersSummary.filter(w => w.daysWorked > 0 || w.totalPaid > 0).length;
    const totalManDays = workLogs.length;
    const totalEarnedAmount = workersSummary.reduce((sum, w) => sum + w.totalEarned, 0);
    const totalPaidAmount = workersSummary.reduce((sum, w) => sum + w.totalPaid, 0);
    const totalRemainingAmount = totalEarnedAmount - totalPaidAmount;

    return {
      workers: workersSummary.sort((a, b) => b.daysWorked - a.daysWorked || a.name.localeCompare(b.name)),
      history,
      totalWorkersCount,
      totalManDays,
      totalEarnedAmount,
      totalPaidAmount,
      totalRemainingAmount,
    };
  } catch (err) {
    console.error('Error getting project labour summary:', err);
    return defaultSummary;
  }
}

/** Quick-pay a worker from the Labour Log tab. Creates a simplified EXPENSE transaction. */
export async function payWorker(input: {
  projectId: string;
  workerId: string;
  amount: number;
  date: string;
  paymentMethod?: string;
  bankAccountId?: string;
  notes?: string;
}): Promise<{ ok: boolean; error?: string; warning?: string }> {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role ?? '';
  if (!['ADMIN', 'MANAGER'].includes(role)) {
    return { ok: false, error: 'Forbidden: Admin/Manager only.' };
  }

  const { projectId, workerId, amount, date, paymentMethod, bankAccountId, notes } = input;

  if (!amount || amount <= 0) return { ok: false, error: 'Amount must be greater than zero.' };
  if (!workerId) return { ok: false, error: 'Worker is required.' };
  if (!projectId) return { ok: false, error: 'Project is required.' };

  try {
    // Fetch worker name for the description
    const worker = await prisma.worker.findUnique({
      where: { id: workerId },
      select: { name: true, role: true },
    });
    if (!worker) return { ok: false, error: 'Worker not found.' };

    // Check cash-on-hand (soft warning, never blocks)
    let warning: string | undefined;
    const { computeFinancials } = await import('@/lib/finance');
    const [existing, loans, investments, investorPayouts, companyInvestments, companyPayouts] = await Promise.all([
      prisma.transaction.findMany({ where: { projectId }, select: { type: true, amount: true, isPaid: true } }),
      prisma.loan.findMany({ where: { projectId }, select: { amount: true, interestAmount: true, amountPaid: true } }),
      prisma.investment.findMany({ where: { projectId }, select: { amount: true } }),
      prisma.investorPayout.findMany({ where: { projectId }, select: { amount: true } }),
      prisma.investment.findMany({ where: { projectId: null }, select: { amount: true } }),
      prisma.investorPayout.findMany({ where: { projectId: null }, select: { amount: true } }),
    ]);
    const companyInvestmentsTotal = companyInvestments.reduce((sum, inv) => sum + inv.amount, 0);
    const companyPayoutsTotal = companyPayouts.reduce((sum, p) => sum + p.amount, 0);
    const { cashOnHand } = computeFinancials(0, existing, loans, investments, investorPayouts, companyInvestmentsTotal, companyPayoutsTotal);
    if (amount > cashOnHand) {
      const deficit = amount - cashOnHand;
      warning = `This payment exceeds available project cash by PKR ${deficit.toLocaleString('en-PK')}. Recorded as a deficit.`;
    }

    const description = notes
      ? `${worker.name} (${worker.role || 'Laborer'}) - ${notes}`
      : `Wage payment to ${worker.name} (${worker.role || 'Laborer'})`;

    const createdTxn = await prisma.transaction.create({
      data: {
        projectId,
        type: 'EXPENSE',
        amount,
        date: date ? new Date(date) : new Date(),
        category: 'Worker/Supervisor',
        description,
        paymentMethod: paymentMethod || 'Cash',
        workerId,
        recordedById: session?.user?.id || null,
        bankAccountId: bankAccountId || null,
        isPaid: true,
      },
    });
    void syncTransaction(createdTxn.id); // non-blocking ledger mirror

    revalidatePath(`/projects/${projectId}`);
    return { ok: true, warning };
  } catch (err: any) {
    console.error('Error paying worker:', err);
    return { ok: false, error: err.message || 'Could not record payment.' };
  }
}

// ── Core-team site visits ────────────────────────────────────────────────────

export interface SiteVisitEntry {
  id: string;
  date: string; // YYYY-MM-DD
  userId: string;
  name: string;
  note: string | null;
}

/** Record a core-team site visit (visitor = a staff User). */
export async function logSiteVisit(input: { projectId: string; userId: string; date: string; note?: string | null }) {
  const session = await getServerSession(authOptions);
  if (!['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(session?.user?.role ?? '')) return { ok: false, error: 'Forbidden' };
  if (!input.userId) return { ok: false, error: 'Select a team member.' };

  const date = new Date(input.date);
  date.setUTCHours(0, 0, 0, 0);
  await prisma.siteVisit.create({
    data: { projectId: input.projectId, userId: input.userId, date, note: input.note || null, createdById: session?.user?.id || null },
  });
  revalidatePath(`/projects/${input.projectId}`);
  return { ok: true };
}

export async function deleteSiteVisit(id: string) {
  const session = await getServerSession(authOptions);
  if (!['ADMIN', 'MANAGER'].includes(session?.user?.role ?? '')) return { ok: false, error: 'Forbidden' };
  const v = await prisma.siteVisit.findUnique({ where: { id }, select: { projectId: true } });
  if (!v) return { ok: false, error: 'Visit not found.' };
  await prisma.siteVisit.delete({ where: { id } });
  revalidatePath(`/projects/${v.projectId}`);
  return { ok: true };
}

export async function getSiteVisits(projectId: string): Promise<SiteVisitEntry[]> {
  const session = await getServerSession(authOptions);
  if (!['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(session?.user?.role ?? '')) return [];
  const visits = await prisma.siteVisit.findMany({
    where: { projectId },
    orderBy: { date: 'desc' },
    include: { user: { select: { id: true, name: true } } },
  });
  return visits.map((v) => ({ id: v.id, date: v.date.toISOString().slice(0, 10), userId: v.userId, name: v.user.name, note: v.note }));
}
