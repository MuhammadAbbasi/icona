// Secured storage for user profile pictures (avatars) and company logos.
//
// Like BOQ files, uploads are kept under a storage directory that is excluded
// from git/FTP deployments. They are streamed back via an API route.

import { promises as fs } from 'node:fs';
import path from 'node:path';

export function uploadRoot(): string {
  return process.env.UPLOAD_STORAGE_DIR
    ? path.resolve(process.env.UPLOAD_STORAGE_DIR)
    : path.resolve(process.cwd(), 'storage', 'uploads');
}

const ALLOWED_TYPES = ['avatars', 'logos', 'photos', 'thumbnails'];

/**
 * Save an uploaded file to the local storage.
 * Returns the relative path reference for the database (e.g. "avatars/filename.png").
 */
export async function saveUploadFile(
  type: string,
  fileName: string,
  buf: Buffer,
): Promise<{ storagePath: string }> {
  if (!ALLOWED_TYPES.includes(type)) {
    throw new Error('Invalid upload type');
  }

  const root = uploadRoot();
  const dir = path.join(root, type);
  await fs.mkdir(dir, { recursive: true });

  // Apache/cPanel security gate: block direct web access
  const htaccessFile = path.join(root, '.htaccess');
  try {
    await fs.access(htaccessFile);
  } catch {
    await fs.writeFile(htaccessFile, 'Require all denied\nDeny from all\n', 'utf8');
  }

  const abs = path.join(dir, fileName);
  await fs.writeFile(abs, buf);

  // Return path formatted with forward slashes for cross-platform DB safety
  return { storagePath: `${type}/${fileName}` };
}

/**
 * Resolve a stored relative path safely (guards against path traversal) and read it.
 */
export async function readUploadFile(type: string, fileName: string): Promise<Buffer> {
  if (!ALLOWED_TYPES.includes(type)) {
    throw new Error('Invalid upload type');
  }

  const root = uploadRoot();
  const abs = path.resolve(root, type, fileName);
  const typeDirWithSep = path.resolve(root, type) + path.sep;

  // Path traversal check
  if (!abs.startsWith(typeDirWithSep)) {
    throw new Error('Invalid storage path');
  }

  return fs.readFile(abs);
}

/**
 * Best-effort deletion of an uploaded file.
 */
export async function deleteUploadFile(type: string, fileName: string): Promise<void> {
  if (!ALLOWED_TYPES.includes(type)) return;
  try {
    const root = uploadRoot();
    const abs = path.resolve(root, type, fileName);
    const typeDirWithSep = path.resolve(root, type) + path.sep;

    if (abs.startsWith(typeDirWithSep)) {
      await fs.unlink(abs);
    }
  } catch {
    /* ignore if already deleted */
  }
}
