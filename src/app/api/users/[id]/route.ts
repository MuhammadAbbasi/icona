import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE', 'FREELANCER', 'CLIENT']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  companyId: z.string().nullable().optional(),
  salary: z.number().nonnegative().nullable().optional(),
  paymentType: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  position: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isSelf = session.user.id === params.id;
  const isAdmin = session.user.role === 'ADMIN';

  if (!isAdmin && !isSelf) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const parsed = updateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const {
    name, email, role, status, companyId, salary, paymentType,
    projectId, phone, position, department, address, avatar
  } = parsed.data;

  // Non-admin users cannot update administrative/financial fields
  if (isSelf && !isAdmin) {
    if (
      role !== undefined ||
      status !== undefined ||
      companyId !== undefined ||
      salary !== undefined ||
      paymentType !== undefined ||
      projectId !== undefined
    ) {
      return NextResponse.json({ error: 'Forbidden: Cannot modify restricted fields' }, { status: 403 });
    }
  }

  // Guard the email uniqueness when changing it.
  if (email) {
    const clash = await prisma.user.findUnique({ where: { email } });
    if (clash && clash.id !== params.id) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
      ...(role !== undefined && { role }),
      ...(status !== undefined && { status }),
      ...(companyId !== undefined && { companyId: companyId || null }),
      ...(salary !== undefined && { salary }),
      ...(paymentType !== undefined && { paymentType: paymentType || null }),
      ...(projectId !== undefined && { projectId: projectId || null }),
      ...(phone !== undefined && { phone: phone || null }),
      ...(position !== undefined && { position: position || null }),
      ...(department !== undefined && { department: department || null }),
      ...(address !== undefined && { address: address || null }),
      ...(avatar !== undefined && { avatar: avatar || null }),
    },
    select: {
      id: true, name: true, email: true, role: true, status: true, salary: true,
      paymentType: true, projectId: true, project: { select: { id: true, name: true } },
      phone: true, position: true, department: true, address: true, avatar: true,
      companyId: true, company: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(user);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
  }

  if (session.user.id === params.id) {
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ message: 'Deleted' });
}
