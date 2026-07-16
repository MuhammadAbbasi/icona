'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Upload, X, MapPin, Calendar, Trash2, Eye, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { compressImage, generateSquareThumbnail } from '@/lib/imageProcess';
import { cn } from '@/lib/utils';

interface PhotoAttachmentSectionProps {
  parentId: string;
  parentType: 'TASK' | 'SUBTASK';
  projectId: string;
  canEdit: boolean;
}

interface PhotoItem {
  id: string;
  originalName: string;
  storagePath: string;
  thumbnailPath: string;
  parentType: 'TASK' | 'SUBTASK';
  parentId: string;
  parentTitle: string;
  latitude: number | null;
  longitude: number | null;
  takenAt: string | null;
  createdAt: string;
  uploader: {
    id: string;
    name: string;
    role: string;
  };
}

interface UploadQueueItem {
  id: string;
  fileName: string;
  progress: number;
  status: 'compressing' | 'uploading' | 'success' | 'error';
  errorMsg?: string;
}

export function PhotoAttachmentSection({
  parentId,
  parentType,
  projectId,
  canEdit,
}: PhotoAttachmentSectionProps) {
  const { data: session } = useSession();
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [lightboxPhoto, setLightboxPhoto] = useState<PhotoItem | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load photos for this parent task/subtask
  const loadPhotos = async () => {
    try {
      const url = `/api/projects/${projectId}/photos?${
        parentType === 'TASK' ? 'taskId' : 'subtaskId'
      }=${parentId}`;
      const res = await fetch(url);
      if (res.ok) {
        setPhotos(await res.json());
      }
    } catch (err) {
      console.error('Failed to load photos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentId, projectId]);

  // Handle Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFilesUpload(Array.from(e.dataTransfer.files));
    }
  };

  // Handle File Input Change
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFilesUpload(Array.from(e.target.files));
    }
  };

  // Upload Logic
  const handleFilesUpload = async (files: File[]) => {
    if (!canEdit) return;

    // Filter image files
    const validImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    const selectedImages = files.filter(
      (file) =>
        validImageTypes.includes(file.type) ||
        file.name.toLowerCase().endsWith('.heic')
    );

    if (selectedImages.length === 0) {
      alert('Please upload valid image files (PNG, JPG, WEBP, or HEIC).');
      return;
    }

    // Limit to 10 files per session
    if (selectedImages.length > 10) {
      alert('You can upload a maximum of 10 photos in a single session.');
      return;
    }

    // Initialize upload queue items
    const newQueueItems: UploadQueueItem[] = selectedImages.map((file) => ({
      id: Math.random().toString(36).substring(7),
      fileName: file.name,
      progress: 0,
      status: 'compressing',
    }));

    setUploadQueue((prev) => [...prev, ...newQueueItems]);

    // Process and upload each file in parallel (but update individual state)
    for (let i = 0; i < selectedImages.length; i++) {
      const file = selectedImages[i];
      const queueItem = newQueueItems[i];

      uploadSingleFile(file, queueItem.id);
    }
  };

  const uploadSingleFile = async (file: File, queueId: string) => {
    // 1. Enforce size limit before compression (10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      updateQueueItem(queueId, {
        status: 'error',
        errorMsg: 'Exceeds 10MB limit',
      });
      return;
    }

    try {
      // 2. Client-side Image Compression (max width 1920px)
      updateQueueItem(queueId, { status: 'compressing', progress: 20 });
      const compressedBlob = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.85,
      });

      // 3. Client-side Thumbnail Generation (200x200px square)
      updateQueueItem(queueId, { progress: 40 });
      const thumbnailBlob = await generateSquareThumbnail(file, 200, 0.8);

      // 4. File Upload via XMLHttpRequest to track progress
      updateQueueItem(queueId, { status: 'uploading', progress: 50 });

      const formData = new FormData();
      formData.append('file', compressedBlob, file.name);
      formData.append('thumbnail', thumbnailBlob, `thumb_${file.name}`);
      formData.append('parentId', parentId);
      formData.append('parentType', parentType);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `/api/projects/${projectId}/photos`, true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round(50 + (event.loaded / event.total) * 45);
          updateQueueItem(queueId, { progress: percentComplete });
        }
      };

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            if (result.ok && result.photo) {
              setPhotos((prev) => [result.photo, ...prev]);
              updateQueueItem(queueId, { status: 'success', progress: 100 });
              // Remove success alert from queue after 3 seconds
              setTimeout(() => {
                setUploadQueue((prev) => prev.filter((item) => item.id !== queueId));
              }, 3000);
            } else {
              throw new Error(result.error || 'Server rejected file');
            }
          } catch (err: any) {
            updateQueueItem(queueId, {
              status: 'error',
              errorMsg: err.message || 'Upload failed',
            });
          }
        } else {
          updateQueueItem(queueId, {
            status: 'error',
            errorMsg: `HTTP ${xhr.status} Error`,
          });
        }
      };

      xhr.onerror = () => {
        updateQueueItem(queueId, { status: 'error', errorMsg: 'Network error' });
      };

      xhr.send(formData);
    } catch (err: any) {
      console.error(err);
      updateQueueItem(queueId, {
        status: 'error',
        errorMsg: err.message || 'Processing failed',
      });
    }
  };

  const updateQueueItem = (id: string, updates: Partial<UploadQueueItem>) => {
    setUploadQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleArchivePhoto = async (photoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to archive this photo? It will be sent to the admin archive.')) {
      return;
    }

    try {
      const res = await fetch(`/api/photos/${photoId}`, { method: 'DELETE' });
      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to archive photo.');
      }
    } catch {
      alert('Could not archive photo. Try again.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      {/* Upload Interface */}
      {canEdit && (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={cn(
            'flex flex-col items-center justify-center border-2 border-dashed border-border/80 rounded-xl p-5 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/10 transition-all select-none',
            dragActive && 'border-primary bg-primary/5'
          )}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".png,.jpg,.jpeg,.webp,.heic"
            className="hidden"
            onChange={handleFileInput}
          />
          <div className="p-3 bg-muted/50 rounded-full mb-3 text-muted-foreground group-hover:text-primary transition-colors">
            <Upload className="h-6 w-6" />
          </div>
          <p className="text-xs font-semibold text-foreground">
            Drag &amp; drop photos here, or{' '}
            <span className="text-primary font-bold">Browse</span>
          </p>
          <p className="text-[10px] text-muted-foreground/80 mt-1">
            Supports PNG, JPG, WEBP, HEIC (Max 10MB per file, up to 10 files)
          </p>
        </div>
      )}

      {/* Upload Queue Progress */}
      {uploadQueue.length > 0 && (
        <div className="space-y-2 border border-border/60 rounded-xl p-3 bg-muted/5">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Uploading ({uploadQueue.length} files)
          </p>
          <div className="space-y-2">
            {uploadQueue.map((item) => (
              <div key={item.id} className="text-xs space-y-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="truncate max-w-[200px] font-medium">{item.fileName}</span>
                  <span className="flex items-center gap-1.5">
                    {item.status === 'compressing' && (
                      <span className="text-[10px] text-amber-500 font-semibold animate-pulse">
                        Compressing...
                      </span>
                    )}
                    {item.status === 'uploading' && (
                      <span className="text-[10px] text-primary font-semibold">
                        Uploading...
                      </span>
                    )}
                    {item.status === 'success' && (
                      <span className="text-[10px] text-emerald-500 font-bold">Done</span>
                    )}
                    {item.status === 'error' && (
                      <span className="text-[10px] text-rose-500 font-bold">
                        {item.errorMsg || 'Failed'}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadQueue((prev) => prev.filter((i) => i.id !== item.id));
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                </div>
                {item.status !== 'error' && item.status !== 'success' && (
                  <Progress value={item.progress} className="h-1" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid of uploaded photos */}
      {loading ? (
        <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Loading attachments...
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 border border-border/40 border-dashed rounded-xl text-muted-foreground">
          <ImageIcon className="h-6 w-6 opacity-30 mb-1.5" />
          <span className="text-[11px] font-medium">No photo attachments yet.</span>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
          {photos.map((photo) => (
            <div
              key={photo.id}
              onClick={() => setLightboxPhoto(photo)}
              className="group/photo relative aspect-square border border-border/80 rounded-lg overflow-hidden bg-muted cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all"
            >
              {/* Thumbnail image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.thumbnailPath}
                alt={photo.originalName}
                className="w-full h-full object-cover transition-transform group-hover/photo:scale-105"
              />

              {/* Uploader and Action overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                <Button
                  variant="secondary"
                  size="icon-sm"
                  className="h-7 w-7 bg-white/90 text-foreground hover:bg-white"
                  title="View full photo"
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                {canEdit && (
                  <Button
                    variant="destructive"
                    size="icon-sm"
                    className="h-7 w-7"
                    title="Archive photo"
                    onClick={(e) => handleArchivePhoto(photo.id, e)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-fade-in"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setLightboxPhoto(null)}
              className="absolute top-3 right-3 z-10 p-1.5 bg-black/60 text-white/80 hover:text-white rounded-full hover:bg-black/80 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Image viewer */}
            <div className="flex-1 flex items-center justify-center p-4 bg-slate-950 min-h-[300px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxPhoto.storagePath}
                alt={lightboxPhoto.originalName}
                className="max-w-full max-h-[60vh] md:max-h-[80vh] object-contain rounded-lg"
              />
            </div>

            {/* Sidebar Metadata */}
            <div className="w-full md:w-80 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 p-5 flex flex-col justify-between text-slate-200">
              <div className="space-y-4">
                <div>
                  <span className="text-[9px] font-bold text-primary uppercase tracking-wider">
                    Parent {parentType}
                  </span>
                  <h4 className="text-sm font-semibold text-white mt-0.5 leading-snug">
                    {lightboxPhoto.parentTitle}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-1">ID: {lightboxPhoto.parentId}</p>
                </div>

                <hr className="border-slate-800" />

                <div className="space-y-2.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-[10px] text-slate-500 font-medium">Uploaded Date</p>
                      <p className="font-medium">{formatDate(lightboxPhoto.createdAt)}</p>
                    </div>
                  </div>

                  {lightboxPhoto.takenAt && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-emerald-500" />
                      <div>
                        <p className="text-[10px] text-emerald-600 font-semibold">Captured Date (EXIF)</p>
                        <p className="font-medium">{formatDate(lightboxPhoto.takenAt)}</p>
                      </div>
                    </div>
                  )}

                  {lightboxPhoto.latitude !== null && lightboxPhoto.longitude !== null && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-amber-500 mt-0.5" />
                      <div>
                        <p className="text-[10px] text-amber-600 font-semibold">GPS Coordinates (EXIF)</p>
                        <p className="font-mono text-[11px] leading-tight">
                          {lightboxPhoto.latitude.toFixed(6)}, {lightboxPhoto.longitude.toFixed(6)}
                        </p>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${lightboxPhoto.latitude},${lightboxPhoto.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-primary hover:underline font-bold mt-0.5 inline-block"
                        >
                          View on Google Maps
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4 mt-4 flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-300">
                  {lightboxPhoto.uploader.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {lightboxPhoto.uploader.name}
                  </p>
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider">
                    {lightboxPhoto.uploader.role}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
