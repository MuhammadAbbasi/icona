'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, ImageIcon, Filter, RefreshCw, Calendar, MapPin, 
  User, Trash2, RotateCcw, AlertTriangle, Eye, ExternalLink, ShieldAlert, Loader2, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface PhotoItem {
  id: string;
  originalName: string;
  storagePath: string;
  thumbnailPath: string;
  parentType: 'TASK' | 'SUBTASK';
  parentId: string;
  parentTitle: string;
  archived: boolean;
  latitude: number | null;
  longitude: number | null;
  takenAt: string | null;
  createdAt: string;
  uploader: {
    id: string;
    name: string;
    role: string;
  };
  project?: {
    name: string;
  };
  task?: {
    title: string;
    domain?: {
      id: string;
      name: string;
      color: string;
    };
  } | null;
  subtask?: {
    title: string;
    task?: {
      title: string;
      domain?: {
        id: string;
        name: string;
        color: string;
      };
    };
  } | null;
}

interface FilterOption {
  id: string;
  title: string;
}

interface ProjectGalleryViewProps {
  projectId: string;
  projectName: string;
  tasks: FilterOption[];
  subtasks: FilterOption[];
  uploaders: { id: string; name: string }[];
  currentUserRole: string;
}

export function ProjectGalleryView({
  projectId,
  projectName,
  tasks,
  subtasks,
  uploaders,
  currentUserRole,
}: ProjectGalleryViewProps) {
  const router = useRouter();
  
  // Tabs: 'active' | 'archive'
  const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState<string | null>(null);

  // Filters state
  const [selectedTask, setSelectedTask] = useState<string>('all');
  const [selectedSubtask, setSelectedSubtask] = useState<string>('all');
  const [selectedUploader, setSelectedUploader] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest'); // newest | oldest | taken

  // Lightbox
  const [lightboxPhoto, setLightboxPhoto] = useState<PhotoItem | null>(null);

  const canSeeArchive = ['ADMIN', 'MANAGER'].includes(currentUserRole);

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      let url = `/api/projects/${projectId}/photos?archived=${activeTab === 'archive'}`;
      
      if (selectedTask !== 'all') url += `&taskId=${selectedTask}`;
      if (selectedSubtask !== 'all') url += `&subtaskId=${selectedSubtask}`;
      if (selectedUploader !== 'all') url += `&uploaderId=${selectedUploader}`;
      url += `&sort=${sortBy}`;

      const res = await fetch(url);
      if (res.ok) {
        setPhotos(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch gallery photos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedTask, selectedSubtask, selectedUploader, sortBy]);

  // Handle Photo Archive Action (Soft delete)
  const handleArchive = async (photoId: string) => {
    if (!confirm('Are you sure you want to archive this photo? It will be sent to the admin archive.')) return;
    setActionPending(photoId);
    try {
      const res = await fetch(`/api/photos/${photoId}`, { method: 'DELETE' });
      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      } else {
        alert('Failed to archive photo.');
      }
    } catch {
      alert('Network error. Failed to archive photo.');
    } finally {
      setActionPending(null);
    }
  };

  // Handle Admin Retention actions (Restore / Delete Permanent)
  const handleAdminAction = async (photoId: string, action: 'restore' | 'delete_permanent') => {
    const confirmationMsg =
      action === 'restore'
        ? 'Restore this photo to the active project gallery?'
        : 'WARNING: Permanently delete this photo from cloud storage and the database? This cannot be undone.';
    if (!confirm(confirmationMsg)) return;

    setActionPending(photoId);
    try {
      const res = await fetch(`/api/photos/${photoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        if (lightboxPhoto && lightboxPhoto.id === photoId) {
          setLightboxPhoto(null);
        }
      } else {
        alert('Failed to execute admin action.');
      }
    } catch {
      alert('Network error. Action failed.');
    } finally {
      setActionPending(null);
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
    <div className="flex flex-col min-h-full space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/projects/${projectId}`}>
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg border-border bg-card">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Project Photo Gallery
          </span>
          <h2 className="text-xl font-bold text-foreground leading-tight">{projectName}</h2>
        </div>
      </div>

      {/* Tabs */}
      {canSeeArchive && (
        <div className="flex border-b border-border/80">
          <button
            onClick={() => setActiveTab('active')}
            className={cn(
              'px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all',
              activeTab === 'active'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            Active Photos
          </button>
          <button
            onClick={() => setActiveTab('archive')}
            className={cn(
              'px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5',
              activeTab === 'archive'
                ? 'border-red-500 text-red-500'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Archive (Admin Only)
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-card border rounded-xl p-4">
        {/* Task Filter */}
        <div className="space-y-1">
          <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Filter by Task
          </Label>
          <Select value={selectedTask} onValueChange={setSelectedTask}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              {tasks.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Subtask Filter */}
        <div className="space-y-1">
          <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Filter by Subtask
          </Label>
          <Select value={selectedSubtask} onValueChange={setSelectedSubtask}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subtasks</SelectItem>
              {subtasks.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Uploader Filter */}
        <div className="space-y-1">
          <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Uploaded By
          </Label>
          <Select value={selectedUploader} onValueChange={setSelectedUploader}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {uploaders.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sort order */}
        <div className="space-y-1">
          <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Sort Order
          </Label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Upload Date (Newest)</SelectItem>
              <SelectItem value="oldest">Upload Date (Oldest)</SelectItem>
              <SelectItem value="taken">Capture Date (Newest)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reset button */}
        <div className="flex items-end">
          <Button
            variant="outline"
            className="w-full h-9 gap-1.5 text-xs font-semibold border-border hover:bg-muted"
            onClick={() => {
              setSelectedTask('all');
              setSelectedSubtask('all');
              setSelectedUploader('all');
              setSortBy('newest');
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reset Filters
          </Button>
        </div>
      </div>

      {/* Main Grid View */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          Loading gallery photos...
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card border border-dashed rounded-xl text-muted-foreground text-center">
          <ImageIcon className="h-10 w-10 opacity-30 mb-3" />
          <h3 className="font-semibold text-sm text-foreground">No photos found</h3>
          <p className="text-xs text-muted-foreground/80 mt-1 max-w-xs">
            {activeTab === 'archive'
              ? 'There are no archived photos in this project.'
              : 'Try adjusting your filters or upload some photo attachments directly in tasks/subtasks details.'}
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {Object.values(
            photos.reduce((acc, photo) => {
              const domain = photo.parentType === 'TASK' ? photo.task?.domain : photo.subtask?.task?.domain;
              const domainId = domain?.id || 'unassigned';
              const domainName = domain?.name || 'General / Unassigned';
              const domainColor = domain?.color || '#94a3b8';

              if (!acc[domainId]) {
                acc[domainId] = {
                  id: domainId,
                  name: domainName,
                  color: domainColor,
                  photos: [],
                };
              }
              acc[domainId].photos.push(photo);
              return acc;
            }, {} as Record<string, { id: string; name: string; color: string; photos: PhotoItem[] }>)
          ).map((group) => (
            <div key={group.id} className="space-y-4">
              <div className="flex items-center gap-2.5 border-b pb-2">
                <span
                  className="h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: group.color }}
                />
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  {group.name}
                </h3>
                <span className="text-xs text-muted-foreground font-semibold">
                  ({group.photos.length})
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {group.photos.map((photo) => (
                  <div
                    key={photo.id}
                    onClick={() => setLightboxPhoto(photo)}
                    className="group/card relative bg-card border rounded-xl overflow-hidden cursor-pointer hover:border-primary/50 hover:shadow-md transition-all flex flex-col"
                  >
                    {/* Photo Area */}
                    <div className="relative aspect-square bg-muted overflow-hidden border-b">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.thumbnailPath}
                        alt={photo.originalName}
                        className="w-full h-full object-cover transition-transform group-hover/card:scale-105"
                      />

                      {/* Badge Overlay */}
                      {photo.takenAt && (
                        <span className="absolute top-2 left-2 bg-emerald-500 text-white font-bold text-[9px] px-1.5 py-0.5 rounded shadow">
                          Capture Metadata
                        </span>
                      )}
                      {photo.latitude !== null && (
                        <span className="absolute top-2 right-2 bg-amber-500 text-white font-bold text-[9px] px-1.5 py-0.5 rounded shadow flex items-center gap-0.5">
                          <MapPin className="h-2.5 w-2.5" /> GPS
                        </span>
                      )}
                    </div>

                    {/* Text metadata footer */}
                    <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] font-bold text-primary uppercase tracking-wider block">
                          {photo.parentType === 'SUBTASK' ? 'Subtask Attachment' : 'Task Attachment'}
                        </span>

                        {/* Task Name (for both tasks and subtasks) */}
                        <div className="mt-1.5">
                          <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-tight">Task</p>
                          <h5 className="text-xs font-bold text-foreground truncate mt-0.5" title={photo.parentType === 'TASK' ? photo.parentTitle : photo.subtask?.task?.title || 'N/A'}>
                            {photo.parentType === 'TASK' ? photo.parentTitle : photo.subtask?.task?.title || 'N/A'}
                          </h5>
                        </div>

                        {/* Subtask Name (only for subtasks) */}
                        {photo.parentType === 'SUBTASK' && (
                          <div className="mt-1.5">
                            <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-tight">Subtask</p>
                            <h6 className="text-xs font-medium text-foreground truncate mt-0.5" title={photo.parentTitle}>
                              {photo.parentTitle}
                            </h6>
                          </div>
                        )}

                        {/* Project Name (instead of Project ID) */}
                        <div className="mt-1.5">
                          <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-tight">Project</p>
                          <p className="text-xs font-medium text-foreground/80 truncate mt-0.5" title={photo.project?.name || projectName}>
                            {photo.project?.name || projectName}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t pt-2 mt-2">
                        <span className="truncate max-w-[90px] font-medium" title={photo.uploader.name}>
                          {photo.uploader.name}
                        </span>
                        <span>{formatDate(photo.createdAt)}</span>
                      </div>
                    </div>

                    {/* Action buttons overlay for quick actions */}
                    <div className="absolute top-2 left-2 inset-x-2 flex justify-end gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                      {activeTab === 'active' ? (
                        <Button
                          variant="destructive"
                          size="icon-sm"
                          className="h-7 w-7 shadow-lg"
                          title="Archive photo"
                          disabled={actionPending === photo.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchive(photo.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="secondary"
                            size="icon-sm"
                            className="h-7 w-7 shadow-lg bg-emerald-500 text-white hover:bg-emerald-600"
                            title="Restore photo"
                            disabled={actionPending === photo.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAdminAction(photo.id, 'restore');
                            }}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon-sm"
                            className="h-7 w-7 shadow-lg"
                            title="Delete permanently"
                            disabled={actionPending === photo.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAdminAction(photo.id, 'delete_permanent');
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
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
                  <span className="text-[9px] font-bold text-primary uppercase tracking-wider block">
                    {lightboxPhoto.parentType === 'SUBTASK' ? 'Subtask Attachment' : 'Task Attachment'}
                  </span>

                  {/* Task Name */}
                  <div className="mt-2.5">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-tight">Task</p>
                    <h4 className="text-sm font-semibold text-white mt-0.5 leading-snug" title={lightboxPhoto.parentType === 'TASK' ? lightboxPhoto.parentTitle : lightboxPhoto.subtask?.task?.title || 'N/A'}>
                      {lightboxPhoto.parentType === 'TASK' ? lightboxPhoto.parentTitle : lightboxPhoto.subtask?.task?.title || 'N/A'}
                    </h4>
                  </div>

                  {/* Subtask Name */}
                  {lightboxPhoto.parentType === 'SUBTASK' && (
                    <div className="mt-2.5">
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-tight">Subtask</p>
                      <h5 className="text-sm font-medium text-white mt-0.5 leading-snug" title={lightboxPhoto.parentTitle}>
                        {lightboxPhoto.parentTitle}
                      </h5>
                    </div>
                  )}

                  {/* Project Name */}
                  <div className="mt-2.5">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-tight">Project</p>
                    <p className="text-sm font-medium text-slate-300 mt-0.5 leading-snug" title={lightboxPhoto.project?.name || projectName}>
                      {lightboxPhoto.project?.name || projectName}
                    </p>
                  </div>
                  
                  {/* Direct link to task/subtask */}
                  <Link href={`/projects/${projectId}`}>
                    <Button
                      variant="subtle"
                      size="sm"
                      className="mt-4 w-full h-8 text-[11px] gap-1 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold border border-slate-700"
                    >
                      <ExternalLink className="h-3 w-3" /> Go to Parent Entity
                    </Button>
                  </Link>
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

              {/* Archive Actions in Lightbox */}
              {activeTab === 'archive' && canSeeArchive && (
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg space-y-2">
                  <p className="text-[10px] font-bold text-red-500 flex items-center gap-1 uppercase tracking-wider">
                    <AlertTriangle className="h-3.5 w-3.5" /> Admin Decisions
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20 h-7"
                      onClick={() => handleAdminAction(lightboxPhoto.id, 'restore')}
                      disabled={actionPending === lightboxPhoto.id}
                    >
                      Retain
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1 text-[10px] font-bold h-7"
                      onClick={() => handleAdminAction(lightboxPhoto.id, 'delete_permanent')}
                      disabled={actionPending === lightboxPhoto.id}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              )}

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
