import { v2 as cloudinary } from 'cloudinary';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Readable } from 'stream';

// Cloudflare R2 / S3 Storage Config
const r2Endpoint = (process.env.R2_ENDPOINT || process.env.S3_ENDPOINT || '').trim();
const r2AccessKey = (process.env.R2_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID || '').trim();
const r2SecretKey = (process.env.R2_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY || '').trim();
const r2Bucket = (process.env.R2_BUCKET_NAME || process.env.S3_BUCKET_NAME || '').trim();
const r2PublicDomain = (process.env.R2_PUBLIC_DOMAIN || process.env.S3_PUBLIC_DOMAIN || '').trim();

export const isR2Configured = !!(r2Endpoint && r2AccessKey && r2SecretKey && r2Bucket);

export const isCloudinaryConfigured = !isR2Configured && !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

let s3Client: S3Client | null = null;
if (isR2Configured) {
  s3Client = new S3Client({
    region: 'auto', // Cloudflare R2 requires region 'auto'
    endpoint: r2Endpoint,
    credentials: {
      accessKeyId: r2AccessKey,
      secretAccessKey: r2SecretKey,
    },
  });
}

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

function getMimeType(fileName: string, type: string): string {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (ext === '.xls') return 'application/vnd.ms-excel';
  if (type === 'photos' || type === 'thumbnails' || type === 'avatars') return 'image/jpeg';
  return 'application/octet-stream';
}

function getR2PublicUrl(key: string): string {
  if (r2PublicDomain) {
    const cleanDomain = r2PublicDomain.replace(/\/+$/, '');
    return `${cleanDomain}/${key}`;
  }
  // Fallback to internal API streaming route if no public custom domain is attached
  return `/api/uploads/${key}`;
}

/**
 * Uploads a file buffer to Cloudflare R2 (10GB Free S3 Storage) if configured,
 * or Cloudinary, or falls back to local disk storage.
 */
export async function uploadImage(
  buffer: Buffer,
  fileName: string,
  type: 'photos' | 'thumbnails' | 'logos' | 'avatars' | 'invoices'
): Promise<{ url: string; storagePath: string }> {
  const key = `icona/${type}/${fileName}`;

  // 1. Cloudflare R2 (Primary High-Capacity S3 Storage)
  if (isR2Configured && s3Client) {
    const contentType = getMimeType(fileName, type);
    await s3Client.send(
      new PutObjectCommand({
        Bucket: r2Bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    return {
      url: getR2PublicUrl(key),
      storagePath: key,
    };
  }

  // 2. Cloudinary Fallback
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
            storagePath: result.public_id,
          });
        }
      );

      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);
      stream.pipe(uploadStream);
    });
  }

  // 3. Local disk storage fallback
  const root = process.env.UPLOAD_STORAGE_DIR
    ? path.resolve(process.env.UPLOAD_STORAGE_DIR)
    : path.resolve(process.cwd(), 'storage', 'uploads');

  const dir = path.join(root, type);
  await fs.mkdir(dir, { recursive: true });

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

// ── Project documents (xlsx, pdf, contracts, etc.) ────────────────────────────
const DOCUMENTS_DIR = 'documents';

function localUploadRoot(): string {
  return process.env.UPLOAD_STORAGE_DIR
    ? path.resolve(process.env.UPLOAD_STORAGE_DIR)
    : path.resolve(process.cwd(), 'storage', 'uploads');
}

/**
 * Persist a generated or uploaded project document.
 */
export async function uploadDocument(
  buffer: Buffer,
  fileName: string
): Promise<{ url: string; storagePath: string }> {
  const key = `icona/${DOCUMENTS_DIR}/${fileName}`;

  // 1. Cloudflare R2
  if (isR2Configured && s3Client) {
    const contentType = getMimeType(fileName, 'documents');
    await s3Client.send(
      new PutObjectCommand({
        Bucket: r2Bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    return {
      url: getR2PublicUrl(key),
      storagePath: key,
    };
  }

  // 2. Cloudinary
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

  // 3. Local storage fallback
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

/** Read a stored document back (from Cloudflare R2, Cloudinary URL, or local disk). */
export async function readDocument(storagePath: string): Promise<Buffer> {
  // 1. Cloudflare R2 S3 Key
  if (isR2Configured && s3Client && storagePath.startsWith('icona/')) {
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: r2Bucket,
        Key: storagePath,
      })
    );
    if (!response.Body) throw new Error('Empty body returned from Cloudflare R2');
    const bytes = await response.Body.transformToByteArray();
    return Buffer.from(bytes);
  }

  // 2. HTTP URL (Cloudinary or Public R2 URL)
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
    const res = await fetch(storagePath);
    if (!res.ok) throw new Error(`Failed to fetch document: ${res.statusText}`);
    return Buffer.from(await res.arrayBuffer());
  }

  // 3. Local disk
  const root = localUploadRoot();
  const abs = path.resolve(root, storagePath);
  const rootWithSep = path.resolve(root) + path.sep;
  if (!abs.startsWith(rootWithSep)) throw new Error('Invalid storage path');
  return fs.readFile(abs);
}

/** Best-effort removal of a stored document (Cloudflare R2, Cloudinary, or local). */
export async function deleteDocument(storagePath: string): Promise<void> {
  try {
    if (isR2Configured && s3Client && storagePath.startsWith('icona/')) {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: r2Bucket,
          Key: storagePath,
        })
      );
      return;
    }

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
