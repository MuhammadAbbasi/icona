import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getApiUser } from '@/lib/apiAuth';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getApiUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        engagedUsers: { select: { id: true, name: true, role: true } },
        teams: { select: { id: true, name: true } },
        vendors: { select: { id: true, name: true, supplies: true } },
        subcontractorEngagements: { include: { subcontractor: { select: { id: true, name: true } } } },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const allSubcontractors = await prisma.subcontractor.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    const subcontractors = project.subcontractorEngagements.map((e) => ({
      subcontractorId: e.subcontractorId,
      name: e.subcontractor.name,
      contractAmount: e.contractAmount,
    }));

    // Automatically append company CEOs (role === 'ADMIN') to engagedUsers
    const companyIds = [project.companyId, project.ownerCompanyId].filter(Boolean) as string[];
    const ceos = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        companyId: { in: companyIds },
        status: 'ACTIVE',
      },
      select: { id: true, name: true, role: true },
    });

    const engagedUsers = [...project.engagedUsers];
    for (const ceo of ceos) {
      if (!engagedUsers.some((u) => u.id === ceo.id)) {
        engagedUsers.push(ceo);
      }
    }

    return NextResponse.json({
      ...project,
      engagedUsers,
      subcontractors,
      allSubcontractors,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getApiUser(req);
    if (!user || !['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const isAdmin = user.role === 'ADMIN';

    const { id } = params;
    const body = await req.json();
    const { userIds, teamIds, vendorIds, subcontractors } = body;

    if (!Array.isArray(userIds) || !Array.isArray(teamIds) || !Array.isArray(vendorIds)) {
      return NextResponse.json({ error: 'Invalid payload: userIds, teamIds, and vendorIds must be arrays' }, { status: 400 });
    }

    // 1. Reset and update Users (One-to-Many relation)
    // Clear project assignment for non-ADMIN users currently on this project
    await prisma.user.updateMany({
      where: { projectId: id, role: { not: 'ADMIN' } },
      data: { projectId: null },
    });
    // Set project assignment for new list (excluding ADMINs to avoid messing with their single projectId field)
    const nonAdminUsers = await prisma.user.findMany({
      where: { id: { in: userIds }, role: { not: 'ADMIN' } },
      select: { id: true },
    });
    const nonAdminUserIds = nonAdminUsers.map((u) => u.id);

    if (nonAdminUserIds.length > 0) {
      await prisma.user.updateMany({
        where: { id: { in: nonAdminUserIds } },
        data: { projectId: id },
      });
    }

    // 2. Update Teams and Vendors (Many-to-Many relations using set)
    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        teams: {
          set: teamIds.map((tid: string) => ({ id: tid })),
        },
        vendors: {
          set: vendorIds.map((vid: string) => ({ id: vid })),
        },
      },
      include: {
        engagedUsers: { select: { id: true, name: true, role: true } },
        teams: { select: { id: true, name: true } },
        vendors: { select: { id: true, name: true, supplies: true } },
      },
    });

    // Automatically append company CEOs (role === 'ADMIN') to engagedUsers
    const companyIds = [updatedProject.companyId, updatedProject.ownerCompanyId].filter(Boolean) as string[];
    const ceos = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        companyId: { in: companyIds },
        status: 'ACTIVE',
      },
      select: { id: true, name: true, role: true },
    });

    const engagedUsers = [...updatedProject.engagedUsers];
    for (const ceo of ceos) {
      if (!engagedUsers.some((u) => u.id === ceo.id)) {
        engagedUsers.push(ceo);
      }
    }

    // Subcontractor engagements: the contract price is set/changed by ADMIN only;
    // managers/employees may assign, but the price stays as the admin set it.
    if (Array.isArray(subcontractors)) {
      const incomingIds = subcontractors.map((s: any) => s.subcontractorId);
      const existing = await prisma.subcontractorEngagement.findMany({ where: { projectId: id } });
      const byId = new Map(existing.map((e) => [e.subcontractorId, e]));

      for (const s of subcontractors) {
        const ex = byId.get(s.subcontractorId);
        if (ex) {
          if (isAdmin && s.contractAmount != null) {
            await prisma.subcontractorEngagement.update({ where: { id: ex.id }, data: { contractAmount: Number(s.contractAmount) || 0 } });
          }
        } else {
          await prisma.subcontractorEngagement.create({
            data: { projectId: id, subcontractorId: s.subcontractorId, contractAmount: isAdmin ? (Number(s.contractAmount) || 0) : 0 },
          });
        }
      }
      // Unassign removed subcontractors, but only when they carry no history.
      for (const e of existing) {
        if (!incomingIds.includes(e.subcontractorId)) {
          const [logs, pays] = await Promise.all([
            prisma.subcontractorLog.count({ where: { subcontractorId: e.subcontractorId, projectId: id } }),
            prisma.transaction.count({ where: { subcontractorId: e.subcontractorId, projectId: id } }),
          ]);
          if (logs + pays === 0) await prisma.subcontractorEngagement.delete({ where: { id: e.id } });
        }
      }
    }

    revalidatePath(`/projects/${id}`);
    revalidatePath('/', 'layout');

    return NextResponse.json({
      ...updatedProject,
      engagedUsers,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
