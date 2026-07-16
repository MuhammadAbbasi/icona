import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser } from '@/lib/apiAuth';
import { canAccessProject } from '@/lib/projectAccess';

export const runtime = 'nodejs';

/**
 * GET /api/projects/[id]/documents
 * Lists the project's documents: the original uploaded BOQ (from BoqSourceFile,
 * surfaced as a virtual entry) plus every stored ProjectDocument, newest first.
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await canAccessProject(user, params.id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const [source, docs] = await Promise.all([
    prisma.boqSourceFile.findUnique({
      where: { projectId: params.id },
      select: { originalName: true, createdAt: true, storagePath: true },
    }),
    prisma.projectDocument.findMany({
      where: { projectId: params.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, category: true, originalName: true, label: true,
        revisionIndex: true, sizeBytes: true, mimeType: true, createdAt: true,
        createdBy: { select: { name: true } },
      },
    }),
  ]);

  const documents = docs.map((d) => ({
    ...d,
    createdByName: d.createdBy?.name ?? null,
    downloadUrl: `/api/projects/${params.id}/documents/${d.id}/download`,
    isOriginal: false,
  }));

  // The original BOQ is not a ProjectDocument row; surface it as a virtual entry
  // so it appears alongside the generated exports and can be downloaded.
  const original = source
    ? {
        id: 'original',
        category: 'ORIGINAL_BOQ',
        originalName: source.originalName,
        label: 'Original BOQ (as uploaded)',
        revisionIndex: null as number | null,
        sizeBytes: null as number | null,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        createdAt: source.createdAt,
        createdByName: null as string | null,
        downloadUrl: `/api/projects/${params.id}/documents/original/download`,
        isOriginal: true,
        canExport: /\.xlsx$/i.test(source.storagePath),
      }
    : null;

  return NextResponse.json({ hasOriginal: !!source, original, documents });
}
