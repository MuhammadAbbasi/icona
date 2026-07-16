'use client';

import { useEffect, useState } from 'react';
import { Loader2, ClipboardList, Image as ImageIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PhotoAttachmentSection } from './PhotoAttachmentSection';
import { MeasurementsEditor } from './MeasurementsEditor';

export interface UserOption { id: string; name: string; role: string; companyId?: string | null; }

interface TaskFormData {
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
  assigneeId: string;
}

interface ExistingTask {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueDate?: Date | null;
  assigneeId?: string | null;
  unit?: string | null;
  quantity?: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  domainId: string;
  domainName: string;
  users: UserOption[];
  existingTask?: ExistingTask | null;
  onSuccess: (task: any) => void;
  projectId?: string;
  canEdit?: boolean;
  // Task-level measurements only make sense for a task that has no priced subtasks.
  showMeasurements?: boolean;
}

const STATUSES = [
  { value: 'TODO',        label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'REVIEW',      label: 'Review' },
  { value: 'DONE',        label: 'Done' },
  { value: 'BLOCKED',     label: 'Blocked' },
];

const PRIORITIES = [
  { value: 'LOW',      label: 'Low' },
  { value: 'MEDIUM',   label: 'Medium' },
  { value: 'HIGH',     label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

export function TaskModal({ open, onOpenChange, domainId, domainName, users, existingTask, onSuccess, projectId, canEdit = true, showMeasurements = false }: Props) {
  const isEdit = !!existingTask;

  function buildInitialForm(): TaskFormData {
    return {
      title:       existingTask?.title ?? '',
      description: existingTask?.description ?? '',
      status:      existingTask?.status ?? 'TODO',
      priority:    existingTask?.priority ?? 'MEDIUM',
      dueDate:     existingTask?.dueDate ? new Date(existingTask.dueDate).toISOString().split('T')[0] : '',
      assigneeId:  existingTask?.assigneeId ?? '',
    };
  }

  const [form, setForm] = useState<TaskFormData>(buildInitialForm);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset the form each time the dialog opens, so a new "Add Task" never
  // inherits the previously-created task's values (and Edit reflects its task).
  useEffect(() => {
    if (open) {
      setForm(buildInitialForm());
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existingTask?.id]);

  function set(k: keyof TaskFormData) {
    return (value: string) => {
      setForm((prev) => ({ ...prev, [k]: value }));
      setError('');
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setIsLoading(true); setError('');

    const url    = isEdit ? `/api/tasks/${existingTask!.id}` : '/api/tasks';
    const method = isEdit ? 'PATCH' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isEdit ? {} : { domainId }),
          title:       form.title.trim(),
          description: form.description.trim() || null,
          status:      form.status,
          priority:    form.priority,
          dueDate:     form.dueDate || null,
          assigneeId:  form.assigneeId || null,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      const task = await res.json();
      onSuccess(task);
      onOpenChange(false);
    } catch (e: any) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            {isEdit ? 'Edit Task' : 'Add Task'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? `Editing task in` : `Adding task to`}{' '}
            <span className="font-medium text-foreground">{domainName}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title *</Label>
            <Input
              id="task-title"
              value={form.title}
              onChange={(e) => set('title')(e.target.value)}
              placeholder="e.g. Column casting - Ground Floor"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="task-desc">Description</Label>
            <Textarea
              id="task-desc"
              value={form.description}
              onChange={(e) => set('description')(e.target.value)}
              placeholder="Optional details, scope, notes…"
              rows={2}
            />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={set('status')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={set('priority')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due date + Assignee */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-due">Due Date</Label>
              <Input
                id="task-due"
                type="date"
                value={form.dueDate}
                onChange={(e) => set('dueDate')(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Assignee</Label>
              <Select value={form.assigneeId || 'none'} onValueChange={(v) => set('assigneeId')(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Task-level measurements (only when the task has no priced subtasks) */}
          {isEdit && existingTask && showMeasurements && (
            <div className="border-t border-border/80 pt-4">
              <MeasurementsEditor
                targetType="task"
                targetId={existingTask.id}
                unit={existingTask.unit}
                importedQty={existingTask.quantity ?? null}
                canEdit={canEdit}
              />
            </div>
          )}

          {/* Photo Attachments */}
          {isEdit && existingTask && projectId && (
            <div className="border-t border-border/80 pt-4 space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <ImageIcon className="h-3.5 w-3.5" /> Photo Attachments
              </Label>
              <PhotoAttachmentSection
                parentId={existingTask.id}
                parentType="TASK"
                projectId={projectId}
                canEdit={canEdit}
              />
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1" disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !form.title.trim()} className="flex-1">
              {isLoading
                ? <><Loader2 className="h-4 w-4 animate-spin" />{isEdit ? 'Saving…' : 'Creating…'}</>
                : isEdit ? 'Save Changes' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
