import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getApiUser } from '@/lib/apiAuth';
import { canAccessProject } from '@/lib/projectAccess';
import { listProjectPhotos, saveProjectPhoto } from '@/lib/photoStorage';
import { CORS_HEADERS } from '@/lib/cors';

export const runtime = 'nodejs';

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB — phone camera photos

function photoUrl(projectId: string, fileName: string): string {
  return `/api/mobile/projects/${projectId}/photos/${fileName}`;
}

/**
 * GET /api/mobile/projects/[id]/photos
 * List the project's on-site photos (newest first). Any user who can see the
 * project (CLIENT scoped to own company) may view.
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });
  if (!(await canAccessProject(user, params.id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: CORS_HEADERS });
  }

  const files = await listProjectPhotos(params.id);
  const photos = files.map((fileName) => ({ fileName, url: photoUrl(params.id, fileName) }));
  return NextResponse.json({ photos }, { headers: CORS_HEADERS });
}

/**
 * POST /api/mobile/projects/[id]/photos   (multipart/form-data, field: file)
 * Upload a progress photo into the project's folder. Staff only (matches the
 * canEdit boundary); CLIENT/FREELANCER cannot upload.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser(req);
  if (!['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(user?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: CORS_HEADERS });
  }
  if (!(await canAccessProject(user!, params.id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: CORS_HEADERS });
  }

  try {
    const data = await req.formData();
    const file = data.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400, headers: CORS_HEADERS });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds 10MB limit' }, { status: 400, headers: CORS_HEADERS });
    }

    const dotIdx = file.name.lastIndexOf('.');
    const ext = dotIdx === -1 ? '' : file.name.slice(dotIdx).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: 'Allowed formats: JPG, JPEG, PNG' }, { status: 400, headers: CORS_HEADERS });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    await saveProjectPhoto(params.id, fileName, buffer);

    return NextResponse.json(
      { ok: true, fileName, url: photoUrl(params.id, fileName) },
      { headers: CORS_HEADERS },
    );
  } catch (error) {
    console.error('[POST /api/mobile/projects/[id]/photos]', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500, headers: CORS_HEADERS });
  }
}
