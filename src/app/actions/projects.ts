'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function updateProjectBudget(projectId: string, budget: number) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role ?? '';
  if (!['ADMIN', 'MANAGER'].includes(role)) {
    return { ok: false, error: 'Forbidden: Admin/Manager only.' };
  }

  if (isNaN(budget) || budget < 0) {
    return { ok: false, error: 'Invalid budget value.' };
  }

  try {
    await prisma.project.update({
      where: { id: projectId },
      data: { budget },
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/');
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error.message || 'Failed to update budget.' };
  }
}
