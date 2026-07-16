import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser } from '@/lib/apiAuth';

export async function POST(req: Request) {
  const user = await getApiUser(req);
  if (!['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(user?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { taskId, title } = await req.json().catch(() => ({}));
  if (!taskId || !title?.trim()) {
    return NextResponse.json({ error: 'taskId and title are required' }, { status: 400 });
  }

  const subtask = await prisma.subtask.create({
    data: { taskId, title: title.trim() },
  });
  return NextResponse.json(subtask, { status: 201 });
}
