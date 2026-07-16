import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser } from '@/lib/apiAuth';
import { canAccessProject } from '@/lib/projectAccess';
import { readBoqOriginal } from '@/lib/boqStorage';
import { readDocument } from '@/lib/storage';

export const runtime = 'nodejs';

/**
 * GET /api/projects/[id]/documents/[docId]/download
 * Streams a project document. `docId = "original"` streams the stored original
 * BOQ (from BoqSourceFile); any other id streams a ProjectDocument. Files are
 * never web-served directly — this authenticated route is the only way out.
 */
export async function GET(req: Request, { params }: { params: { id: string; docId: string } }) {
  const user = await getApiUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await canAccessProject(user, params.id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let buffer: Buffer;
  let fileName: string;
  let mimeType = 'application/octet-stream';

  if (params.docId === 'original') {
    const source = await prisma.boqSourceFile.findUnique({
      where: { projectId: params.id },
      select: { originalName: true, storagePath: true },
    });
    if (!source) return NextResponse.json({ error: 'No original BOQ stored' }, { status: 404 });
    try {
      buffer = await readBoqOriginal(source.storagePath);
    } catch {
      return NextResponse.json({ error: 'Stored BOQ file could not be read' }, { status: 410 });
    }
    fileName = source.originalName;
    mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  } else {
    const doc = await prisma.projectDocument.findFirst({
      where: { id: params.docId, projectId: params.id },
      select: { originalName: true, storagePath: true, mimeType: true },
    });
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    try {
      buffer = await readDocument(doc.storagePath);
    } catch {
      return NextResponse.json({ error: 'Stored document could not be read' }, { status: 410 });
    }
    fileName = doc.originalName;
    if (doc.mimeType) mimeType = doc.mimeType;
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${fileName.replace(/"/g, '')}"`,
      'Cache-Control': 'no-store',
    },
  });
}
