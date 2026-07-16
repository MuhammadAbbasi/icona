import { v2 as cloudinary } from 'cloudinary';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Readable } from 'stream';

const isCloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

/**
 * Uploads a buffer to Cloudinary (if configured) or falls back to local storage (useful for dev/cPanel).
 * Returns the URL/path to access the image.
 */
export async function uploadImage(
  buffer: Buffer,
  fileName: string,
  type: 'photos' | 'thumbnails' | 'logos' | 'avatars' | 'invoices'
): Promise<{ url: string; storagePath: string }> {
  if (isCloudinaryConfigured) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `icon_erp/${type}`,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            console.error('[Cloudinary Upload Error]:', error);
            return reject(error);
          }
          if (!result) {
            return reject(new Error('Cloudinary upload result was empty'));
          }
          resolve({
            url: result.secure_url,
            storagePath: result.public_id, // we use public_id as storagePath in DB
          });
        }
      );

      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);
      stream.pipe(uploadStream);
    });
  } else {
    // Local storage fallback (saves to local disk, accessible via /api/uploads/[type]/[filename])
    const root = process.env.UPLOAD_STORAGE_DIR
      ? path.resolve(process.env.UPLOAD_STORAGE_DIR)
      : path.resolve(process.cwd(), 'storage', 'uploads');

    const dir = path.join(root, type);
    await fs.mkdir(dir, { recursive: true });

    // Ensure .htaccess block is present
    const htaccessFile = path.join(root, '.htaccess');
    try {
      await fs.access(htaccessFile);
    } catch {
      await fs.writeFile(htaccessFile, 'Require all denied\nDeny from all\n', 'utf8');
    }

    const abs = path.join(dir, fileName);
    await fs.writeFile(abs, buffer);

    const relativePath = `${type}/${fileName}`;
    return {
      url: `/api/uploads/${relativePath}`,
      storagePath: relativePath,
    };
  }
}

// ── Project documents (non-image files: xlsx, pdf, …) ────────────────────────
// Stored like photos are, but kept PRIVATE: local files live under
// storage/uploads/documents and are NOT web-served (the /api/uploads route does
// not allow the `documents` type); they are streamed only through the
// authenticated documents download route. On Cloudinary we use raw storage.
const DOCUMENTS_DIR = 'documents';

function localUploadRoot(): string {
  return process.env.UPLOAD_STORAGE_DIR
    ? path.resolve(process.env.UPLOAD_STORAGE_DIR)
    : path.resolve(process.cwd(), 'storage', 'uploads');
}

/**
 * Persist a generated/uploaded document. `storagePath` is the Cloudinary URL (so
 * downloads can fetch it) or the relative local path (e.g. "documents/ab12.xlsx").
 */
export async function uploadDocument(
  buffer: Buffer,
  fileName: string,
): Promise<{ url: string; storagePath: string }> {
  if (isCloudinaryConfigured) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `icon_erp/${DOCUMENTS_DIR}`,
          resource_type: 'raw',
          public_id: fileName,
        },
        (error, result) => {
          if (error) {
            console.error('[Cloudinary Document Upload Error]:', error);
            return reject(error);
          }
          if (!result) return reject(new Error('Cloudinary document upload result was empty'));
          resolve({ url: result.secure_url, storagePath: result.secure_url });
        }
      );
      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);
      stream.pipe(uploadStream);
    });
  }

  const root = localUploadRoot();
  const dir = path.join(root, DOCUMENTS_DIR);
  await fs.mkdir(dir, { recursive: true });
  const htaccessFile = path.join(root, '.htaccess');
  try {
    await fs.access(htaccessFile);
  } catch {
    await fs.writeFile(htaccessFile, 'Require all denied\nDeny from all\n', 'utf8');
  }
  const abs = path.join(dir, fileName);
  await fs.writeFile(abs, buffer);
  const relativePath = `${DOCUMENTS_DIR}/${fileName}`;
  return { url: relativePath, storagePath: relativePath };
}

/** Read a stored document back (from Cloudinary URL or the local disk). */
export async function readDocument(storagePath: string): Promise<Buffer> {
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
    const res = await fetch(storagePath);
    if (!res.ok) throw new Error(`Failed to fetch document: ${res.statusText}`);
    return Buffer.from(await res.arrayBuffer());
  }
  const root = localUploadRoot();
  const abs = path.resolve(root, storagePath);
  const rootWithSep = path.resolve(root) + path.sep;
  if (!abs.startsWith(rootWithSep)) throw new Error('Invalid storage path');
  return fs.readFile(abs);
}

/** Best-effort removal of a stored document (Cloudinary or local). */
export async function deleteDocument(storagePath: string): Promise<void> {
  try {
    if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
      const match = storagePath.match(/\/upload\/(?:v\d+\/)?(.+)$/);
      if (match?.[1]) {
        await cloudinary.uploader.destroy(decodeURIComponent(match[1]), { resource_type: 'raw' });
      }
    } else {
      const root = localUploadRoot();
      const abs = path.resolve(root, storagePath);
      const rootWithSep = path.resolve(root) + path.sep;
      if (abs.startsWith(rootWithSep)) await fs.unlink(abs);
    }
  } catch {
    /* ignore */
  }
}

/** Build a safe stored filename with a random prefix, preserving the extension. */
export function documentFileName(originalName: string): string {
  const dot = originalName.lastIndexOf('.');
  const ext = dot > -1 ? originalName.slice(dot).toLowerCase() : '';
  return `${crypto.randomBytes(16).toString('hex')}${ext}`;
}
