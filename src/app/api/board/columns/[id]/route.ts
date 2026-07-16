import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { KANBAN_COLUMNS } from '@/lib/utils';

const VALID_IDS = KANBAN_COLUMNS.map((c) => c.id) as string[];

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!VALID_IDS.includes(params.id)) {
    return NextResponse.json({ error: 'Unknown column' }, { status: 404 });
  }

  const { label } = await req.json().catch(() => ({}));
  const trimmed = typeof label === 'string' ? label.trim() : '';
  if (!trimmed || trimmed.length > 40) {
    return NextResponse.json({ error: 'Invalid label' }, { status: 400 });
  }

  const column = await prisma.boardColumn.upsert({
    where: { id: params.id },
    update: { label: trimmed },
    create: { id: params.id, label: trimmed },
    select: { id: true, label: true },
  });

  return NextResponse.json(column);
}
