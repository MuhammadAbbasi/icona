'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, ArrowRight, Layers3, CheckSquare, ArrowUpDown, ChevronDown, Check, Trash2, RotateCcw, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, STATUS_CONFIG, PRIORITY_CONFIG } from '@/lib/utils';
import type { ProjectStatus, Priority } from '@/types';

interface ProjectSummary {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  priority: string;
  progress: number;
  budget?: number | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  createdAt: string | Date;
  company: { id: string; name: string };
  ownerCompany?: { id: string; name: string } | null;
  domains: Array<{ id: string; name: string; tasks: Array<{ id: string; status: string }> }>;
}

type SortKey =
  | 'due-asc'
  | 'due-desc'
  | 'name-asc'
  | 'created-desc'
  | 'created-asc'
  | 'cost-desc'
  | 'cost-asc';

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: 'due-asc', label: 'Earliest due date' },
  { key: 'due-desc', label: 'Farthest due date' },
  { key: 'name-asc', label: 'Name (A to Z)' },
  { key: 'created-desc', label: 'Date added (newest)' },
  { key: 'created-asc', label: 'Date added (oldest)' },
  { key: 'cost-desc', label: 'Project cost (highest)' },
  { key: 'cost-asc', label: 'Project cost (lowest)' },
];

const DEFAULT_SORT: SortKey = 'due-asc';

// Timestamp from a serialized Date/ISO string, or null when unset.
const ts = (d?: string | Date | null): number | null => {
  if (!d) return null;
  const t = new Date(d).getTime();
  return Number.isNaN(t) ? null : t;
};

// Compare two optional values, always pushing "unset" (null) entries to the end
// regardless of direction so projects missing a due date or budget don't crowd
// the top of the list.
function cmpNullable(a: number | null, b: number | null, dir: 'asc' | 'desc'): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return dir === 'asc' ? a - b : b - a;
}

function sortProjects(list: ProjectSummary[], key: SortKey): ProjectSummary[] {
  const arr = [...list];
  switch (key) {
    case 'name-asc':
      return arr.sort((a, b) => a.name.localeCompare(b.name));
    case 'created-desc':
      return arr.sort((a, b) => cmpNullable(ts(a.createdAt), ts(b.createdAt), 'desc'));
    case 'created-asc':
      return arr.sort((a, b) => cmpNullable(ts(a.createdAt), ts(b.createdAt), 'asc'));
    case 'cost-desc':
      return arr.sort((a, b) => cmpNullable(a.budget ?? null, b.budget ?? null, 'desc'));
    case 'cost-asc':
      return arr.sort((a, b) => cmpNullable(a.budget ?? null, b.budget ?? null, 'asc'));
    case 'due-desc':
      return arr.sort((a, b) => cmpNullable(ts(a.endDate), ts(b.endDate), 'desc'));
    case 'due-asc':
    default:
      return arr.sort((a, b) => cmpNullable(ts(a.endDate), ts(b.endDate), 'asc'));
  }
}

interface ProjectsGridProps {
  projects: ProjectSummary[];
  deletedProjects?: ProjectSummary[];
  isAdmin?: boolean;
}

