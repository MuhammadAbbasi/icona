import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { resolvePlanTier, checkLimit } from '@/lib/entitlements';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE', 'FREELANCER', 'CLIENT']),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  companyId: z.string().optional(),
  salary: z.number().nonnegative().nullable().optional(),
  paymentType: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  phone: z.string().optional(),
  position: z.string().optional(),
  department: z.string().optional(),
  address: z.string().optional(),
  avatar: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { name, email, role, status, companyId, password, salary, paymentType, projectId, phone, position, department, address, avatar } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
  }

  // Entitlement gate (SaaS): refuse BEFORE creating if the tenant's plan is at its
  // team-member seat limit. "Members" = internal team seats (clients excluded).
  // No-op for the existing single-tenant instance (no plan resolved).
  // TODO(T-106): resolve from the session org's planId; TODO(T-103): scope the count to the org.
  const tier = resolvePlanTier((session?.user as { orgPlanId?: string } | undefined)?.orgPlanId);
  if (tier && role !== 'CLIENT') {
    const memberCount = await prisma.user.count({ where: { role: { not: 'CLIENT' } } });
    const gate = checkLimit(tier, 'members', memberCount);
    if (!gate.allowed) {
      return NextResponse.json({ error: gate.reason, code: 'PLAN_LIMIT' }, { status: 402 });
    }
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: await hashPassword(password),
      role,
      status: status ?? 'ACTIVE',
      companyId: companyId || null,
      salary: salary ?? null,
      paymentType: paymentType || null,
      projectId: projectId || null,
      phone: phone || null,
      position: position || null,
      department: department || null,
      address: address || null,
      avatar: avatar || null,
    },
    select: {
      id: true, name: true, email: true, role: true, status: true, salary: true,
      paymentType: true, projectId: true, project: { select: { id: true, name: true } },
      phone: true, position: true, department: true, address: true, companyId: true,
      company: { select: { id: true, name: true } },
      createdAt: true,
      avatar: true,
    },
  });

  return NextResponse.json(user, { status: 201 });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!['ADMIN', 'MANAGER'].includes(session?.user?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, email: true, role: true, companyId: true, createdAt: true },
  });

  return NextResponse.json(users);
}
