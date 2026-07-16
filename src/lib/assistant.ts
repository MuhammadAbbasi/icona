// ICONA Assistant — Claude tool definitions + executors.
//
// Every tool is READ-ONLY and fenced by the caller's existing access rules
// (getProjectScope / canAccessProject), so the model can only see what the
// signed-in user could already read in the UI. CLIENT users additionally get
// the reduced finance/workflow views (no internal costs, no task internals).

import type Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import type { ApiUser } from '@/lib/apiAuth';
import { getProjectScope, canAccessProject } from '@/lib/projectAccess';
import { computeFinancials, clientFinanceView } from '@/lib/finance';
import { readDocument } from '@/lib/storage';

export const assistantTools: Anthropic.Tool[] = [
  {
    name: 'list_projects',
    description:
      "List the user's projects (id, name, status, priority, progress %, budget, dates). Call this first to resolve a project name mentioned by the user into a project_id for the other tools.",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_project_finances',
    description:
      'Payment and financial summary for one project: client payments received, amount still receivable, and (for staff) expenses, owner drawings, cash on hand, unpaid dues and recent ledger entries. Use for any payment-related question.',
    input_schema: {
      type: 'object',
      properties: { project_id: { type: 'string', description: 'Project id from list_projects' } },
      required: ['project_id'],
    },
  },
  {
    name: 'get_project_workflow',
    description:
      'Workflow snapshot for one project: work domains, task counts by status, overdue tasks and upcoming deadlines. Use to analyze progress, bottlenecks and what to do next.',
    input_schema: {
      type: 'object',
      properties: { project_id: { type: 'string', description: 'Project id from list_projects' } },
      required: ['project_id'],
    },
  },
  {
    name: 'list_photos',
    description:
      'List recent site photos of a project (photo id, file name, what task/subtask it documents, capture time, GPS availability). Use view_photo afterwards to visually inspect one.',
    input_schema: {
      type: 'object',
      properties: { project_id: { type: 'string', description: 'Project id from list_projects' } },
      required: ['project_id'],
    },
  },
  {
    name: 'view_photo',
    description:
      'Load one site photo image so you can visually analyze it — work progress, quality issues, safety hazards, materials on site. Input is a photo id from list_photos.',
    input_schema: {
      type: 'object',
      properties: { photo_id: { type: 'string', description: 'Photo id from list_photos' } },
      required: ['photo_id'],
    },
  },
];

const MAX_IMAGE_BYTES = 4_500_000; // API limit ~5MB base64; fall back to thumbnail above this

function imageMediaType(name: string): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' {
  const ext = name.toLowerCase().split('.').pop();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
}

/** Photo storagePath is either a Cloudinary URL or the local "/api/uploads/…" url. */
async function readPhoto(storagePath: string): Promise<Buffer> {
  const src = storagePath.startsWith('/api/uploads/')
    ? storagePath.slice('/api/uploads/'.length)
    : storagePath;
  return readDocument(src); // handles both http(s) fetch and guarded local read
}

type ToolResult = Anthropic.ToolResultBlockParam['content'];

