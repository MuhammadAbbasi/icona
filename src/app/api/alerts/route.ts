import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser } from '@/lib/apiAuth';

export async function GET(req: Request) {
  try {
    const user = await getApiUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = user.role ?? '';
    const userId = user.id;
    const isStaff = role === 'ADMIN' || role === 'MANAGER';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // Only alert a user about projects they actually belong to:
    //   • ADMIN/MANAGER → every project (oversight)
    //   • CLIENT        → only their own company's projects
    //   • EMPLOYEE/FREELANCER → projects they're engaged on or assigned tasks in
    let projectWhere: Record<string, any> = { deletedAt: null };
    if (role === 'CLIENT') {
      projectWhere = { deletedAt: null, company: { users: { some: { id: userId } } } };
    } else if (role === 'EMPLOYEE' || role === 'FREELANCER') {
      projectWhere = {
        deletedAt: null,
        OR: [
          { engagedUsers: { some: { id: userId } } },
          { domains: { some: { tasks: { some: { assigneeId: userId } } } } },
        ],
      };
    }

    // Fetch projects with domains and tasks
    const projects = await prisma.project.findMany({
      where: projectWhere,
      include: {
        company: { select: { name: true } },
        domains: {
          include: {
            tasks: {
              where: { status: { not: 'DONE' } },
              select: { id: true, title: true, dueDate: true },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const alerts = [];

    for (const project of projects) {
      // ─── 1. DEADLINE ALERTS ───
      if (project.status !== 'COMPLETED' && project.endDate) {
        const endDate = new Date(project.endDate);
        endDate.setHours(0, 0, 0, 0);

        if (endDate < today) {
          alerts.push({
            id: `proj-overdue-${project.id}`,
            type: 'deadline',
            title: 'Project Overdue',
            message: `"${project.name}" has passed its end date (${endDate.toLocaleDateString('en-GB')}).`,
            link: `/projects/${project.id}`,
            projectId: project.id,
            projectName: project.name,
            severity: 'high',
          });
        } else if (endDate <= sevenDaysFromNow) {
          alerts.push({
            id: `proj-upcoming-${project.id}`,
            type: 'deadline',
            title: 'Project Deadline Approaching',
            message: `"${project.name}" deadline is on ${endDate.toLocaleDateString('en-GB')}.`,
            link: `/projects/${project.id}`,
            projectId: project.id,
            projectName: project.name,
            severity: 'medium',
          });
        }
      }

      // Task-level deadlines are an internal concern — never shown to clients.
      if (role !== 'CLIENT') {
        for (const domain of project.domains) {
          for (const task of domain.tasks) {
            if (task.dueDate) {
              const dueDate = new Date(task.dueDate);
              dueDate.setHours(0, 0, 0, 0);

              if (dueDate < today) {
                alerts.push({
                  id: `task-overdue-${task.id}`,
                  type: 'deadline',
                  title: 'Task Overdue',
                  message: `Task "${task.title}" in project "${project.name}" is overdue.`,
                  link: `/projects/${project.id}`,
                  projectId: project.id,
                  projectName: project.name,
                  severity: 'medium',
                });
              }
            }
          }
        }
      }

      // ─── 2. MISSING DETAILS ALERTS (internal setup gaps — staff only) ───
      if (isStaff) {
        const domainCount = project.domains.length;
        const taskCount = project.domains.reduce((sum, d) => sum + d.tasks.length, 0);

        if (domainCount === 0) {
          alerts.push({
            id: `proj-missing-domains-${project.id}`,
            type: 'missing',
            title: 'Missing Work Scope',
            message: `"${project.name}" has no work domains defined.`,
            link: `/projects/${project.id}`,
            projectId: project.id,
            projectName: project.name,
            severity: 'medium',
          });
        } else if (taskCount === 0) {
          alerts.push({
            id: `proj-missing-tasks-${project.id}`,
            type: 'missing',
            title: 'Missing Project Tasks',
            message: `"${project.name}" has domains but no tasks have been created.`,
            link: `/projects/${project.id}`,
            projectId: project.id,
            projectName: project.name,
            severity: 'medium',
          });
        }

        if (project.budget === null || project.budget === 0) {
          alerts.push({
            id: `proj-missing-budget-${project.id}`,
            type: 'missing',
            title: 'Missing Budget',
            message: `"${project.name}" does not have an expected budget set.`,
            link: `/projects/${project.id}`,
            projectId: project.id,
            projectName: project.name,
            severity: 'low',
          });
        }

        if (!project.startDate || !project.endDate) {
          alerts.push({
            id: `proj-missing-dates-${project.id}`,
            type: 'missing',
            title: 'Missing Dates',
            message: `"${project.name}" is missing start or end dates.`,
            link: `/projects/${project.id}`,
            projectId: project.id,
            projectName: project.name,
            severity: 'low',
          });
        }
      }
    }

    return NextResponse.json(alerts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
