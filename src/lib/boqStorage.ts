// Secured storage for the raw uploaded BOQ workbook.
//
// The file is kept so exports can reproduce the EXACT original layout. It must
// never be web-served: we write it under BOQ_STORAGE_DIR (which in production
// must point OUTSIDE public_html / the Next.js `public` folder), give it a
// random, unguessable name, drop a defence-in-depth `.htaccess` deny file, and
// only ever stream it back through an authenticated route.
//
// On Vercel, this utilizes Cloudinary raw storage.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
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

/** Root directory for stored originals. Override with BOQ_STORAGE_DIR in prod. */
export function storageRoot(): string {
  return process.env.BOQ_STORAGE_DIR
    ? path.resolve(process.env.BOQ_STORAGE_DIR)
    : path.resolve(process.cwd(), 'storage', 'boq-originals');
}

const HTACCESS = 'Require all denied\nDeny from all\n';

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

/** Defence in depth on Apache hosts (cPanel): refuse direct web access. */
async function ensureDenyFile(root: string) {
  const file = path.join(root, '.htaccess');
  try {
    await fs.access(file);
  } catch {
    await fs.writeFile(file, HTACCESS, 'utf8');
  }
}

/**
 * Persist an uploaded workbook for a project. Returns either the Cloudinary URL
 * or the relative path reference for local fallback.
 */
export async function saveBoqOriginal(
  projectId: string,
  originalName: string,
  buf: Buffer,
): Promise<{ storagePath: string }> {
  if (isCloudinaryConfigured) {
    const ext = /\.xls$/i.test(originalName) ? '.xls' : '.xlsx';
    const name = `${crypto.randomBytes(16).toString('hex')}${ext}`;

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `icon_erp/boq-originals/${projectId}`,
          resource_type: 'raw',
          public_id: name,
        },
        (error, result) => {
          if (error) {
            console.error('[Cloudinary BOQ Upload Error]:', error);
            return reject(error);
          }
          if (!result) {
            return reject(new Error('Cloudinary BOQ upload result was empty'));
          }
          resolve({
            storagePath: result.secure_url,
          });
        }
      );

      const stream = new Readable();
      stream.push(buf);
      stream.push(null);
      stream.pipe(uploadStream);
    });
  } else {
    const root = storageRoot();
    await ensureDir(root);
    await ensureDenyFile(root);

    const ext = /\.xls$/i.test(originalName) ? '.xls' : '.xlsx';
    const dir = path.join(root, projectId);
    await ensureDir(dir);
    const name = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    const abs = path.join(dir, name);
    await fs.writeFile(abs, buf);

    return { storagePath: path.join(projectId, name).split(path.sep).join('/') };
  }
}

/** Resolve a stored relative path safely or fetch it from Cloudinary URL. */
export async function readBoqOriginal(storagePath: string): Promise<Buffer> {
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
    const res = await fetch(storagePath);
    if (!res.ok) {
      throw new Error(`Failed to fetch BOQ original from Cloudinary: ${res.statusText}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } else {
    const root = storageRoot();
    const abs = path.resolve(root, storagePath);
    const rootWithSep = path.resolve(root) + path.sep;
    if (abs !== path.resolve(root) && !abs.startsWith(rootWithSep)) {
      throw new Error('Invalid storage path');
    }
    return fs.readFile(abs);
  }
}

/** Best-effort removal of a previously stored original (from local or Cloudinary). */
export async function deleteBoqOriginal(storagePath: string): Promise<void> {
  try {
    if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
      const match = storagePath.match(/\/upload\/(?:v\d+\/)?(.+)$/);
      if (match && match[1]) {
        const publicId = decodeURIComponent(match[1]);
        await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
      }
    } else {
      const root = storageRoot();
      const abs = path.resolve(root, storagePath);
      const rootWithSep = path.resolve(root) + path.sep;
      if (abs.startsWith(rootWithSep)) await fs.unlink(abs);
    }
  } catch {
    /* ignore and log on fail */
  }
}
