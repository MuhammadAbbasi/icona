// Secured storage for on-site progress photos, one folder per project.
//
// Layout:  <PROJECT_PHOTO_DIR>/<projectId>/<random>.<ext>
// Like BOQ originals and avatar uploads, these live OUTSIDE the web root and are
// only ever streamed back through an authenticated route. A defence-in-depth
// `.htaccess` deny file is dropped at the root.

import { promises as fs } from 'node:fs';
import path from 'node:path';

/** Root for all project photo folders. Override with PROJECT_PHOTO_DIR in prod. */
export function photoRoot(): string {
  return process.env.PROJECT_PHOTO_DIR
    ? path.resolve(process.env.PROJECT_PHOTO_DIR)
    : path.resolve(process.cwd(), 'storage', 'project-photos');
}

// Project ids are cuids; allow only safe path segments to block traversal.
const SAFE_SEGMENT = /^[a-zA-Z0-9_-]+$/;

function projectDir(projectId: string): string {
  if (!SAFE_SEGMENT.test(projectId)) throw new Error('Invalid project id');
  return path.join(photoRoot(), projectId);
}

async function ensureDenyFile(root: string): Promise<void> {
  const htaccess = path.join(root, '.htaccess');
  try {
    await fs.access(htaccess);
  } catch {
    await fs.mkdir(root, { recursive: true });
    await fs.writeFile(htaccess, 'Require all denied\nDeny from all\n', 'utf8');
  }
}

/** Save a photo into the project's folder. Returns its stored file name. */
export async function saveProjectPhoto(
  projectId: string,
  fileName: string,
  buf: Buffer,
): Promise<{ fileName: string }> {
  if (!SAFE_SEGMENT.test(fileName.replace(/\.[a-z0-9]+$/i, ''))) {
    throw new Error('Invalid file name');
  }
  const root = photoRoot();
  await ensureDenyFile(root);
  const dir = projectDir(projectId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, fileName), buf);
  return { fileName };
}

/** List a project's photo file names, newest first. Missing folder → empty. */
export async function listProjectPhotos(projectId: string): Promise<string[]> {
  const dir = projectDir(projectId);
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }
  const files = entries.filter((f) => /\.(jpe?g|png)$/i.test(f));
  const withTimes = await Promise.all(
    files.map(async (f) => ({ f, t: (await fs.stat(path.join(dir, f))).mtimeMs })),
  );
  return withTimes.sort((a, b) => b.t - a.t).map((x) => x.f);
}

/** Read one photo, guarding against path traversal out of the project folder. */
export async function readProjectPhoto(projectId: string, fileName: string): Promise<Buffer> {
  const dir = projectDir(projectId);
  const abs = path.resolve(dir, fileName);
  if (!abs.startsWith(dir + path.sep)) throw new Error('Invalid storage path');
  return fs.readFile(abs);
}