export async function runAssistantTool(
  user: ApiUser,
  name: string,
  input: Record<string, unknown>,
): Promise<ToolResult> {
  switch (name) {
    case 'list_projects': {
      const projects = await prisma.project.findMany({
        where: getProjectScope(user),
        select: {
          id: true, name: true, status: true, priority: true, progress: true,
          budget: true, startDate: true, endDate: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      });
      return JSON.stringify(projects);
    }

    case 'get_project_finances': {
      const projectId = String(input.project_id ?? '');
      if (!(await canAccessProject(user, projectId))) return 'Project not found.';
      const [project, txs, loans, investments, payouts] = await Promise.all([
        prisma.project.findUnique({ where: { id: projectId }, select: { name: true, budget: true } }),
        prisma.transaction.findMany({
          where: { projectId },
          select: {
            type: true, amount: true, isPaid: true, date: true, description: true,
            category: true, paymentMethod: true, dueDate: true,
            ownerId: true, owner: { select: { id: true, name: true } },
          },
          orderBy: { date: 'desc' },
        }),
        prisma.loan.findMany({ where: { projectId }, select: { amount: true, interestAmount: true, amountPaid: true } }),
        prisma.investment.findMany({ where: { projectId }, select: { amount: true } }),
        prisma.investorPayout.findMany({ where: { projectId }, select: { amount: true } }),
      ]);
      const fin = computeFinancials(project?.budget, txs, loans, investments, payouts);

      if (user.role === 'CLIENT') {
        // Clients see only their own payment position — never internal costs.
        const payments = txs
          .filter((t: any) => t.type === 'INCOME')
          .slice(0, 15)
          .map((t: any) => ({ amount: t.amount, date: t.date, description: t.description, method: t.paymentMethod }));
        return JSON.stringify({ project: project?.name, currency: 'PKR', ...clientFinanceView(fin), recentPayments: payments });
      }

      const recent = txs.slice(0, 15).map((t: any) => ({
        type: t.type, amount: t.amount, date: t.date, category: t.category,
        description: t.description, method: t.paymentMethod, isPaid: t.isPaid, dueDate: t.dueDate,
      }));
      return JSON.stringify({ project: project?.name, currency: 'PKR', ...fin, recentTransactions: recent });
    }

    case 'get_project_workflow': {
      const projectId = String(input.project_id ?? '');
      if (!(await canAccessProject(user, projectId))) return 'Project not found.';
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
          name: true, status: true, progress: true, startDate: true, endDate: true,
          domains: {
            select: {
              name: true,
              tasks: {
                select: {
                  title: true, status: true, priority: true, dueDate: true,
                  assignee: { select: { name: true } },
                },
              },
            },
          },
        },
      });
      if (!project) return 'Project not found.';

      const now = new Date();
      const domains = project.domains.map((d: any) => {
        const byStatus: Record<string, number> = {};
        for (const t of d.tasks) byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
        const summary: any = { domain: d.name, totalTasks: d.tasks.length, byStatus };
        if (user.role !== 'CLIENT') {
          // Task-level detail is internal — never shown to clients (same rule as alerts).
          summary.overdueTasks = d.tasks
            .filter((t: any) => t.status !== 'DONE' && t.dueDate && new Date(t.dueDate) < now)
            .map((t: any) => ({ title: t.title, dueDate: t.dueDate, priority: t.priority, assignee: t.assignee?.name ?? null }));
        }
        return summary;
      });
      return JSON.stringify({
        project: project.name, status: project.status, progressPct: project.progress,
        startDate: project.startDate, endDate: project.endDate, domains,
      });
    }

    case 'list_photos': {
      const projectId = String(input.project_id ?? '');
      if (!(await canAccessProject(user, projectId))) return 'Project not found.';
      const photos = await prisma.taskPhoto.findMany({
        where: { projectId, archived: false },
        select: { id: true, originalName: true, parentTitle: true, parentType: true, takenAt: true, createdAt: true, latitude: true },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });
      return JSON.stringify(
        photos.map((p: any) => ({
          id: p.id, name: p.originalName, documents: `${p.parentTitle} (${p.parentType})`,
          takenAt: p.takenAt ?? p.createdAt, hasGps: p.latitude != null,
        })),
      );
    }

    case 'view_photo': {
      const photoId = String(input.photo_id ?? '');
      const photo = await prisma.taskPhoto.findUnique({
        where: { id: photoId },
        select: { projectId: true, originalName: true, parentTitle: true, storagePath: true, thumbnailPath: true, takenAt: true },
      });
      if (!photo || !(await canAccessProject(user, photo.projectId))) return 'Photo not found.';
      let buf = await readPhoto(photo.storagePath);
      if (buf.length > MAX_IMAGE_BYTES) buf = await readPhoto(photo.thumbnailPath);
      return [
        {
          type: 'image',
          source: { type: 'base64', media_type: imageMediaType(photo.originalName), data: buf.toString('base64') },
        },
        {
          type: 'text',
          text: `Photo "${photo.originalName}" documenting "${photo.parentTitle}"${photo.takenAt ? `, taken ${photo.takenAt.toISOString()}` : ''}.`,
        },
      ];
    }

    default:
      return `Unknown tool: ${name}`;
  }
}
