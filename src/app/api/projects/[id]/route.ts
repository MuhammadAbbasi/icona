import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
  }

  try {
    const { password, permanent } = await req.json().catch(() => ({}));
    if (!password) {
      return NextResponse.json({ error: 'Confirmation password is required.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return NextResponse.json({ error: 'Admin user not found.' }, { status: 404 });
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Incorrect password.' }, { status: 400 });
    }

    if (permanent) {
      await prisma.project.delete({ where: { id: params.id } });
    } else {
      await prisma.project.update({
        where: { id: params.id },
        data: { deletedAt: new Date() },
      });
    }

    return NextResponse.json({ message: permanent ? 'Permanently deleted' : 'Deleted' });
  } catch (error: any) {
    console.error(`[DELETE /api/projects/${params.id}]`, error);
    return NextResponse.json({ error: error.message || 'Failed to delete project.' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { name, description, status, priority, startDate, endDate, budget, coveredArea, rebate, sstRate } = body;

    // Fetch existing project to compare dates
    const existing = await prisma.project.findUnique({
      where: { id: params.id },
      select: { endDate: true, name: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (budget !== undefined) updateData.budget = budget !== null ? parseFloat(budget) : null;
    // Project-overview inputs (per-sq-ft summary).
    if (coveredArea !== undefined) updateData.coveredArea = coveredArea !== null && coveredArea !== '' ? parseFloat(coveredArea) : null;
    if (rebate !== undefined) updateData.rebate = rebate !== null && rebate !== '' ? parseFloat(rebate) : null;
    if (sstRate !== undefined) updateData.sstRate = sstRate !== null && sstRate !== '' ? parseFloat(sstRate) : null;

    const updated = await prisma.project.update({
      where: { id: params.id },
      data: updateData,
    });

    // Check if deadline has changed
    const originalEndDate = existing.endDate ? new Date(existing.endDate).getTime() : null;
    const newEndDate = updated.endDate ? new Date(updated.endDate).getTime() : null;

    if (originalEndDate !== newEndDate) {
      // Trigger deadline change notification email
      const { sendDeadlineUpdatedEmail } = await import('@/lib/deadline-checker');
      sendDeadlineUpdatedEmail(
        { id: updated.id, name: updated.name, endDate: updated.endDate },
        existing.endDate
      ).catch((err) => console.error('Error sending deadline updated email:', err));
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error(`[PATCH /api/projects/${params.id}]`, error);
    return NextResponse.json({ error: error.message || 'Failed to update project.' }, { status: 500 });
  }
}
