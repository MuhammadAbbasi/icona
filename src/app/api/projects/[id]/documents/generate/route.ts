import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser } from '@/lib/apiAuth';
import { canAccessProject } from '@/lib/projectAccess';
import { readBoqOriginal } from '@/lib/boqStorage';
import { buildBoqExportWorkbook } from '@/lib/boqExport';
import { getBoqExportInputs } from '@/lib/boqExportData';
import { uploadDocument, buildStorageFileName } from '@/lib/storage';

export const runtime = 'nodejs';

/**
 * POST /api/projects/[id]/documents/generate
 * Builds the revised-BOQ workbook (original sheets with inline revision columns
 * + Extra Works / Measurements / Revisions tabs), stores it as a snapshot in the
 * documents storage, and records a ProjectDocument row. ADMIN / MANAGER only.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser(req);
  if (!['ADMIN', 'MANAGER'].includes(user?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!(await canAccessProject(user!, params.id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const source = await prisma.boqSourceFile.findUnique({
    where: { projectId: params.id },
    select: { originalName: true, storagePath: true },
  });
  if (!source) {
    return NextResponse.json(
      { error: 'No original BOQ file is stored for this project. Re-import the BOQ to enable export.' },
      { status: 404 },
    );
  }

  let originalBuf: Buffer;
  try {
    originalBuf = await readBoqOriginal(source.storagePath);
  } catch {
    return NextResponse.json({ error: 'Stored BOQ file could not be read' }, { status: 410 });
  }

  const { lines, revisions, measurements } = await getBoqExportInputs(params.id);

  let buffer: Buffer;
  try {
    buffer = await buildBoqExportWorkbook(originalBuf, lines, revisions, measurements);
  } catch (e) {
    console.error('[POST /api/projects/[id]/documents/generate]', e);
    return NextResponse.json({ error: 'Failed to build the export workbook' }, { status: 500 });
  }

  const latestIndex = revisions.length ? revisions[revisions.length - 1].index : 0;
  const stamp = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const revLabel = latestIndex > 0 ? `Rev ${latestIndex}` : 'Original';
  const base = source.originalName.replace(/\.xlsx?$/i, '');
  const originalName = `${base} (revised ${revLabel}).xlsx`;

  const orgId: string = (user as any).orgId ?? 'shared';
  const { url, storagePath } = await uploadDocument(buffer, buildStorageFileName(buffer, originalName), orgId);

  const doc = await prisma.projectDocument.create({
    data: {
      projectId: params.id,
      category: 'REVISED_BOQ',
      originalName,
      storagePath,
      url,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      sizeBytes: buffer.length,
      label: `Revised BOQ · ${revLabel} · ${stamp}`,
      revisionIndex: latestIndex || null,
      createdById: user!.id,
    },
    select: { id: true, category: true, originalName: true, label: true, revisionIndex: true, sizeBytes: true, createdAt: true },
  });

  return NextResponse.json({
    ok: true,
    document: { ...doc, downloadUrl: `/api/projects/${params.id}/documents/${doc.id}/download`, isOriginal: false },
  });
}
