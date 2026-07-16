'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Pencil, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  startDate: string | Date | null;
  endDate: string | Date | null;
  budget: number | null;
  coveredArea?: number | null;
  rebate?: number | null;
  sstRate?: number | null;
}

interface EditProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectData;
  isAdmin?: boolean;
}

export function EditProjectModal({ open, onOpenChange, project, isAdmin }: EditProjectModalProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const isUserAdmin = isAdmin || session?.user?.role === 'ADMIN';

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('UNDER_REVIEW');
  const [priority, setPriority] = useState('MEDIUM');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [coveredArea, setCoveredArea] = useState('');
  const [rebate, setRebate] = useState('');
  const [sstRate, setSstRate] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync state with project prop when modal opens
  useEffect(() => {
    if (open && project) {
      setName(project.name || '');
      setDescription(project.description || '');
      setStatus(project.status || 'UNDER_REVIEW');
      setPriority(project.priority || 'MEDIUM');
      setStartDate(project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '');
      setEndDate(project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '');
      setBudget(project.budget != null ? String(project.budget) : '');
      setCoveredArea(project.coveredArea != null ? String(project.coveredArea) : '');
      setRebate(project.rebate != null ? String(project.rebate) : '');
      setSstRate(project.sstRate != null ? String(project.sstRate) : '');
      setError('');
    }
  }, [open, project]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          status,
          priority,
          startDate: startDate || null,
          endDate: endDate || null,
          budget: budget ? parseFloat(budget) : null,
          coveredArea: coveredArea ? parseFloat(coveredArea) : null,
          rebate: rebate ? parseFloat(rebate) : null,
          sstRate: sstRate ? parseFloat(sstRate) : null,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      onOpenChange(false);
      router.refresh();
    } catch (e: any) {
      setError(e.message || 'Failed to update project. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteProject(e: React.FormEvent) {
    e.preventDefault();
    if (!deletePassword) {
      setDeleteError('Password is required.');
      return;
    }
    setIsDeleting(true);
    setDeleteError('');

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete project.');
      }

      setShowDeleteConfirm(false);
      onOpenChange(false);
      router.push('/projects');
      router.refresh();
    } catch (err: any) {
      setDeleteError(err.message || 'Incorrect password or failed to delete.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto pr-3">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Edit Project details
          </DialogTitle>
          <DialogDescription>
            Update project metadata, dates, or budgeting parameters.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-proj-name">Project Name *</Label>
            <Input
              id="edit-proj-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. DHA Residential Complex"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-proj-desc">Description</Label>
            <Textarea
              id="edit-proj-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief overview of project scope…"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    ['UNDER_REVIEW', 'Under Review'],
                    ['CONTRACT_FILLED', 'Contract Filled'],
                    ['ONGOING', 'Ongoing'],
                    ['UNDER_CUSTOMER_REVIEW', 'Under Customer Review'],
                    ['COMPLETED', 'Completed'],
                  ].map(([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-start">Start Date</Label>
              <Input
                id="edit-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="block"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-end">End Date (Deadline)</Label>
              <Input
                id="edit-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="block"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-budget">Expected Budget (PKR)</Label>
            <Input
              id="edit-budget"
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g. 45000000"
            />
          </div>

          {/* Project-overview inputs — drive the summary's per-sq-ft and tax rows. */}
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Overview & Summary</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-area">Covered Area (sq ft)</Label>
                <Input
                  id="edit-area"
                  type="number"
                  value={coveredArea}
                  onChange={(e) => setCoveredArea(e.target.value)}
                  placeholder="e.g. 3130"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-rebate">Rebate (PKR)</Label>
                <Input
                  id="edit-rebate"
                  type="number"
                  value={rebate}
                  onChange={(e) => setRebate(e.target.value)}
                  placeholder="e.g. 0"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-sst">SST (%)</Label>
                <Input
                  id="edit-sst"
                  type="number"
                  value={sstRate}
                  onChange={(e) => setSstRate(e.target.value)}
                  placeholder="15"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2 items-center justify-between">
            {isUserAdmin && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold px-4"
              >
                Delete Project
              </Button>
            )}
            <div className="flex gap-3 flex-1 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className={isUserAdmin ? 'w-24' : 'flex-1'}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className={isUserAdmin ? 'w-36' : 'flex-1'}
              >
                {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>

      {showDeleteConfirm && (
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2 font-bold">
                Confirm Project Deletion
              </DialogTitle>
              <DialogDescription>
                This action will soft-delete the project and move it to the Trash tab. 
                Please enter your administrator password to confirm.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleDeleteProject} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="delete-pwd">Admin Password</Label>
                <Input
                  id="delete-pwd"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => {
                    setDeletePassword(e.target.value);
                    setDeleteError('');
                  }}
                  placeholder="Enter password"
                  required
                />
              </div>
              {deleteError && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  {deleteError}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletePassword('');
                    setDeleteError('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={isDeleting}
                  className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold"
                >
                  {isDeleting ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deleting…
                    </span>
                  ) : (
                    'Confirm Delete'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
