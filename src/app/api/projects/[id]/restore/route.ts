import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
  }

  try {
    const project = await prisma.project.update({
      where: { id: params.id },
      data: { deletedAt: null },
    });
    return NextResponse.json({ message: 'Project restored successfully', project });
  } catch (error: any) {
    console.error(`[POST /api/projects/${params.id}/restore]`, error);
    return NextResponse.json({ error: error.message || 'Failed to restore project.' }, { status: 500 });
  }
}
