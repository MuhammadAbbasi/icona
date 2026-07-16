'use server';

import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export interface WorkerOption {
  id: string;
  name: string;
  role: string | null;
  phone: string | null;
  dailyWage: number;
  status: string;
  teamId: string | null;
}

export interface WorkerAlert {
  type: 'INACTIVE_7_DAYS' | 'ASSIGNED_BUT_INACTIVE';
  workerId: string;
  name: string;
  role: string | null;
  daysSinceLastLog?: number;
  projectName?: string;
  projectId?: string;
}

async function requireStaff() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role ?? '';
  return ['ADMIN', 'MANAGER'].includes(role);
}

/** Search workers/supervisors by name, role or phone (case-insensitive). */
export async function searchWorkers(query: string): Promise<WorkerOption[]> {
  if (!(await requireStaff())) return [];
  const q = query.trim();
  const workers = await prisma.worker.findMany({
    where: q
      ? { OR: [{ name: { contains: q } }, { role: { contains: q } }, { phone: { contains: q } }] }
      : undefined,
    select: { id: true, name: true, role: true, phone: true, dailyWage: true, status: true, teamId: true },
    orderBy: { name: 'asc' },
    take: 12,
  });
  return workers;
}

const workerSchema = z.object({
  name:        z.string().trim().min(1, 'Name is required'),
  role:        z.string().trim().optional().nullable(),
  phone:       z.string().trim().optional().nullable(),
  notes:       z.string().trim().optional().nullable(),
  dailyWage:   z.number().nonnegative().optional().default(0),
  status:      z.string().trim().optional().default('ACTIVE'),
  teamId:      z.string().trim().optional().nullable(),
  newTeamName: z.string().trim().optional().nullable(),
});

const updateWorkerSchema = z.object({
  name:          z.string().trim().min(1).optional(),
  role:          z.string().trim().optional().nullable(),
  phone:         z.string().trim().optional().nullable(),
  notes:         z.string().trim().optional().nullable(),
  dailyWage:     z.number().nonnegative().optional(),
  status:        z.string().trim().optional(),
  teamId:        z.string().trim().optional().nullable(),
  newTeamName:   z.string().trim().optional().nullable(),
  effectiveDate: z.string().optional().nullable(), // YYYY-MM-DD
});

export type CreateWorkerInput = z.input<typeof workerSchema>;
export type UpdateWorkerInput = z.input<typeof updateWorkerSchema>;

export interface CreateWorkerResult {
  ok: boolean;
  error?: string;
  worker?: WorkerOption;
}

/** Add a new worker/supervisor. ADMIN/MANAGER only. */
export async function createWorker(input: CreateWorkerInput): Promise<CreateWorkerResult> {
  if (!(await requireStaff())) return { ok: false, error: 'Forbidden: Admin/Manager only.' };

  const parsed = workerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0].message };

  const data = parsed.data;

  let resolvedTeamId = (data.teamId && data.teamId !== 'none' && data.teamId !== 'create_new') ? data.teamId : null;
  if (data.teamId === 'create_new' && data.newTeamName) {
    let team = await prisma.team.findFirst({
      where: { name: data.newTeamName },
    });
    if (!team) {
      team = await prisma.team.create({
        data: { name: data.newTeamName },
      });
    }
    resolvedTeamId = team.id;
  }

  const worker = await prisma.worker.create({
    data: {
      name:      data.name,
      role:      data.role || null,
      phone:     data.phone || null,
      notes:     data.notes || null,
      dailyWage: data.dailyWage,
      status:    data.status,
      teamId:    resolvedTeamId,
    },
    select: { id: true, name: true, role: true, phone: true, dailyWage: true, status: true, teamId: true },
  });
  revalidatePath('/team');
  revalidatePath('/teams');
  revalidatePath('/', 'layout');
  return { ok: true, worker };
}

