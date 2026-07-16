import { prisma } from '@/lib/prisma';
import type { ApiUser } from '@/lib/apiAuth';

/**
 * Returns a Prisma `where` filter that restricts project queries to what `user`
 * is allowed to see. One place to change when access rules evolve.
 *
 *   ADMIN / MANAGER   → all projects (no filter)
 *   EMPLOYEE / FREELANCER → only projects they are engaged on (engagedUsers)
 *                          OR have an assigned task inside
 *   CLIENT            → only projects belonging to their company
 */
export function getProjectScope(user: ApiUser): Record<string, any> {
  const base = { deletedAt: null };
  if (user.role === 'CLIENT') {
    if (!user.companyId) return { id: '__none__' }; // no company → no projects
    return { ...base, companyId: user.companyId };
  }
  if (user.role === 'EMPLOYEE' || user.role === 'FREELANCER') {
    return {
      ...base,
      OR: [
        { engagedUsers: { some: { id: user.id } } },
        { domains: { some: { tasks: { some: { assigneeId: user.id } } } } },
      ],
    };
  }
  // ADMIN, MANAGER — unrestricted
  return base;
}

/**
 * Check whether `user` may access a specific project by ID. Returns false both
 * for non-existent projects and for projects outside the user's scope, so
 * callers can safely return 404 without leaking project existence.
 */
export async function canAccessProject(user: ApiUser, projectId: string): Promise<boolean> {
  const scope = getProjectScope(user);
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...scope },
    select: { id: true },
  });
  return project !== null;
}
