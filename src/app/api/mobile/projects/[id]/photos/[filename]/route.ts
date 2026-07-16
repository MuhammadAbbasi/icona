import { NextResponse } from 'next/server';
import { getApiUser } from '@/lib/apiAuth';
import { canAccessProject } from '@/lib/projectAccess';
import { readProjectPhoto } from '@/lib/photoStorage';
import { CORS_HEADERS } from '@/lib/cors';

export const runtime = 'nodejs';

/**
 * GET /api/mobile/projects/[id]/photos/[filename]
 * Stream one project photo. Authenticated (the app passes the bearer token in the
 * Image request headers) and scoped to users who can see the project.
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string; filename: string } },
) {
  const user = await getApiUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });
  if (!(await canAccessProject(user, params.id))) {
    return new Response('Not Found', { status: 404 });
  }

  try {
    const buf = await readProjectPhoto(params.id, params.filename);
    const ext = params.filename.slice(params.filename.lastIndexOf('.')).toLowerCase();
    const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return new Response('Not Found', { status: 404 });
  }
}