export function ProjectsGrid({ projects, deletedProjects = [], isAdmin = false }: ProjectsGridProps) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>(DEFAULT_SORT);
  const [activeTab, setActiveTab] = useState<'active' | 'trash'>('active');
  const [isRestoring, setIsRestoring] = useState<Record<string, boolean>>({});

  // Permanent delete states
  const [projectToDelete, setProjectToDelete] = useState<ProjectSummary | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [isPermanentlyDeleting, setIsPermanentlyDeleting] = useState(false);

  const listToRender = activeTab === 'active' ? projects : deletedProjects;

  const groups = useMemo(() => {
    const map = new Map<string, ProjectSummary[]>();
    for (const p of listToRender) {
      const companyName = p.ownerCompany?.name || 'Unassigned / Other';
      const list = map.get(companyName) ?? [];
      list.push(p);
      map.set(companyName, list);
    }
    return map;
  }, [listToRender]);

  const sortedCompanyNames = useMemo(() => {
    return Array.from(groups.keys()).sort((a, b) => {
      if (a === 'Unassigned / Other') return 1;
      if (b === 'Unassigned / Other') return -1;
      return a.localeCompare(b);
    });
  }, [groups]);

  async function handleRestore(projectId: string) {
    setIsRestoring((prev) => ({ ...prev, [projectId]: true }));
    try {
      const res = await fetch(`/api/projects/${projectId}/restore`, {
        method: 'POST',
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to restore project.');
    } finally {
      setIsRestoring((prev) => ({ ...prev, [projectId]: false }));
    }
  }

  async function handlePermanentDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!projectToDelete) return;
    if (!confirmPassword) {
      setConfirmError('Password is required.');
      return;
    }
    setIsPermanentlyDeleting(true);
    setConfirmError('');

    try {
      const res = await fetch(`/api/projects/${projectToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: confirmPassword, permanent: true }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to permanently delete project.');
      }

      setProjectToDelete(null);
      setConfirmPassword('');
      router.refresh();
    } catch (err: any) {
      setConfirmError(err.message || 'Incorrect password or failed to delete.');
    } finally {
      setIsPermanentlyDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Tab controls for Admin */}
      {isAdmin && (
        <div className="flex p-1 bg-muted/60 rounded-lg max-w-xs mb-6 border border-border/40">
          <button
            onClick={() => setActiveTab('active')}
            className={cn(
              'flex-1 py-1.5 text-xs font-semibold rounded-md transition-all',
              activeTab === 'active'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Active Projects ({projects.length})
          </button>
          <button
            onClick={() => setActiveTab('trash')}
            className={cn(
              'flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5',
              activeTab === 'trash'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Trash ({deletedProjects.length})</span>
          </button>
        </div>
      )}

      {/* Empty States */}
      {listToRender.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center border border-dashed rounded-xl bg-muted/10 p-6">
          {activeTab === 'active' ? (
            <>
              <Layers3 className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium text-foreground/60">No projects yet</p>
              <p className="text-sm text-muted-foreground mt-1">Create your first project to get started.</p>
            </>
          ) : (
            <>
              <Trash2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium text-foreground/60">Trash is empty</p>
              <p className="text-sm text-muted-foreground mt-1">Deleted projects will appear here.</p>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-muted-foreground">
              Sorted by {(SORT_OPTIONS.find((o) => o.key === sortKey)?.label ?? '').toLowerCase()}
            </p>
            <SortDropdown value={sortKey} onChange={setSortKey} />
          </div>

          <div className="space-y-10">
            {sortedCompanyNames.map((companyName) => {
              const list = sortProjects(groups.get(companyName) || [], sortKey);

              return (
                <div key={companyName} className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-border/80 pb-2">
                    <h3 className="font-bold text-sm text-foreground flex items-center gap-2 tracking-wide uppercase">
                      <span>{companyName}</span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full normal-case tracking-normal bg-secondary text-secondary-foreground border">
                        {list.length}
                      </span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {list.map((project) => {
                      const priorityCfg = PRIORITY_CONFIG[project.priority as Priority];
                      const statusCfg = STATUS_CONFIG[project.status as ProjectStatus] || { label: project.status, color: 'bg-slate-100 text-slate-700' };
                      const allTasks = project.domains.flatMap((d) => d.tasks);
                      const doneTasks = allTasks.filter((t) => t.status === 'DONE').length;

                      const CardWrapper = ({ children }: { children: React.ReactNode }) => {
                        if (activeTab === 'trash') {
                          return <div className="h-full">{children}</div>;
                        }
                        return (
                          <Link key={project.id} href={`/projects/${project.id}`}>
                            {children}
                          </Link>
                        );
                      };

                      return (
                        <CardWrapper key={project.id}>
                          <Card className={cn(
                            "group h-full transition-all duration-200",
                            activeTab === 'trash'
                              ? "opacity-85 border-dashed bg-card/65 cursor-default"
                              : "cursor-pointer hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5"
                          )}>
                            <CardContent className="p-5 flex flex-col h-full">
                              {/* Header */}
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <div className="h-10 w-10 rounded-xl bg-primary/8 border border-primary/15 flex items-center justify-center flex-shrink-0">
                                  <Building2 className="h-5 w-5 text-primary/60" />
                                </div>
                                <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-md', statusCfg.color)}>
                                  {statusCfg.label}
                                </span>
                              </div>

                              {/* Title & company */}
                              <div className="flex-1 space-y-2 mb-4">
                                <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
                                  {project.name}
                                </h3>
                                <div className="space-y-1">
                                  {project.ownerCompany?.name && (
                                    <p className="text-xs text-foreground/80 font-medium flex items-center gap-1.5">
                                      <Building2 className="h-3 w-3 text-primary/70 flex-shrink-0" />
                                      <span className="truncate">{project.ownerCompany.name}</span>
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    {project.ownerCompany?.name ? (
                                      <>
                                        <span className="w-3 text-center text-[10px] text-muted-foreground/40 font-bold">•</span>
                                        <span className="truncate">Client: {project.company.name}</span>
                                      </>
                                    ) : (
                                      <>
                                        <Building2 className="h-3 w-3 flex-shrink-0" />
                                        <span className="truncate">{project.company.name}</span>
                                      </>
                                    )}
                                  </p>
                                </div>
                                {project.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
                                    {project.description}
                                  </p>
                                )}
                              </div>

                              {/* Stats row */}
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                                <span className="flex items-center gap-1">
                                  <Layers3 className="h-3.5 w-3.5" />
                                  {project.domains.length} domains
                                </span>
                                <span className="flex items-center gap-1">
                                  <CheckSquare className="h-3.5 w-3.5" />
                                  {doneTasks}/{allTasks.length} tasks
                                </span>
                                <span className={cn('flex items-center gap-1 ml-auto font-medium', priorityCfg?.color)}>
                                  <span className={cn('h-1.5 w-1.5 rounded-full', priorityCfg?.dot)} />
                                  {priorityCfg?.label}
                                </span>
                              </div>

                              {/* Progress */}
                              <div className="space-y-1.5">
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">Progress</span>
                                  <span className="font-semibold text-foreground">{project.progress}%</span>
                                </div>
                                <Progress value={project.progress} className="h-1.5" />
                              </div>

                              {/* Footer arrow / Actions */}
                              {activeTab === 'trash' ? (
                                <div className="flex gap-2.5 mt-4 pt-3 border-t border-border/50">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={isRestoring[project.id]}
                                    onClick={() => handleRestore(project.id)}
                                    className="flex-1 text-xs gap-1.5 h-8 border-border hover:bg-muted/80 text-foreground/80 rounded-lg transition-all"
                                  >
                                    {isRestoring[project.id] ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                                    )}
                                    <span>Restore</span>
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setProjectToDelete(project)}
                                    className="flex-1 text-xs gap-1.5 h-8 border-destructive/20 hover:bg-destructive/10 text-destructive hover:text-destructive rounded-lg transition-all font-semibold"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span>Delete Permanently</span>
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex justify-end mt-3 pt-3 border-t border-border/50">
                                  <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                                    View project <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                                  </span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </CardWrapper>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Permanent Delete Modal */}
      {projectToDelete && (
        <Dialog open={!!projectToDelete} onOpenChange={(open) => {
          if (!open) {
            setProjectToDelete(null);
            setConfirmPassword('');
            setConfirmError('');
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2 font-bold">
                Permanently Delete Project
              </DialogTitle>
              <DialogDescription>
                This action is irreversible. This will permanently delete <strong>{projectToDelete.name}</strong>, all its domains, tasks, subtasks, revisions, and transaction logs.
                Please enter your administrator password to confirm.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handlePermanentDelete} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="perm-delete-pwd">Admin Password</Label>
                <Input
                  id="perm-delete-pwd"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setConfirmError('');
                  }}
                  placeholder="Enter password"
                  required
                />
              </div>
              {confirmError && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  {confirmError}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setProjectToDelete(null);
                    setConfirmPassword('');
                    setConfirmError('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={isPermanentlyDeleting}
                  className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold"
                >
                  {isPermanentlyDeleting ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deleting…
                    </span>
                  ) : (
                    'Delete Permanently'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function SortDropdown({ value, onChange }: { value: SortKey; onChange: (key: SortKey) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeLabel = SORT_OPTIONS.find((o) => o.key === value)?.label ?? 'Sort';

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 px-3 gap-2 text-xs font-semibold border-border hover:bg-muted/80 rounded-lg text-foreground/80 transition-all"
        title="Sort projects"
      >
        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
        <span>{activeLabel}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl z-50 p-2 animate-in fade-in-50 slide-in-from-top-2 duration-150">
          <div className="px-2.5 py-1.5 border-b border-border/60 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Sort projects by</span>
          </div>

          <div className="space-y-0.5">
            {SORT_OPTIONS.map((opt) => {
              const isActive = opt.key === value;
              return (
                <button
                  key={opt.key}
                  onClick={() => { onChange(opt.key); setIsOpen(false); }}
                  className={cn(
                    'flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-left transition-colors text-xs font-medium',
                    isActive ? 'bg-muted/60 text-foreground' : 'text-foreground/80 hover:bg-muted/60'
                  )}
                >
                  <Check className={cn('h-3 w-3 stroke-[3] flex-shrink-0', isActive ? 'text-primary' : 'text-transparent')} />
                  <span className="truncate">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