/** Update an existing worker's profile. ADMIN/MANAGER only. */
export async function updateWorker(id: string, input: UpdateWorkerInput) {
  if (!(await requireStaff())) return { ok: false, error: 'Forbidden: Admin/Manager only.' };

  const parsed = updateWorkerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0].message };

  const data = parsed.data;
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.dailyWage !== undefined) updateData.dailyWage = data.dailyWage;
  if (data.status !== undefined) updateData.status = data.status;
  
  if (data.teamId !== undefined) {
    let resolvedTeamId = (data.teamId && data.teamId !== 'none' && data.teamId !== 'create_new') ? data.teamId : null;
    if (data.teamId === 'create_new' && data.newTeamName) {
      let team = await prisma.team.findFirst({
        where: { name: data.newTeamName },
      });
      if (!team) {
        team = await prisma.team.create({
          data: { name: data.newTeamName },
        });
      }
      resolvedTeamId = team.id;
    }
    updateData.teamId = resolvedTeamId;
  }

  const worker = await prisma.worker.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, role: true, phone: true, dailyWage: true, status: true, teamId: true },
  });

  // Update historical logs if a start date is specified for the new rate
  if (data.dailyWage !== undefined && data.effectiveDate) {
    const effDate = new Date(data.effectiveDate);
    effDate.setUTCHours(0, 0, 0, 0);

    await prisma.workerWorkLog.updateMany({
      where: {
        workerId: id,
        date: { gte: effDate },
      },
      data: {
        wageRate: data.dailyWage,
      },
    });
  }

  revalidatePath('/team');
  revalidatePath('/teams');
  revalidatePath('/', 'layout');
  return { ok: true, worker };
}

/** Delete a worker profile. ADMIN/MANAGER only. */
export async function deleteWorker(id: string) {
  if (!(await requireStaff())) return { ok: false, error: 'Forbidden: Admin/Manager only.' };

  await prisma.worker.delete({
    where: { id },
  });

  revalidatePath('/team');
  revalidatePath('/teams');
  revalidatePath('/', 'layout');
  return { ok: true };
}

/** Get alerts for inactive workers or workers assigned to projects but marked inactive. */
export async function getInactiveWorkerAlerts(): Promise<WorkerAlert[]> {
  if (!(await requireStaff())) return [];

  try {
    const alerts: WorkerAlert[] = [];
    const now = new Date();
    const limitDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    // 1. Fetch active workers with their latest work log
    const activeWorkers = await prisma.worker.findMany({
      where: { status: 'ACTIVE' },
      include: {
        workLogs: {
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
    });

    for (const w of activeWorkers) {
      const latestLog = w.workLogs[0];
      
      if (!latestLog) {
        // No work logs at all: check creation date
        if (w.createdAt < limitDate) {
          const diffDays = Math.floor((now.getTime() - w.createdAt.getTime()) / (1000 * 60 * 60 * 24));
          alerts.push({
            type: 'INACTIVE_7_DAYS',
            workerId: w.id,
            name: w.name,
            role: w.role,
            daysSinceLastLog: diffDays,
          });
        }
      } else {
        // Has work logs: check if latest log is older than 7 days
        if (latestLog.date < limitDate) {
          const diffDays = Math.floor((now.getTime() - latestLog.date.getTime()) / (1000 * 60 * 60 * 24));
          alerts.push({
            type: 'INACTIVE_7_DAYS',
            workerId: w.id,
            name: w.name,
            role: w.role,
            daysSinceLastLog: diffDays,
          });
        }
      }
    }

    // 2. Fetch inactive workers to see if they are assigned to teams on ongoing projects
    const inactiveWorkers = await prisma.worker.findMany({
      where: { status: 'INACTIVE', teamId: { not: null } },
      include: {
        team: {
          include: {
            projects: {
              where: {
                status: { notIn: ['COMPLETED', 'ARCHIVED'] },
                deletedAt: null,
              },
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    for (const w of inactiveWorkers) {
      if (w.team && w.team.projects.length > 0) {
        const activeProj = w.team.projects[0];
        alerts.push({
          type: 'ASSIGNED_BUT_INACTIVE',
          workerId: w.id,
          name: w.name,
          role: w.role,
          projectName: activeProj.name,
          projectId: activeProj.id,
        });
      }
    }

    return alerts;
  } catch (err) {
    console.error('Error fetching worker alerts:', err);
    return [];
  }
}
