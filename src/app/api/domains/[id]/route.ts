import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser } from '@/lib/apiAuth';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getApiUser(req);
    if (!['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(user?.role ?? '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { name, color } = parsed.data;

    const updated = await prisma.domain.update({
      where: { id: params.id },
      data: {
        ...(name && { name: name.trim() }),
        ...(color !== undefined && { color: color ? color.trim() : null }),
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('[PATCH /api/domains/[id]]', error);
    return NextResponse.json({ error: 'Failed to update domain' }, { status: 500 });
  }
}
