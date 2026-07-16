import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser } from '@/lib/apiAuth';
import { CORS_HEADERS } from '@/lib/cors';

export const runtime = 'nodejs';

/**
 * GET /api/mobile/projects/[id]/hierarchy
 * The full Domain -> Task -> Subtask tree (with quantityRevisions) plus the
 * project's revision rounds — the shape the web computes server-side in the
 * project page. Returns UI permission flags so the app gates controls the same
 * way. CLIENT callers are scoped to their own company's projects.
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      company: { select: { id: true, name: true } },
      ownerCompany: { select: { id: true, name: true } },
      boqSourceFile: { select: { id: true } },
      revisions: {
        orderBy: { index: 'asc' },
        select: { id: true, index: true, label: true, note: true, createdAt: true },
      },
      domains: {
        orderBy: { createdAt: 'asc' },
        include: {
          tasks: {
            orderBy: { createdAt: 'asc' },
            include: {
              assignee: { select: { id: true, name: true, email: true, avatar: true } },
              subtasks: {
                orderBy: { createdAt: 'asc' },
                include: { quantityRevisions: { select: { revisionIndex: true, quantity: true, rate: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: CORS_HEADERS });

  // A client may only see their own company's projects (do not leak existence).
  if (user.role === 'CLIENT' && project.companyId !== user.companyId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: CORS_HEADERS });
  }

  const hasOriginalFile = !!project.boqSourceFile;
  const { boqSourceFile, ...rest } = project;

  return NextResponse.json({
    project: rest,
    permissions: {
      canEdit: ['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(user.role),
      canRevise: ['ADMIN', 'MANAGER'].includes(user.role),
      canViewFinance: ['ADMIN', 'MANAGER'].includes(user.role),
      hasOriginalFile,
    },
  }, { headers: CORS_HEADERS });
}
