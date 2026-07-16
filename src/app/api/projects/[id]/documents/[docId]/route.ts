import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser } from '@/lib/apiAuth';
import { canAccessProject } from '@/lib/projectAccess';
import { deleteDocument } from '@/lib/storage';

export const runtime = 'nodejs';

/**
 * DELETE /api/projects/[id]/documents/[docId]
 * Removes a stored ProjectDocument (file + row). ADMIN / MANAGER only. The
 * original BOQ (docId = "original") cannot be deleted here.
 */
export async function DELETE(req: Request, { params }: { params: { id: string; docId: string } }) {
  const user = await getApiUser(req);
  if (!['ADMIN', 'MANAGER'].includes(user?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!(await canAccessProject(user!, params.id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (params.docId === 'original') {
    return NextResponse.json({ error: 'The original BOQ cannot be deleted here.' }, { status: 400 });
  }

  const doc = await prisma.projectDocument.findFirst({
    where: { id: params.docId, projectId: params.id },
    select: { id: true, storagePath: true },
  });
  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

  await deleteDocument(doc.storagePath);
  await prisma.projectDocument.delete({ where: { id: doc.id } });

  return NextResponse.json({ ok: true });
}
