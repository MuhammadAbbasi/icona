import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseBoqBuffer } from '@/lib/boqParser';
import { readBoqUpload } from '@/lib/boqUpload';
import { saveBoqOriginal, deleteBoqOriginal } from '@/lib/boqStorage';

import { recalculateProjectProgress } from '@/lib/progress';

export const runtime = 'nodejs';

/**
 * importProjectBOQ — parse an uploaded BOQ workbook and create the full
 * Domain → Task → Subtask hierarchy under an existing project in a single
 * atomic transaction. Optional `selected` form field (JSON array of domain
 * indices) limits which detected domains are imported.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  try {
    const form = await req.formData();
    const upload = await readBoqUpload(form);
    if (!upload.ok) {
      return NextResponse.json({ error: upload.error }, { status: upload.status });
    }

    const includeZeroQty = form.get('includeZeroQty') === 'true';
    const parsed = parseBoqBuffer(upload.buf, { includeZeroQty });

    // Optional domain selection (indices into the parsed order).
    let domains = parsed.domains;
    const selectedRaw = form.get('selected');
    if (typeof selectedRaw === 'string' && selectedRaw.trim()) {
      try {
        const idx = new Set<number>(JSON.parse(selectedRaw));
        domains = domains.filter((_, i) => idx.has(i));
      } catch { /* ignore malformed selection — import all */ }
    }

    if (!domains.length) {
      return NextResponse.json({ error: 'No domains selected to import' }, { status: 400 });
    }

    const userId = session.user.id;

    // Persist the raw workbook so exports can reproduce the exact original
    // layout. Sheet names are taken from the rows that actually produced data.
    const sheetNames = Array.from(
      new Set(parsed.domains.flatMap((d) => d.tasks.flatMap((t) => t.subtasks.map((s) => s.sourceSheet)))),
    );
    const existingSource = await prisma.boqSourceFile.findUnique({
      where: { projectId: project.id },
      select: { storagePath: true },
    });
    const { storagePath } = await saveBoqOriginal(project.id, upload.fileName, upload.buf);

    try {
      // Atomic: every domain/task/subtask plus the source-file record is created
      // (or none are).
      await prisma.$transaction([
        ...domains.map((d) =>
          prisma.domain.create({
            data: {
              projectId: project.id,
              name: d.name,
              color: d.color,
              tasks: {
                create: d.tasks.map((t) => ({
                  title: t.title,
                  creatorId: userId,
                  subtasks: {
                    create: t.subtasks.map((s) => ({
                      title: s.title,
                      description: s.description,
                      unit: s.unit,
                      quantity: s.quantity,
                      rate: s.rate,
                      sourceSheet: s.sourceSheet,
                      sourceRow: s.sourceRow,
                    })),
                  },
                })),
              },
            },
          }),
        ),
        prisma.boqSourceFile.upsert({
          where: { projectId: project.id },
          create: {
            projectId: project.id,
            originalName: upload.fileName,
            storagePath,
            sheetNames: JSON.stringify(sheetNames),
          },
          update: {
            originalName: upload.fileName,
            storagePath,
            sheetNames: JSON.stringify(sheetNames),
          },
        }),
      ]);
    } catch (txErr) {
      // Roll back the just-written file so we don't leave an orphan on disk.
      await deleteBoqOriginal(storagePath);
      throw txErr;
    }

    // A replaced source file: drop the previous one from disk.
    if (existingSource?.storagePath && existingSource.storagePath !== storagePath) {
      await deleteBoqOriginal(existingSource.storagePath);
    }

    // Recalculate progress for the project to reflect the newly imported tasks
    await recalculateProjectProgress(project.id);

    return NextResponse.json({
      ok: true,
      domainCount: domains.length,
      taskCount: domains.reduce((s, d) => s + d.tasks.length, 0),
      subtaskCount: domains.reduce((s, d) => s + d.subtaskCount, 0),
      totalAmount: domains.reduce((s, d) => s + d.amount, 0),
    });
  } catch (e: any) {
    console.error('[POST /api/projects/[id]/import-boq]', e);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
