import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const VALID_STATUSES = ['UNDER_REVIEW', 'CONTRACT_FILLED', 'ONGOING', 'UNDER_CUSTOMER_REVIEW', 'COMPLETED'];

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!['ADMIN', 'MANAGER'].includes(session?.user?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { status } = await req.json().catch(() => ({}));
  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const project = await prisma.project.update({
    where: { id: params.id },
    data: { status },
    select: { id: true, status: true },
  });

  return NextResponse.json(project);
}
