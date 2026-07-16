import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const schema = z.object({
  name:        z.string().min(2),
  description: z.string().optional(),
  memberIds:   z.array(z.string()).optional(),
  workerIds:   z.array(z.string()).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!['ADMIN', 'MANAGER'].includes(session?.user?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const teams = await prisma.team.findMany({
    orderBy: { name: 'asc' },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
      workers: { select: { id: true, name: true, role: true, status: true, dailyWage: true } },
    },
  });
  return NextResponse.json(teams);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!['ADMIN', 'MANAGER'].includes(session?.user?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { name, description, memberIds = [], workerIds = [] } = parsed.data;
  const team = await prisma.team.create({
    data: {
      name,
      description: description || null,
      members: { create: memberIds.map((userId) => ({ userId })) },
    },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
      workers: { select: { id: true, name: true, role: true, status: true, dailyWage: true } },
    },
  });

  if (workerIds.length > 0) {
    await prisma.worker.updateMany({
      where: { id: { in: workerIds } },
      data: { teamId: team.id },
    });
    
    // Refetch to include updated workers state
    const updatedTeam = await prisma.team.findUnique({
      where: { id: team.id },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
        workers: { select: { id: true, name: true, role: true, status: true, dailyWage: true } },
      },
    });
    revalidatePath('/teams');
    revalidatePath('/team');
    revalidatePath('/', 'layout');
    return NextResponse.json(updatedTeam, { status: 201 });
  }

  revalidatePath('/teams');
  revalidatePath('/team');
  revalidatePath('/', 'layout');
  return NextResponse.json(team, { status: 201 });
}
