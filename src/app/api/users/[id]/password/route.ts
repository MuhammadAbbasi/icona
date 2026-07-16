import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { z } from 'zod';

const schema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

// Admin-only password reset for another user (no current password required).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  await prisma.user.update({
    where: { id: params.id },
    data: { password: await hashPassword(parsed.data.newPassword) },
  });

  return NextResponse.json({ message: 'Password reset successfully' });
}
