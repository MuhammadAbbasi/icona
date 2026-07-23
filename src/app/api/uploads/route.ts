import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { uploadImage, buildStorageFileName } from '@/lib/storage';

export const runtime = 'nodejs';

const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.pdf'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

// Magic byte signatures for binary formats.
const MAGIC: Array<{ ext: string; bytes: number[]; offset?: number }> = [
  { ext: '.png',  bytes: [0x89, 0x50, 0x4e, 0x47] },
  { ext: '.jpg',  bytes: [0xff, 0xd8, 0xff] },
  { ext: '.jpeg', bytes: [0xff, 0xd8, 0xff] },
  { ext: '.gif',  bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF8
  { ext: '.pdf',  bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
];

function validateMagicBytes(ext: string, buf: Buffer): boolean {
  // SVG is XML text — verify it starts with '<svg' or '<?xml' (case-insensitive) and
  // contains no <script> tags so it can't be used as an XSS vector.
  if (ext === '.svg') {
    const text = buf.subarray(0, 2048).toString('utf8').trimStart().toLowerCase();
    if (!text.startsWith('<svg') && !text.startsWith('<?xml') && !text.startsWith('<!--')) return false;
    if (/<script[\s>]/i.test(buf.toString('utf8'))) return false;
    return true;
  }
  const sig = MAGIC.find((m) => m.ext === ext);
  if (!sig) return false;
  return sig.bytes.every((b, i) => buf[i] === b);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.formData();
    const file = data.get('file') as File | null;
    const type = data.get('type') as string | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!type || !['avatars', 'logos', 'invoices'].includes(type)) {
      return NextResponse.json({ error: 'Invalid upload type (must be avatars, logos, or invoices)' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds maximum limit of 2MB' }, { status: 400 });
    }

    // Validate file extension
    const originalName = file.name;
    const dotIdx = originalName.lastIndexOf('.');
    if (dotIdx === -1) {
      return NextResponse.json({ error: 'File lacks extension' }, { status: 400 });
    }
    const ext = originalName.slice(dotIdx).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: 'Allowed formats: PNG, JPG, JPEG, GIF, SVG' }, { status: 400 });
    }

    // Read the file data into a buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Reject files whose content doesn't match the declared extension
    if (!validateMagicBytes(ext, buffer)) {
      return NextResponse.json({ error: 'File content does not match its extension' }, { status: 400 });
    }

    // Build a collision-proof filename: sha256(content)[0..16]_<timestamp><ext>
    const safeName = buildStorageFileName(buffer, originalName);

    // Save file under the org's isolated folder
    const orgId: string = (session.user as any).orgId ?? 'shared';
    const { url } = await uploadImage(buffer, safeName, type as any, orgId);

    // Return the URL path to the saved file
    return NextResponse.json({
      ok: true,
      url,
    });
  } catch (error: any) {
    console.error('[POST /api/uploads]', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
