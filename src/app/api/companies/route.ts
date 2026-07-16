import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({
  name:    z.string().min(2, 'Name must be at least 2 characters'),
  type:    z.enum(['MAIN', 'CLIENT', 'FREELANCER']).optional(),
  email:   z.string().email().optional().or(z.literal('')),
  phone:   z.string().optional(),
  address: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  logo:    z.string().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companies = await prisma.company.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { projects: true, ownerProjects: true, users: true } } },
  });

  const processed = companies.map((c) => ({
    ...c,
    _count: {
      users: c._count.users,
      projects: c.type === 'MAIN' ? c._count.ownerProjects : c._count.projects,
    },
  }));

  return NextResponse.json(processed);
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

  const { name, type, email, phone, address, website, logo } = parsed.data;
  const company = await prisma.company.create({
    data: {
      name,
      type: type ?? 'CLIENT',
      email: email || null,
      phone: phone || null,
      address: address || null,
      website: website || null,
      logo: logo || null,
    },
  });
  return NextResponse.json(company, { status: 201 });
}
