import { NextResponse } from 'next/server';
import { readUploadFile } from '@/lib/uploadStorage';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: { type: string; filename: string } }
) {
  const { type, filename } = params;

  if (!type || !['avatars', 'logos', 'photos', 'thumbnails'].includes(type)) {
    return new Response('Not Found', { status: 404 });
  }

  try {
    const fileBuffer = await readUploadFile(type, filename);

    // Detect Content-Type based on file extension
    const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.svg') contentType = 'image/svg+xml';

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      // Cache static upload files to speed up page loads on user profiles / lists
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    };
    if (ext === '.svg') {
      // S2: user-uploaded SVG is untrusted markup served from our own origin.
      // A restrictive CSP + sandbox stops any inline script/event-handler from
      // executing if the file is opened directly, without relying on catching
      // every XSS vector at upload time (onload, onerror, <animate>, ...).
      headers['Content-Security-Policy'] = "default-src 'none'; style-src 'unsafe-inline'; sandbox";
    }

    return new Response(new Uint8Array(fileBuffer), { status: 200, headers });
  } catch (error) {
    // If file doesn't exist, return 404
    return new Response('Not Found', { status: 404 });
  }
}
