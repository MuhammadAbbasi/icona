import { NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const runtime = 'nodejs';

const ALLOWED_TYPES = ['avatars', 'logos', 'photos', 'thumbnails', 'invoices', 'documents', 'receipts', 'files'];

function getContentType(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.doc' || ext === '.docx') return 'application/msword';
  if (ext === '.xlsx' || ext === '.xls') return 'application/vnd.ms-excel';
  if (ext === '.csv') return 'text/csv';
  if (ext === '.txt') return 'text/plain';
  return 'application/octet-stream';
}

/**
 * GET /api/uploads/[...path]
 *
 * Serves uploaded files from local disk storage.
 * Supports two path structures:
 *   - Legacy:  /api/uploads/<type>/<filename>
 *   - Org-isolated: /api/uploads/<orgId>/<type>/<filename>
 *
 * The file is resolved safely (path traversal guarded) and streamed back
 * with an appropriate Content-Type. Files are never directly web-accessible
 * (blocked by .htaccess on Apache/cPanel deployments).
 */
export async function GET(
  req: Request,
  { params }: { params: { path: string[] } }
) {
  const segments = params.path;

  if (!segments || segments.length < 2) {
    return new Response('Not Found', { status: 404 });
  }

  const root = process.env.UPLOAD_STORAGE_DIR
    ? path.resolve(process.env.UPLOAD_STORAGE_DIR)
    : path.resolve(process.cwd(), 'storage', 'uploads');

  // Determine path layout:
  //   2 segments => <type>/<filename>  (legacy, no org isolation)
  //   3 segments => <orgId>/<type>/<filename>  (org-isolated)
  let type: string;
  let filename: string;

  if (segments.length === 2) {
    [type, filename] = segments;
  } else if (segments.length === 3) {
    [, type, filename] = segments; // orgId is segments[0] - part of filesystem path
  } else {
    // Deeper nesting is unsupported
    return new Response('Not Found', { status: 404 });
  }

  if (!ALLOWED_TYPES.includes(type)) {
    return new Response('Not Found', { status: 404 });
  }

  try {
    // Reconstruct the relative path as stored in DB
    const relPath = segments.join('/');
    const abs = path.resolve(root, relPath);

    // Path traversal guard: resolved path must stay inside the upload root
    const rootWithSep = path.resolve(root) + path.sep;
    if (!abs.startsWith(rootWithSep)) {
      return new Response('Forbidden', { status: 403 });
    }

    const fileBuffer = await fs.readFile(abs);
    const contentType = getContentType(filename);

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      // Long-lived cache — filenames include a content hash so they are immutable
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    };

    if (contentType === 'image/svg+xml') {
      // Prevent inline script execution from user-uploaded SVG served on our origin
      headers['Content-Security-Policy'] = "default-src 'none'; style-src 'unsafe-inline'; sandbox";
    }

    return new Response(new Uint8Array(fileBuffer), { status: 200, headers });
  } catch {
    return new Response('Not Found', { status: 404 });
  }
}
