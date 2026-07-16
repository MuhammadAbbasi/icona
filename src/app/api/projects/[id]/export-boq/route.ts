import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser } from '@/lib/apiAuth';
import { canAccessProject } from '@/lib/projectAccess';
import { readBoqOriginal } from '@/lib/boqStorage';
import { buildBoqExportWorkbook } from '@/lib/boqExport';
import { getBoqExportInputs } from '@/lib/boqExportData';

export const runtime = 'nodejs';

/**
 * GET /api/projects/[id]/export-boq
 * Stream the updated BOQ as an .xlsx that preserves the exact original layout
 * with appended per-revision quantity columns and the new final amount. Any
 * authenticated viewer (including the client) may download; the file is read
 * from secured storage and never exposed as a static URL.
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await canAccessProject(user, params.id))) {
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
    console.error('[GET /api/projects/[id]/export-boq]', e);
    return NextResponse.json({ error: 'Failed to build the export workbook' }, { status: 500 });
  }

  const base = source.originalName.replace(/\.xlsx?$/i, '');
  const fileName = `${base} (revised).xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName.replace(/"/g, '')}"`,
      'Cache-Control': 'no-store',
    },
  });
}
