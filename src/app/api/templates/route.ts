import { NextResponse } from 'next/server';
import { getApiUser } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const user = await getApiUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = await prisma.customTemplate.findMany({
      orderBy: { label: 'asc' },
    });

    // Parse tasks JSON back to objects
    const formatted = templates.map((t) => ({
      key: t.id,
      label: t.label,
      aliases: [t.label.toLowerCase()],
      tasks: JSON.parse(t.tasks),
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getApiUser(req);
    if (!user || !['ADMIN', 'MANAGER'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { label, tasks } = body;

    if (!label?.trim() || !tasks || !Array.isArray(tasks)) {
      return NextResponse.json({ error: 'Missing template name or tasks' }, { status: 400 });
    }

    const template = await prisma.customTemplate.upsert({
      where: { label: label.trim() },
      update: {
        tasks: JSON.stringify(tasks),
      },
      create: {
        label: label.trim(),
        tasks: JSON.stringify(tasks),
      },
    });

    return NextResponse.json(template);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
