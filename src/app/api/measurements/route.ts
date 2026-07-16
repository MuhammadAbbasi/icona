import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser } from '@/lib/apiAuth';
import { normalizeMeasurement, type MeasurementInput } from '@/lib/measurements';

export const runtime = 'nodejs';

const STAFF = ['ADMIN', 'MANAGER', 'EMPLOYEE'];

const SELECT = {
  id: true, description: true, no: true, length: true, width: true, height: true, computed: true, order: true,
} as const;

// GET /api/measurements?subtaskId=..  |  ?taskId=..
// Returns the measurement rows for a priced line plus their summed total.
export async function GET(req: Request) {
  const user = await getApiUser(req);
  if (!STAFF.includes(user?.role ?? '') && user?.role !== 'CLIENT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const url = new URL(req.url);
  const subtaskId = url.searchParams.get('subtaskId');
  const taskId = url.searchParams.get('taskId');
  if (!subtaskId && !taskId) {
    return NextResponse.json({ error: 'subtaskId or taskId is required' }, { status: 400 });
  }
  const rows = await prisma.measurement.findMany({
    where: subtaskId ? { subtaskId } : { taskId: taskId! },
    orderBy: { order: 'asc' },
    select: SELECT,
  });
  const total = rows.reduce((a, r) => a + (r.computed ?? 0), 0);
  return NextResponse.json({ rows, total });
}

// PUT /api/measurements — replace ALL rows for one parent (subtask OR task).
// Body: { subtaskId?|taskId?, rows: MeasurementInput[] }
export async function PUT(req: Request) {
  const user = await getApiUser(req);
  if (!STAFF.includes(user?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const subtaskId: string | null = body.subtaskId ?? null;
  const taskId: string | null = body.taskId ?? null;
  if ((!subtaskId && !taskId) || (subtaskId && taskId)) {
    return NextResponse.json({ error: 'Provide exactly one of subtaskId or taskId' }, { status: 400 });
  }
  const rawRows: MeasurementInput[] = Array.isArray(body.rows) ? body.rows : [];
  const data = rawRows.map((r, i) => ({
    ...normalizeMeasurement(r, i),
    subtaskId: subtaskId ?? undefined,
    taskId: taskId ?? undefined,
  }));

  await prisma.$transaction([
    prisma.measurement.deleteMany({ where: subtaskId ? { subtaskId } : { taskId: taskId! } }),
    ...(data.length ? [prisma.measurement.createMany({ data })] : []),
  ]);

  const rows = await prisma.measurement.findMany({
    where: subtaskId ? { subtaskId } : { taskId: taskId! },
    orderBy: { order: 'asc' },
    select: SELECT,
  });
  const total = rows.reduce((a, r) => a + (r.computed ?? 0), 0);
  return NextResponse.json({ rows, total });
}
