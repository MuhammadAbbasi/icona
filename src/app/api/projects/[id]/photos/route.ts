import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadImage } from '@/lib/storage';
import exifr from 'exifr';
import crypto from 'node:crypto';

export const runtime = 'nodejs';

// Supported file constraints
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.heic'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  const isAuthorized = ['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(role);
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const data = await req.formData();
    const file = data.get('file') as File | null;
    const thumbnail = data.get('thumbnail') as File | null;
    const parentId = data.get('parentId') as string | null;
    const parentType = data.get('parentType') as string | null;

    if (!file || !thumbnail || !parentId || !parentType) {
      return NextResponse.json(
        { error: 'Missing required parameters: file, thumbnail, parentId, parentType' },
        { status: 400 }
      );
    }

    if (!['TASK', 'SUBTASK'].includes(parentType)) {
      return NextResponse.json({ error: 'Invalid parentType (must be TASK or SUBTASK)' }, { status: 400 });
    }

    // Verify file size constraint
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds maximum limit of 10MB' }, { status: 400 });
    }

    // Verify file extension
    const originalName = file.name;
    const dotIdx = originalName.lastIndexOf('.');
    if (dotIdx === -1) {
      return NextResponse.json({ error: 'File lacks extension' }, { status: 400 });
    }
    const ext = originalName.slice(dotIdx).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: 'Allowed formats: PNG, JPG, JPEG, WEBP, HEIC' }, { status: 400 });
    }

    // Verify parent task or subtask exists and fetch its title for caching
    let parentTitle = '';
    let dbTaskId: string | null = null;
    let dbSubtaskId: string | null = null;

    if (parentType === 'TASK') {
      const task = await prisma.task.findUnique({
        where: { id: parentId },
        select: { title: true },
      });
      if (!task) {
        return NextResponse.json({ error: 'Parent Task not found' }, { status: 404 });
      }
      parentTitle = task.title;
      dbTaskId = parentId;
    } else {
      const subtask = await prisma.subtask.findUnique({
        where: { id: parentId },
        select: { title: true },
      });
      if (!subtask) {
        return NextResponse.json({ error: 'Parent Subtask not found' }, { status: 404 });
      }
      parentTitle = subtask.title;
      dbSubtaskId = parentId;
    }

    // Read full-size image array buffer
    const fileBytes = await file.arrayBuffer();
    const fileBuffer = Buffer.from(fileBytes);

    // Read thumbnail array buffer
    const thumbBytes = await thumbnail.arrayBuffer();
    const thumbBuffer = Buffer.from(thumbBytes);

    // EXIF Coordinates & Time Taken Extraction using exifr
    let latitude: number | null = null;
    let longitude: number | null = null;
    let takenAt: Date | null = null;

    try {
      const parsed = await exifr.parse(fileBuffer);
      if (parsed) {
        if (typeof parsed.latitude === 'number') latitude = parsed.latitude;
        if (typeof parsed.longitude === 'number') longitude = parsed.longitude;
        if (parsed.DateTimeOriginal instanceof Date) {
          takenAt = parsed.DateTimeOriginal;
        } else if (parsed.DateTimeOriginal) {
          takenAt = new Date(parsed.DateTimeOriginal);
        }
      }
    } catch (e) {
      console.warn('Failed to parse EXIF metadata:', e);
    }

    // Upload files using the storage adapter (Cloudinary or local fallback)
    const sanitizedName = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    const thumbSanitizedName = `thumb_${crypto.randomBytes(16).toString('hex')}${ext}`;

    const [uploadedFile, uploadedThumb] = await Promise.all([
      uploadImage(fileBuffer, sanitizedName, 'photos'),
      uploadImage(thumbBuffer, thumbSanitizedName, 'thumbnails'),
    ]);

    // Save metadata in database
    const photo = await prisma.taskPhoto.create({
      data: {
        originalName,
        storagePath: uploadedFile.url,
        thumbnailPath: uploadedThumb.url,
        parentType,
        parentId,
        parentTitle,
        latitude,
        longitude,
        takenAt,
        projectId: params.id,
        taskId: dbTaskId,
        subtaskId: dbSubtaskId,
        uploaderId: session.user.id,
      },
      include: {
        uploader: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json({ ok: true, photo });
  } catch (error: any) {
    console.error('[POST /api/projects/[id]/photos]', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  const isAuthorized = ['ADMIN', 'MANAGER', 'EMPLOYEE', 'CLIENT'].includes(role);
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const filterTaskId = url.searchParams.get('taskId');
    const filterSubtaskId = url.searchParams.get('subtaskId');
    const filterUploaderId = url.searchParams.get('uploaderId');
    const sort = url.searchParams.get('sort') || 'newest'; // newest | oldest | taken

    // Archived visibility: Only Admin and Manager can see archived photos
    const showArchivedOnly = url.searchParams.get('archived') === 'true';
    const canSeeArchive = ['ADMIN', 'MANAGER'].includes(role);

    const where: any = {
      projectId: params.id,
    };

    if (canSeeArchive && showArchivedOnly) {
      where.archived = true;
    } else {
      where.archived = false; // standard users and default view only see active
    }

    if (filterTaskId) where.taskId = filterTaskId;
    if (filterSubtaskId) where.subtaskId = filterSubtaskId;
    if (filterUploaderId) where.uploaderId = filterUploaderId;

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'oldest') {
      orderBy = { createdAt: 'asc' };
    } else if (sort === 'taken') {
      orderBy = { takenAt: 'desc' };
    }

    const photos = await prisma.taskPhoto.findMany({
      where,
      orderBy,
      include: {
        uploader: { select: { id: true, name: true, role: true } },
        project: { select: { name: true } },
        task: {
          select: {
            title: true,
            domain: {
              select: {
                id: true,
                name: true,
                color: true,
              }
            }
          }
        },
        subtask: {
          select: {
            title: true,
            task: {
              select: {
                title: true,
                domain: {
                  select: {
                    id: true,
                    name: true,
                    color: true,
                  }
                }
              }
            }
          }
        }
      },
    });

    return NextResponse.json(photos);
  } catch (error: any) {
    console.error('[GET /api/projects/[id]/photos]', error);
    return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
  }
}
