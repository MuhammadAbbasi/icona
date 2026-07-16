'use client';

import { useState, useRef, useEffect, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown, ChevronRight, Plus, CheckSquare, Square, Clock,
  Layers3, ListTodo,
  Pencil, Trash2, Loader2, CornerDownRight, Eye, CalendarCheck, User,
  UserPlus, Store, Users, History, FileDown, GitBranch, RotateCcw, AlertTriangle, HardHat
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { TaskModal, type UserOption } from './TaskModal';
import { SubtaskDetailModal, type SubtaskDetail } from './SubtaskDetailModal';
import { CompleteDialog, type CompletionData } from './CompleteDialog';
import {
  cn, TASK_STATUS_CONFIG, PRIORITY_CONFIG, getInitials, lineAmount, sumAmounts, formatPKR,
  effectiveQuantity, effectiveRate, originalLineAmount, sumOriginalAmounts,
} from '@/lib/utils';
import type { TaskStatus, Priority } from '@/types';

/* ─── BOQ revision context ─────────────────────────────────────────────────────
 * Revisions are project-wide ordered rounds (Original = R0 implicit, then Rev1,
 * Rev2 ...). Only the latest round is editable. Shared via context so every
 * subtask row can read it without prop-drilling through Domain/Task. */
export interface BoqRevision {
  id: string;
  index: number;
  label?: string | null;
  note?: string | null;
  createdAt?: string | Date;
}
interface RevisionCtx {
  projectId: string;
  revisions: BoqRevision[];
  current: BoqRevision | null;
  canRevise: boolean;
  reviseRates: boolean;
}
const RevisionContext = createContext<RevisionCtx | null>(null);
const useRevisions = () => useContext(RevisionContext);

// Currency in compact form for the tight inline old/new cells.
function fmtAmt(n: number): string {
  return new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(n);
}
function trimNum(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(3)));
}

function formatDate(d?: string | Date | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// BOQ "sub-subtask" lines are stored as "shared description - variant"
// (e.g. "…gate valves… - 20mm dia."). Emphasize the trailing variant so the
// reader's eye lands on what actually differs between sibling lines.
function renderSubtaskTitle(title: string): React.ReactNode {
  const i = title.lastIndexOf(' - ');
  if (i > 0) {
    const variant = title.slice(i + 3).trim();
    // Only bold a short trailing descriptor (a size/variant), never a long clause
    // that merely happens to contain a hyphen.
    if (variant && variant.length <= 40) {
      return (
        <>
          {title.slice(0, i)}
          <span className="font-bold text-foreground"> - {variant}</span>
        </>
      );
    }
  }
  return title;
}

/* ─── Types ────────────────────────────────────────────────────────────────── */
export interface QtyRevision { revisionIndex: number; quantity: number; rate?: number | null }
interface Subtask extends SubtaskDetail { quantityRevisions?: QtyRevision[] }
interface Task {
  id: string; title: string; description?: string | null;
  status: string; priority: string; dueDate?: Date | null;
  completedAt?: string | Date | null; loggedHours?: number | null;
  assigneeId?: string | null;
  assignee?: { id: string; name: string } | null;
  subtasks: Subtask[];
}
interface Domain   { id: string; name: string; description?: string | null; color?: string | null; tasks: Task[]; }
interface Props    {
  domains: Domain[];
  projectId: string;
  canEdit: boolean;
  users: UserOption[];
  canRevise?: boolean;
  revisions?: BoqRevision[];
  hasOriginalFile?: boolean;
  isAdmin?: boolean;
}

/* ─── Subtask row ───────────────────────────────────────────────────────────── */
function SubtaskRow({ subtask: initialSubtask, index, canEdit, onToggle, onUpdate, onDelete }: {
  subtask: Subtask;
  index: number;
  canEdit: boolean;
  onToggle: (id: string, completed: boolean) => void;
  onUpdate: (updated: Subtask) => void;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const [subtask, setSubtask] = useState(initialSubtask);

  useEffect(() => {
    setSubtask(initialSubtask);
  }, [initialSubtask]);

  const amount = lineAmount(subtask);
  const [pending, setPending]       = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [expanded, setExpanded]     = useState(false);

  const hasMeta = subtask.quantity != null || subtask.rate != null || !!subtask.unit || !!subtask.assigneeName;
  const zebra = index % 2 === 1; // alternating row shade so columns are easy to track

  // ── BOQ revisions ──────────────────────────────────────────────
  const rev = useRevisions();
  const current = rev?.current ?? null;
  const hasRevisions = (rev?.revisions.length ?? 0) > 0;
  const origQty = subtask.quantity ?? null;
  const origRate = subtask.rate ?? null;
  const effQty = effectiveQuantity(subtask as any);
  const effRate = effectiveRate(subtask as any);
  const origAmount = originalLineAmount(subtask as any);
  const qtyChanged = hasRevisions && origQty != null && effQty !== origQty;
  const rateChanged = hasRevisions && origRate != null && effRate !== origRate;
  const amountChanged = hasRevisions && Math.round(amount) !== Math.round(origAmount);
  const canRevise = !!rev?.canRevise && !!current;
  const reviseRates = !!rev?.reviseRates;
  const currentItem = current ? subtask.quantityRevisions?.find((r) => r.revisionIndex === current.index) : undefined;
  const baseQty = current ? effectiveQuantity(subtask as any, current.index - 1) : effQty;

  // Partially completed: some quantity done, but not the full contracted total.
  const partial = !subtask.completed && subtask.completedQuantity != null && effQty != null
    && subtask.completedQuantity > 0 && subtask.completedQuantity < effQty;
  const remainingQty = (effQty ?? 0) - (subtask.completedQuantity ?? 0);

  const [qtyInput, setQtyInput] = useState('');
  const [rateInput, setRateInput] = useState('');
  const [revPending, setRevPending] = useState(false);
  const [histOpen, setHistOpen] = useState(false);
  const [approval, setApproval] = useState<null | { quantity: number; rate: number | null }>(null);

  useEffect(() => {
    setQtyInput(effQty != null ? trimNum(effQty) : '');
    setRateInput(effRate != null ? trimNum(effRate) : '');
  }, [effQty, effRate, current?.id]);

  async function commitRevision(quantity: number, rateVal: number | null, approved = false) {
    if (!rev || !current) return;
    setRevPending(true);
    try {
      const res = await fetch(`/api/projects/${rev.projectId}/revisions/${current.id}/items/${subtask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity, rate: rateVal, approved }),
      });
      if (res.status === 409) {
        const data = await res.json().catch(() => ({}));
        if (data?.requiresApproval) { setApproval({ quantity, rate: rateVal }); return; }
      }
      if (res.ok) { setApproval(null); router.refresh(); }
    } finally { setRevPending(false); }
  }

  function commitQty() {
    if (!canRevise) return;
    const q = parseFloat(qtyInput);
    if (!Number.isFinite(q)) { setQtyInput(trimNum(effQty)); return; }
    if (q === baseQty && !currentItem) return; // unchanged from carry-forward
    const rRaw = reviseRates ? (rateInput.trim() === '' ? null : parseFloat(rateInput)) : (currentItem?.rate ?? null);
    commitRevision(q, rRaw != null && Number.isFinite(rRaw) ? rRaw : null);
  }

  function commitRate() {
    if (!canRevise || !reviseRates) return;
    const r = rateInput.trim() === '' ? null : parseFloat(rateInput);
    const q = parseFloat(qtyInput);
    commitRevision(Number.isFinite(q) ? q : baseQty, r != null && Number.isFinite(r) ? r : null);
  }

  async function revertLine() {
    if (!rev || !current) return;
    setRevPending(true);
    try {
      const res = await fetch(`/api/projects/${rev.projectId}/revisions/${current.id}/items/${subtask.id}`, { method: 'DELETE' });
      if (res.ok) router.refresh();
    } finally { setRevPending(false); }
  }

  async function patch(body: Record<string, unknown>) {
    await fetch(`/api/subtasks/${subtask.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  // Checking a box → ask for finish date + hours. Unchecking → revert instantly.
  function handleCheck() {
    if (!canEdit || pending) return;
    if (subtask.completed) {
      reopen();
    } else {
      setCompleteOpen(true);
    }
  }

  async function reopen() {
    setPending(true);
    try {
      await patch({ completed: false, completedAt: null, loggedHours: null, completedQuantity: null });
      setSubtask((prev) => ({ ...prev, completed: false, completedAt: null, loggedHours: null, completedQuantity: null }));
      onToggle(subtask.id, false);
      router.refresh();
    } finally { setPending(false); }
  }

  // Records the completed quantity. The line is only fully "done" once the
  // completed amount reaches the contracted total; otherwise it stays open with
  // the remaining quantity tracked for a later session.
  async function complete({ completedAt, loggedHours, completedQuantity }: CompletionData) {
    const total = effQty ?? 0;
    const cq = completedQuantity ?? null;
    const fullyDone = total > 0 ? (cq != null && cq >= total) : true;
    const finishedAt = fullyDone ? completedAt : null;
    await patch({ completed: fullyDone, completedAt: finishedAt, loggedHours, completedQuantity: cq });
    const updated = { ...subtask, completed: fullyDone, completedAt: finishedAt, loggedHours, completedQuantity: cq };
    setSubtask(updated);
    onToggle(subtask.id, fullyDone);
    onUpdate(updated); // completed quantity changes value-weighted rollups
    router.refresh();
  }

  return (
    <>
      <div className={cn(
        'flex items-center justify-between gap-2.5 py-2 px-2.5 rounded-lg border transition-colors group/sub',
        zebra ? 'bg-muted/50 border-border/50' : 'bg-card border-border/60',
        'hover:bg-primary/5 hover:border-primary/25',
      )}>
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <button
            onClick={handleCheck}
            disabled={pending || !canEdit}
            className={cn('flex-shrink-0 mt-0.5 transition-colors', canEdit ? 'cursor-pointer' : 'cursor-default')}
            title={subtask.completed ? 'Reopen' : 'Mark complete'}
          >
            {pending
              ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              : subtask.completed
              ? <CheckSquare className="h-3.5 w-3.5 text-emerald-500" />
              : partial
              ? <Square className="h-3.5 w-3.5 text-amber-500" />
              : <Square className="h-3.5 w-3.5 text-muted-foreground group-hover/sub:text-foreground/60" />}
          </button>

          <div className="flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? 'Collapse' : 'Show full text'}
              className={cn(
                'w-full text-left text-xs leading-relaxed transition-colors',
                subtask.completed ? 'line-through text-muted-foreground' : 'text-foreground/90',
                !expanded && 'line-clamp-2',
              )}
            >
              {renderSubtaskTitle(subtask.title)}
            </button>

            {/* Bottom Meta (Assignee, completion date/hours, partial progress) */}
            {(subtask.assigneeName || subtask.completed || partial) && (
              <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1 mt-1 text-[10px] text-muted-foreground">
                {subtask.assigneeName && (
                  <span className="inline-flex items-center gap-0.5">
                    <User className="h-3 w-3" />
                    {subtask.assigneeName}
                  </span>
                )}
                {partial && (
                  <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-medium">
                    {subtask.completedQuantity}/{effQty} {subtask.unit ?? ''} done · {remainingQty} {subtask.unit ?? ''} left
                  </span>
                )}
                {subtask.completed && subtask.completedAt && (
                  <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CalendarCheck className="h-3 w-3" />
                    {formatDate(subtask.completedAt)}
                  </span>
                )}
                {subtask.completed && subtask.loggedHours != null && (
                  <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-medium">
                    <Clock className="h-3 w-3" />
                    {subtask.loggedHours}h
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right side aligned columns */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-2">
          {/* Quantity Column — original (top) vs new (bottom) */}
          <div className="w-16 text-right text-xs tabular-nums hidden sm:block leading-tight">
            {origQty != null || hasRevisions ? (
              <div className="flex flex-col items-end">
                <span className={cn(qtyChanged ? 'text-[10px] text-muted-foreground/50 line-through' : 'text-foreground/75')}>
                  {origQty != null
                    ? <>{trimNum(origQty)} <span className="text-[10px] text-muted-foreground/75 font-normal">{subtask.unit || ''}</span></>
                    : <span className="text-muted-foreground/30">-</span>}
                </span>
                {hasRevisions && (canRevise ? (
                  <input
                    type="number" min="0" step="0.01" value={qtyInput} disabled={revPending}
                    onChange={(e) => setQtyInput(e.target.value)}
                    onBlur={commitQty}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
                    title="New quantity for the current revision"
                    className="mt-0.5 h-6 w-16 text-right tabular-nums rounded border border-primary/40 bg-background px-1 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                ) : qtyChanged ? (
                  <span className={cn('font-semibold', effQty > (origQty ?? 0) ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                    {trimNum(effQty)} <span className="text-[10px] font-normal text-muted-foreground/75">{subtask.unit || ''}</span>
                  </span>
                ) : null)}
              </div>
            ) : <span className="text-muted-foreground/30">-</span>}
          </div>

          {/* Rate Column — original (top) vs new (bottom, only if revised) */}
          <div className="w-20 text-right text-xs tabular-nums hidden md:block leading-tight">
            <div className="flex flex-col items-end">
              <span className={cn(rateChanged ? 'text-[10px] text-muted-foreground/50 line-through' : 'text-foreground/75')}>
                {origRate != null ? <>PKR {origRate.toLocaleString()}</> : <span className="text-muted-foreground/30">-</span>}
              </span>
              {hasRevisions && canRevise && reviseRates ? (
                <input
                  type="number" min="0" step="1" value={rateInput} disabled={revPending}
                  onChange={(e) => setRateInput(e.target.value)}
                  onBlur={commitRate}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
                  title="New rate for the current revision"
                  className="mt-0.5 h-6 w-20 text-right tabular-nums rounded border border-primary/40 bg-background px-1 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              ) : rateChanged ? (
                <span className={cn('font-semibold', effRate > (origRate ?? 0) ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                  PKR {effRate.toLocaleString()}
                </span>
              ) : null}
            </div>
          </div>

          {/* Total Price Column — new amount with original struck below if changed */}
          <div className="w-24 text-right text-xs tabular-nums leading-tight flex-shrink-0">
            {amount > 0 || origAmount > 0 ? (
              <div className="flex flex-col items-end">
                <span className="font-semibold text-foreground">{amount > 0 ? formatPKR(amount) : '-'}</span>
                {amountChanged && (
                  <span className="text-[10px] text-muted-foreground/50 line-through">{formatPKR(origAmount)}</span>
                )}
              </div>
            ) : <span className="text-muted-foreground/30">-</span>}
          </div>

          {/* Actions Column */}
          <div className="w-16 flex items-center justify-end gap-0.5 flex-shrink-0">
            {hasRevisions && (
              <button
                onClick={() => setHistOpen((v) => !v)}
                title="Revision history"
                className={cn('p-0.5 transition-opacity', histOpen ? 'text-primary' : 'text-muted-foreground hover:text-primary opacity-0 group-hover/sub:opacity-100')}
              >
                <History className="h-3.5 w-3.5" />
              </button>
            )}
            {canRevise && currentItem && (
              <button
                onClick={revertLine} disabled={revPending}
                title="Revert this line in the current revision"
                className="text-muted-foreground hover:text-amber-600 opacity-0 group-hover/sub:opacity-100 transition-opacity p-0.5"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            )}
            <button
              onClick={() => setDetailOpen(true)}
              title={canEdit ? 'Edit details' : 'View details'}
              className="text-muted-foreground hover:text-primary opacity-0 group-hover/sub:opacity-100 transition-opacity p-0.5"
            >
              {canEdit ? <Pencil className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
            {canEdit && (
              <button
                onClick={() => onDelete(subtask.id)}
                title="Delete"
                className="text-muted-foreground hover:text-destructive opacity-0 group-hover/sub:opacity-100 transition-opacity p-0.5"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Per-line revision history (dynamic Original | Rev1 | Rev2 …) */}
      {histOpen && hasRevisions && rev && (
        <div className="ml-8 mb-1 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-[11px] space-y-1">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-semibold text-muted-foreground w-12">Qty</span>
            <span>Original: <b className="tabular-nums">{origQty != null ? trimNum(origQty) : '-'}</b> {subtask.unit || ''}</span>
            {rev.revisions.map((r) => (
              <span key={r.id}>{r.label || `Rev ${r.index}`}: <b className="tabular-nums">{trimNum(effectiveQuantity(subtask as any, r.index))}</b></span>
            ))}
          </div>
          {rateChanged && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-semibold text-muted-foreground w-12">Rate</span>
              <span>Original: <b className="tabular-nums">PKR {origRate != null ? origRate.toLocaleString() : '-'}</b></span>
              {rev.revisions.map((r) => (
                <span key={r.id}>{r.label || `Rev ${r.index}`}: <b className="tabular-nums">PKR {effectiveRate(subtask as any, r.index).toLocaleString()}</b></span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Approval popup — required when the new quantity is below the original BOQ */}
      <Dialog open={approval != null} onOpenChange={(o) => { if (!o) { setApproval(null); setQtyInput(trimNum(effQty)); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" /> Approve reduced quantity
            </DialogTitle>
            <DialogDescription className="text-foreground/80">{subtask.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              The new quantity is below the original BOQ value. As an admin/manager, please confirm this reduction before it is saved.
            </p>
            <div className="grid grid-cols-2 gap-y-1.5 rounded-lg bg-muted/40 p-3 text-xs">
              <span className="text-muted-foreground">Original qty</span>
              <span className="text-right font-semibold tabular-nums">{origQty != null ? trimNum(origQty) : '-'} {subtask.unit || ''}</span>
              <span className="text-muted-foreground">New qty</span>
              <span className="text-right font-semibold tabular-nums text-rose-600 dark:text-rose-400">{approval ? trimNum(approval.quantity) : ''} {subtask.unit || ''}</span>
              <span className="text-muted-foreground">Original amount</span>
              <span className="text-right tabular-nums">{formatPKR(origAmount)}</span>
              <span className="text-muted-foreground">New amount</span>
              <span className="text-right font-semibold tabular-nums">{approval ? formatPKR(approval.quantity * (approval.rate ?? effRate)) : ''}</span>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => { setApproval(null); setQtyInput(trimNum(effQty)); }}>Cancel</Button>
            <Button className="flex-1" disabled={revPending} onClick={() => approval && commitRevision(approval.quantity, approval.rate, true)}>
              {revPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Approve & Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SubtaskDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        subtask={subtask}
        canEdit={canEdit}
        onSave={(updated) => { setSubtask(updated); onUpdate(updated); router.refresh(); }}
        projectId={rev?.projectId || ''}
      />

      <CompleteDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        itemType="subtask"
        title={subtask.title}
        unit={subtask.unit}
        quantity={effQty}
        rate={effRate}
        completedQuantity={subtask.completedQuantity}
        onConfirm={complete}
      />
    </>
  );
}

/* ─── Inline subtask adder ─────────────────────────────────────────────────── */
function AddSubtaskInput({ taskId, onAdd }: { taskId: string; onAdd: (sub: Subtask) => void }) {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit() {
    if (!value.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/subtasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, title: value.trim() }),
      });
      if (res.ok) {
        onAdd(await res.json());
        setValue('');
        inputRef.current?.focus();
        router.refresh();
      }
    } finally { setSaving(false); }
  }

  return (
    <div className="flex items-center gap-2 px-2 mt-1">
      <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0" />
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
        placeholder="Add subtask… (Enter to save)"
        className="h-7 text-xs border-dashed bg-transparent"
      />
      {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground flex-shrink-0" />}
    </div>
  );
}

/* ─── Task row ──────────────────────────────────────────────────────────────── */
function TaskRow({ task: initialTask, canEdit, users, onDelete, onStatusChange, onSubtaskUpdate, domainName, domainId }: {
  task: Task;
  canEdit: boolean;
  users: UserOption[];
  domainName: string;
  domainId: string;
  onDelete: (id: string) => void;
  onStatusChange?: (id: string, status: string) => void;
  onSubtaskUpdate?: (taskId: string, subtasks: Subtask[]) => void;
}) {
  const router = useRouter();
  const rev = useRevisions();
  const [task, setTask] = useState(initialTask);

  useEffect(() => {
    setTask(initialTask);
  }, [initialTask]);

  const taskAmount = sumAmounts(task.subtasks);
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [pending, setPending]   = useState(false);
  const [deleting, setDeleting] = useState(false);

  const statusCfg   = TASK_STATUS_CONFIG[task.status as TaskStatus];
  const priorityCfg = PRIORITY_CONFIG[task.priority as Priority];
  const done        = task.subtasks.filter((s) => s.completed).length;
  const isDone      = task.status === 'DONE';

  async function patchTask(body: Record<string, unknown>) {
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  function handleCheck() {
    if (!canEdit || pending) return;
    if (isDone) reopenTask();
    else setCompleteOpen(true);
  }

  async function reopenTask() {
    setPending(true);
    try {
      await patchTask({ status: 'TODO', completedAt: null, loggedHours: null });
      setTask((prev) => ({ ...prev, status: 'TODO', completedAt: null, loggedHours: null }));
      onStatusChange?.(task.id, 'TODO');
      router.refresh();
    } finally { setPending(false); }
  }

  async function completeTask({ completedAt, loggedHours, completeSubtasks }: { completedAt: string; loggedHours: number | null; completeSubtasks: boolean }) {
    await patchTask({ status: 'DONE', completedAt, loggedHours });

    let subtasks = task.subtasks;
    if (completeSubtasks) {
      const pendingSubs = task.subtasks.filter((s) => !s.completed);
      await Promise.all(pendingSubs.map((s) =>
        fetch(`/api/subtasks/${s.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: true, completedAt, loggedHours: null }),
        })
      ));
      subtasks = task.subtasks.map((s) => s.completed ? s : { ...s, completed: true, completedAt });
      onSubtaskUpdate?.(task.id, subtasks);
    }

    setTask((prev) => ({ ...prev, status: 'DONE', completedAt, loggedHours, subtasks }));
    onStatusChange?.(task.id, 'DONE');
    router.refresh();
  }

  function handleSubtaskToggle(id: string, completed: boolean) {
    setTask((prev) => {
      const nextSubtasks = prev.subtasks.map((s) => s.id === id ? { ...s, completed } : s);
      const allDone = nextSubtasks.length > 0 && nextSubtasks.every((s) => s.completed);
      if (allDone && prev.status !== 'DONE') {
        setTimeout(() => {
          setCompleteOpen(true);
        }, 100);
      }
      return { ...prev, subtasks: nextSubtasks };
    });
  }

  function handleSubtaskAdd(sub: Subtask) {
    const subtasks = [...task.subtasks, sub];
    setTask((prev) => ({ ...prev, subtasks }));
    onSubtaskUpdate?.(task.id, subtasks);
  }

  function handleSubtaskUpdate(updated: Subtask) {
    const subtasks = task.subtasks.map((s) => s.id === updated.id ? updated : s);
    setTask((prev) => ({ ...prev, subtasks }));
    onSubtaskUpdate?.(task.id, subtasks);
  }

  function handleSubtaskDelete(id: string) {
    const targetSubtask = task.subtasks.find((s) => s.id === id);
    if (!targetSubtask) return;
    if (!confirm(`Delete subtask "${targetSubtask.title}"?`)) return;

    fetch(`/api/subtasks/${id}`, { method: 'DELETE' }).then(() => {
      router.refresh();
    });
    const subtasks = task.subtasks.filter((s) => s.id !== id);
    setTask((prev) => {
      const allDone = subtasks.length > 0 && subtasks.every((s) => s.completed);
      if (allDone && prev.status !== 'DONE') {
        setTimeout(() => {
          setCompleteOpen(true);
        }, 100);
      }
      return { ...prev, subtasks };
    });
    onSubtaskUpdate?.(task.id, subtasks);
  }

  async function handleDelete() {
    if (!confirm(`Delete task "${task.title}"?`)) return;
    setDeleting(true);
    const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
    if (res.ok) {
      onDelete(task.id);
      router.refresh();
    } else {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className={cn(
        'group/task border border-border/60 rounded-xl overflow-hidden bg-card hover:border-border transition-colors',
        deleting && 'opacity-40 pointer-events-none'
      )}>
        {/* Task header row */}
        <div
          className={cn(
            'flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors select-none',
            expanded && 'bg-muted/20'
          )}
          onClick={() => setExpanded((v) => !v)}
        >
          {/* First icon — expand/collapse the subtask list */}
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
            title={expanded ? 'Collapse subtasks' : 'Expand subtasks'}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {expanded
              ? <ChevronDown className="h-4 w-4" />
              : <ChevronRight className="h-4 w-4" />}
          </button>

          {/* Second icon — task completion */}
          <button
            onClick={(e) => { e.stopPropagation(); handleCheck(); }}
            disabled={pending || !canEdit}
            title={isDone ? 'Reopen task' : 'Mark task complete'}
            className={cn('flex-shrink-0 transition-colors', canEdit ? 'cursor-pointer' : 'cursor-default')}
          >
            {pending
              ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              : isDone
              ? <CheckSquare className="h-4 w-4 text-emerald-500" />
              : <Square className="h-4 w-4 text-muted-foreground hover:text-foreground/70" />}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('text-sm font-medium', isDone ? 'line-through text-muted-foreground' : 'text-foreground')}>{task.title}</span>
              <span className={cn('text-[11px] font-medium px-1.5 py-0.5 rounded-md', statusCfg?.color)}>
                {statusCfg?.label}
              </span>
              <span className={cn('text-[11px] font-medium flex items-center gap-1', priorityCfg?.color)}>
                <span className={cn('h-1.5 w-1.5 rounded-full', priorityCfg?.dot)} />
                {priorityCfg?.label}
              </span>
              {isDone && (task.completedAt || task.loggedHours != null) && (
                <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {task.completedAt && (
                    <span className="flex items-center gap-0.5"><CalendarCheck className="h-3 w-3" />{formatDate(task.completedAt)}</span>
                  )}
                  {task.loggedHours != null && (
                    <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{task.loggedHours}h</span>
                  )}
                </span>
              )}
            </div>
            {task.description && !expanded && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 ml-1">
            {task.assignee && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                    {getInitials(task.assignee.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline">{task.assignee.name.split(' ')[0]}</span>
              </div>
            )}
            {task.subtasks.length > 0 && (
              <span className="text-xs text-muted-foreground font-medium tabular-nums">
                {done}/{task.subtasks.length}
              </span>
            )}
            {taskAmount > 0 && (
              <span className="text-xs font-semibold tabular-nums text-foreground bg-muted px-2 py-0.5 rounded-md" title="Total of subtask amounts">
                {formatPKR(taskAmount)}
              </span>
            )}

            {/* Edit / Delete — visible on hover */}
            {canEdit && (
              <div className="flex items-center gap-0.5 opacity-0 group-hover/task:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon-sm" className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={() => setEditOpen(true)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon-sm" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={handleDelete}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Expanded body */}
        {expanded && (
          <div className="px-4 pb-3 pt-2 border-t border-border/50 bg-muted/25 space-y-1">
            {task.description && (
              <p className="text-xs text-muted-foreground leading-relaxed pb-2">{task.description}</p>
            )}

            {task.subtasks.length > 0 && (
              <>
                <div className="flex items-center justify-between px-2.5 mb-1.5 mt-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Subtasks
                  </p>
                  <div className="flex items-center gap-4 flex-shrink-0 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80">
                    <div className="w-20 text-right hidden sm:block">Quantity</div>
                    <div className="w-24 text-right hidden sm:block">Rate</div>
                    <div className="w-28 text-right">Total Price</div>
                    <div className="w-16" />
                  </div>
                </div>
                {task.subtasks.map((sub, i) => (
                  <SubtaskRow
                    key={sub.id} subtask={sub} index={i} canEdit={canEdit}
                    onToggle={handleSubtaskToggle} onUpdate={handleSubtaskUpdate} onDelete={handleSubtaskDelete}
                  />
                ))}
              </>
            )}

            {canEdit && (
              <AddSubtaskInput taskId={task.id} onAdd={handleSubtaskAdd} />
            )}

            {task.subtasks.length === 0 && !canEdit && (
              <p className="text-xs text-muted-foreground/50 px-2">No subtasks.</p>
            )}
          </div>
        )}
      </div>

      {/* Edit modal */}
      <TaskModal
        open={editOpen}
        onOpenChange={setEditOpen}
        domainId={domainId}
        domainName={domainName}
        users={users}
        existingTask={task as any}
        showMeasurements={task.subtasks.length === 0}
        onSuccess={(updated) => {
          setTask((prev) => ({ ...prev, ...updated }));
          router.refresh();
        }}
        projectId={rev?.projectId || ''}
        canEdit={canEdit}
      />

      <CompleteDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        itemType="task"
        title={task.title}
        pendingSubtasks={task.subtasks.filter((s) => !s.completed).length}
        onConfirm={completeTask}
      />
    </>
  );
}

/* ─── Domain section ────────────────────────────────────────────────────────── */
function DomainSection({ domain: initialDomain, canEdit, users, onChange }: {
  domain: Domain;
  canEdit: boolean;
  users: UserOption[];
  onChange?: (domain: Domain) => void;
}) {
  const router = useRouter();
  const rev = useRevisions();
  const [domain, setDomain] = useState(initialDomain);

  const [expanded, setExpanded] = useState(false);
  const [addOpen, setAddOpen]   = useState(false);
  
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(domain.name);
  const [editColor, setEditColor] = useState(domain.color || '#6366f1');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDomain(initialDomain);
    setEditName(initialDomain.name);
    setEditColor(initialDomain.color || '#6366f1');
  }, [initialDomain]);

  const done = domain.tasks.filter((t) => t.status === 'DONE').length;
  const domainSubtasks = domain.tasks.flatMap((t) => t.subtasks);
  const domainAmount = sumAmounts(domainSubtasks);
  const domainOriginal = sumOriginalAmounts(domainSubtasks);
  const domainChanged = domainOriginal > 0 && Math.round(domainOriginal) !== Math.round(domainAmount);

  async function handleDomainSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/domains/${domain.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), color: editColor }),
      });
      if (res.ok) {
        const updated = await res.json();
        const nextDomain = { ...domain, name: updated.name, color: updated.color };
        setDomain(nextDomain);
        onChange?.(nextDomain);
        setEditOpen(false);
        router.refresh();
      } else {
        alert('Failed to update domain.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error. Failed to update domain.');
    } finally {
      setSaving(false);
    }
  }

  function handleTaskAdded(task: Task) {
    const nextDomain = { ...domain, tasks: [...domain.tasks, task] };
    setDomain(nextDomain);
    onChange?.(nextDomain);
    router.refresh();
  }

  function handleTaskDeleted(id: string) {
    const nextDomain = { ...domain, tasks: domain.tasks.filter((t) => t.id !== id) };
    setDomain(nextDomain);
    onChange?.(nextDomain);
  }

  function handleTaskStatus(id: string, status: string) {
    const nextDomain = { ...domain, tasks: domain.tasks.map((t) => t.id === id ? { ...t, status } : t) };
    setDomain(nextDomain);
    onChange?.(nextDomain);
  }

  function handleSubtaskUpdate(taskId: string, subtasks: Task['subtasks']) {
    const nextDomain = { ...domain, tasks: domain.tasks.map((t) => t.id === taskId ? { ...t, subtasks } : t) };
    setDomain(nextDomain);
    onChange?.(nextDomain);
  }

  return (
    <>
      <div className="rounded-xl border bg-card/50 overflow-hidden">
        <div
          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition-colors text-left cursor-pointer select-none"
          role="button"
          tabIndex={0}
          onClick={() => setExpanded((v) => !v)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpanded((v) => !v); }}
        >
          <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: domain.color ?? '#6366f1' }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground">{domain.name}</span>
              <span className="text-xs text-muted-foreground">{done}/{domain.tasks.length} done</span>
              {domainAmount > 0 && (
                <span className="text-xs font-semibold tabular-nums text-foreground bg-primary/10 px-2 py-0.5 rounded-md" title="Current total cost of this domain's works">
                  {formatPKR(domainAmount)}
                </span>
              )}
              {domainChanged && (
                <span className="text-[10px] tabular-nums text-muted-foreground/70" title="Original BOQ total for this domain">
                  was {formatPKR(domainOriginal)}
                </span>
              )}
            </div>
            {domain.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{domain.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {canEdit && (
              <>
                <Button
                  variant="subtle" size="icon-sm"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  title="Rename Domain"
                  onClick={(e) => { e.stopPropagation(); setEditOpen(true); }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="subtle" size="icon-sm"
                  className="h-7 w-7"
                  title="Add task"
                  onClick={(e) => { e.stopPropagation(); setAddOpen(true); }}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            {expanded
              ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
              : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>

        {expanded && (
          <div className="px-5 pb-4 space-y-2">
            {domain.tasks.length === 0 ? (
              <div
                className={cn(
                  'flex items-center gap-2 text-sm text-muted-foreground py-3 px-2 rounded-lg border-2 border-dashed border-border/50 cursor-pointer hover:border-primary/30 hover:bg-muted/30 transition-all',
                  !canEdit && 'cursor-default hover:border-border/50 hover:bg-transparent'
                )}
                onClick={canEdit ? () => setAddOpen(true) : undefined}
              >
                <ListTodo className="h-4 w-4 flex-shrink-0" />
                {canEdit
                  ? <span>No tasks yet. <span className="text-primary font-medium">Click to add the first task.</span></span>
                  : <span>No tasks yet.</span>}
              </div>
            ) : (
              domain.tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  canEdit={canEdit}
                  users={users}
                  domainName={domain.name}
                  domainId={domain.id}
                  onDelete={handleTaskDeleted}
                  onStatusChange={handleTaskStatus}
                  onSubtaskUpdate={handleSubtaskUpdate}
                />
              ))
            )}
          </div>
        )}
      </div>

      <TaskModal
        open={addOpen}
        onOpenChange={setAddOpen}
        domainId={domain.id}
        domainName={domain.name}
        users={users}
        onSuccess={handleTaskAdded}
        projectId={rev?.projectId || ''}
        canEdit={canEdit}
      />

      {/* Edit Domain Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Domain</DialogTitle>
            <DialogDescription>
              Update the name or colored identifier for this work domain.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDomainSave} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Domain Name
              </label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter domain name..."
                required
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                Domain Color Label
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="h-8 w-10 border rounded cursor-pointer"
                  disabled={saving}
                />
                <span className="text-xs font-mono text-muted-foreground uppercase">{editColor}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving || !editName.trim()}
                className="gap-1.5"
              >
                {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─── Root export ───────────────────────────────────────────────────────────── */
export function ProjectHierarchy({
  domains: initialDomains, projectId, canEdit, users,
  canRevise = false, revisions = [], hasOriginalFile = false,
  isAdmin = false,
}: Props) {
  const router = useRouter();
  const [domains, setDomains] = useState(initialDomains);
  const [reviseRates, setReviseRates] = useState(false);
  const [creatingRev, setCreatingRev] = useState(false);
  const current = revisions.length ? revisions[revisions.length - 1] : null;

  const [revertOpen, setRevertOpen] = useState(false);
  const [reverting, setReverting] = useState(false);

  async function deleteLatestRevision() {
    if (!current) return;
    setReverting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/revisions/${current.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setRevertOpen(false);
        router.refresh();
      }
    } finally {
      setReverting(false);
    }
  }

  // Find all subtasks that were modified in the current revision round
  const changedItems = current ? domains.flatMap((d) =>
    d.tasks.flatMap((t) =>
      t.subtasks
        .filter((s) => s.quantityRevisions?.some((qr) => qr.revisionIndex === current.index))
        .map((s) => {
          const item = s.quantityRevisions!.find((qr) => qr.revisionIndex === current.index)!;
          const prevQty = effectiveQuantity(s as any, current.index - 1);
          const prevRate = effectiveRate(s as any, current.index - 1);
          return {
            id: s.id,
            taskTitle: t.title,
            subtaskTitle: s.title,
            unit: s.unit,
            prevQty,
            newQty: item.quantity,
            prevRate,
            newRate: item.rate,
          };
        })
    )
  ) : [];

  async function createRevision() {
    setCreatingRev(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/revisions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      if (res.ok) router.refresh();
    } finally { setCreatingRev(false); }
  }

  useEffect(() => {
    setDomains(initialDomains);
  }, [initialDomains]);

  // Assignment states
  const [assignedUsers, setAssignedUsers] = useState<any[]>([]);
  const [assignedTeams, setAssignedTeams] = useState<any[]>([]);
  const [assignedVendors, setAssignedVendors] = useState<any[]>([]);
  const [assignedSubs, setAssignedSubs] = useState<any[]>([]);
  const [allSubs, setAllSubs] = useState<any[]>([]);
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [allVendors, setAllVendors] = useState<any[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [projectCompanyIds, setProjectCompanyIds] = useState<string[]>([]);

  async function loadAssignments() {
    setLoadingAssignments(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/assignments`);
      if (res.ok) {
        const data = await res.json();
        setAssignedUsers(data.engagedUsers || []);
        setAssignedTeams(data.teams || []);
        setAssignedVendors(data.vendors || []);
        setAssignedSubs(data.subcontractors || []);
        setAllSubs(data.allSubcontractors || []);
        setProjectCompanyIds([data.companyId, data.ownerCompanyId].filter(Boolean));
      }
    } catch (err) {
      console.error('Failed to load project assignments:', err);
    } finally {
      setLoadingAssignments(false);
    }
  }

  async function loadAllOptions() {
    try {
      const [tRes, vRes] = await Promise.all([
        fetch('/api/teams'),
        fetch('/api/vendors'),
      ]);
      if (tRes.ok) setAllTeams(await tRes.json());
      if (vRes.ok) setAllVendors(await vRes.json());
    } catch (err) {
      console.error('Failed to load assignment options:', err);
    }
  }

  useEffect(() => {
    loadAssignments();
    if (canEdit) {
      loadAllOptions();
    }
  }, [projectId, canEdit]);

  function handleDomainChange(updated: Domain) {
    setDomains((prev) => prev.map((d) => d.id === updated.id ? updated : d));
  }

  const allSubtasks = domains.flatMap((d) => d.tasks.flatMap((t) => t.subtasks));
  const projectAmount = sumAmounts(allSubtasks);
  const projectOriginal = sumOriginalAmounts(allSubtasks);
  const projectChanged = projectOriginal > 0 && Math.round(projectOriginal) !== Math.round(projectAmount);

  return (
    <RevisionContext.Provider value={{ projectId, revisions, current, canRevise, reviseRates }}>
    <div className="space-y-6">
      {/* Team & Suppliers Panel */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Project Team &amp; Suppliers</h3>
          </div>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAssignModalOpen(true)}
              className="text-xs h-8 gap-1.5"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Manage Assignments
            </Button>
          )}
        </div>

        {loadingAssignments ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            Loading team assignments...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Assigned Members */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Assigned Members ({assignedUsers.length})
              </div>
              {assignedUsers.length === 0 ? (
                <div className="text-xs text-muted-foreground/60 italic py-1">No staff members assigned.</div>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {assignedUsers.map((user) => (
                    <div key={user.id} className="flex items-center gap-2 text-xs text-foreground bg-muted/30 hover:bg-muted/50 rounded-lg p-1.5 transition-colors">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{user.name}</div>
                        <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{user.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assigned Teams */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Assigned Teams ({assignedTeams.length})
              </div>
              {assignedTeams.length === 0 ? (
                <div className="text-xs text-muted-foreground/60 italic py-1">No teams assigned.</div>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {assignedTeams.map((team) => (
                    <div key={team.id} className="flex items-center gap-2 text-xs text-foreground bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/10 rounded-lg p-2">
                      <Users className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                      <span className="font-medium truncate">{team.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assigned Suppliers */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Assigned Suppliers ({assignedVendors.length})
              </div>
              {assignedVendors.length === 0 ? (
                <div className="text-xs text-muted-foreground/60 italic py-1">No suppliers assigned.</div>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {assignedVendors.map((vendor) => (
                    <div key={vendor.id} className="flex items-center gap-2 text-xs text-foreground bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 rounded-lg p-2">
                      <Store className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="font-medium truncate block">{vendor.name}</span>
                        {vendor.supplies && (
                          <span className="text-[9px] text-muted-foreground truncate block">{vendor.supplies}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assigned Subcontractors */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Assigned Subcontractors ({assignedSubs.length})
              </div>
              {assignedSubs.length === 0 ? (
                <div className="text-xs text-muted-foreground/60 italic py-1">No subcontractors assigned.</div>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {assignedSubs.map((s) => (
                    <div key={s.subcontractorId} className="flex items-center gap-2 text-xs text-foreground bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10 rounded-lg p-2">
                      <HardHat className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="font-medium truncate block">{s.name}</span>
                        <span className="text-[9px] text-muted-foreground block">Contract: {formatPKR(s.contractAmount || 0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Domains Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Layers3 className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Project Domains &amp; Tasks</h2>
          <span className="text-sm text-muted-foreground">({domains.length})</span>

          {/* Revision controls */}
          <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
            {revisions.length > 0 && (
              <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1" title="BOQ revision rounds">
                <GitBranch className="h-3.5 w-3.5" />
                {['Original', ...revisions.map((r) => r.label || `Rev ${r.index}`)].join(' › ')}
              </span>
            )}
            {canRevise && current && (
              <button
                type="button"
                onClick={() => setReviseRates((v) => !v)}
                className={cn(
                  'text-[11px] inline-flex items-center gap-1.5 px-2 py-1 rounded-md border transition-colors',
                  reviseRates ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground',
                )}
                title="When on, you can also edit the rate alongside the new quantity"
              >
                <span className={cn('h-3 w-3 rounded-full border', reviseRates ? 'bg-primary border-primary' : 'border-muted-foreground/50')} />
                Revise rates
              </button>
            )}
            {canRevise && (
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={createRevision} disabled={creatingRev}>
                {creatingRev ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                New Revision
              </Button>
            )}
            {isAdmin && current && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/30 hover:border-destructive/50"
                onClick={() => setRevertOpen(true)}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Delete Latest Revision
              </Button>
            )}
            <Button
              variant="outline" size="sm" className="h-8 text-xs gap-1.5"
              disabled={!hasOriginalFile}
              title={hasOriginalFile ? 'Download updated BOQ (Excel)' : 'Re-import the BOQ to enable export'}
              onClick={() => { if (hasOriginalFile) window.location.href = `/api/projects/${projectId}/export-boq`; }}
            >
              <FileDown className="h-3.5 w-3.5" /> Export
            </Button>
          </div>
        </div>

        {/* Project totals — current vs original */}
        {projectAmount > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-bold tabular-nums text-foreground bg-primary/10 border border-primary/20 px-3 py-1 rounded-lg" title="Current estimated total of all works">
              {projectChanged ? 'Current Total: ' : 'Total: '}{formatPKR(projectAmount)}
            </span>
            {projectChanged && (
              <span className="text-xs tabular-nums text-muted-foreground">
                Original: {formatPKR(projectOriginal)}
                <span className={cn('ml-2 font-semibold', projectAmount >= projectOriginal ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                  ({projectAmount >= projectOriginal ? '+' : '-'}{formatPKR(Math.abs(projectAmount - projectOriginal))})
                </span>
              </span>
            )}
          </div>
        )}

        {domains.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center border rounded-xl bg-card/50">
            <Layers3 className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No domains defined for this project yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {domains.map((domain) => (
              <DomainSection key={domain.id} domain={domain} canEdit={canEdit} users={users} onChange={handleDomainChange} />
            ))}
          </div>
        )}
      </div>

      {/* Modal Dialog */}
      <AssignModal
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        projectId={projectId}
        users={users}
        teams={allTeams}
        vendors={allVendors}
        subcontractors={allSubs}
        initialUserIds={assignedUsers.map((u) => u.id)}
        initialTeamIds={assignedTeams.map((t) => t.id)}
        initialVendorIds={assignedVendors.map((v) => v.id)}
        initialSubs={assignedSubs}
        isAdmin={isAdmin}
        projectCompanyIds={projectCompanyIds}
        onSuccess={loadAssignments}
      />

      {/* Revert / Delete Latest Revision Confirmation Modal */}
      <Dialog open={revertOpen} onOpenChange={(o) => { if (!reverting) setRevertOpen(o); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5 animate-pulse" /> Delete Latest Revision ({current?.label || `Rev ${current?.index}`})
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this revision round? This will permanently revert all modified quantities and rates back to their previous values. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Quantities changed in this round ({changedItems.length})
            </div>

            {changedItems.length === 0 ? (
              <div className="text-xs text-muted-foreground/60 italic py-4 text-center border rounded-lg bg-muted/20">
                No items were modified in this revision round.
              </div>
            ) : (
              <div className="border border-border/80 rounded-lg max-h-60 overflow-y-auto divide-y divide-border/50">
                {changedItems.map((item) => {
                  const qtyDiff = item.newQty - item.prevQty;
                  const hasRateChange = item.newRate != null && item.newRate !== item.prevRate;
                  return (
                    <div key={item.id} className="p-3 text-xs space-y-1 bg-card hover:bg-muted/10 transition-colors">
                      <div className="text-[10px] font-semibold text-muted-foreground truncate uppercase tracking-tight">
                        {item.taskTitle}
                      </div>
                      <div className="font-medium text-foreground leading-snug line-clamp-2">
                        {item.subtaskTitle}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground pt-0.5">
                        <span className="tabular-nums">
                          Qty: <b className="text-foreground">{trimNum(item.prevQty)}</b> &rarr; <b className={cn(qtyDiff > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>{trimNum(item.newQty)}</b>
                          <span className="ml-1 text-[10px]">({qtyDiff >= 0 ? '+' : ''}{trimNum(qtyDiff)} {item.unit || ''})</span>
                        </span>
                        {hasRateChange && (
                          <span className="tabular-nums">
                            Rate: <b className="text-foreground">PKR {item.prevRate.toLocaleString()}</b> &rarr; <b className="text-foreground">PKR {item.newRate!.toLocaleString()}</b>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setRevertOpen(false)} className="flex-1" disabled={reverting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={deleteLatestRevision} disabled={reverting} className="flex-1">
                {reverting ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Deleting...</>
                ) : (
                  "Delete Revision"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </RevisionContext.Provider>
  );
}

/* ─── Manage Project Assignments Modal ────────────────────────────────────────── */
interface AssignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  users: UserOption[];
  teams: any[];
  vendors: any[];
  subcontractors: any[];
  initialUserIds: string[];
  initialTeamIds: string[];
  initialVendorIds: string[];
  initialSubs: { subcontractorId: string; contractAmount: number }[];
  isAdmin: boolean;
  projectCompanyIds: string[];
  onSuccess: () => void;
}

function AssignModal({
  open,
  onOpenChange,
  projectId,
  users,
  teams,
  vendors,
  subcontractors,
  initialUserIds,
  initialTeamIds,
  initialVendorIds,
  initialSubs,
  isAdmin,
  projectCompanyIds,
  onSuccess,
}: AssignModalProps) {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(initialUserIds);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(initialTeamIds);
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>(initialVendorIds);
  const [selectedSubIds, setSelectedSubIds] = useState<string[]>([]);
  const [subPrices, setSubPrices] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isCeo = (user: UserOption) => {
    return !!(user.role === 'ADMIN' && user.companyId && projectCompanyIds.includes(user.companyId));
  };

  useEffect(() => {
    if (open) {
      const ceoIds = users.filter(isCeo).map((u) => u.id);
      const uniqueUserIds = Array.from(new Set([...initialUserIds, ...ceoIds]));
      setSelectedUserIds(uniqueUserIds);
      setSelectedTeamIds(initialTeamIds);
      setSelectedVendorIds(initialVendorIds);
      setSelectedSubIds(initialSubs.map((s) => s.subcontractorId));
      setSubPrices(Object.fromEntries(initialSubs.map((s) => [s.subcontractorId, String(s.contractAmount ?? 0)])));
      setError('');
    }
  }, [open, initialUserIds, initialTeamIds, initialVendorIds, initialSubs, users, projectCompanyIds]);

  const toggleSub = (id: string) => {
    setSelectedSubIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const toggleUser = (id: string) => {
    const user = users.find((u) => u.id === id);
    if (user && isCeo(user)) return;
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]
    );
  };

  const toggleTeam = (id: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(id) ? prev.filter((tid) => tid !== id) : [...prev, id]
    );
  };

  const toggleVendor = (id: string) => {
    setSelectedVendorIds((prev) =>
      prev.includes(id) ? prev.filter((vid) => vid !== id) : [...prev, id]
    );
  };

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: selectedUserIds,
          teamIds: selectedTeamIds,
          vendorIds: selectedVendorIds,
          subcontractors: selectedSubIds.map((id) => ({ subcontractorId: id, contractAmount: parseFloat(subPrices[id]) || 0 })),
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text() || 'Failed to update assignments');
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save assignments');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Project Assignments</DialogTitle>
          <DialogDescription>
            Assign members, teams, and material suppliers to this project.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-2.5 my-2">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-4">
          {/* Members Checklist */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Team Members
            </div>
            <div className="border border-border/80 rounded-xl p-3 max-h-60 overflow-y-auto space-y-2 bg-muted/10">
              {users.length === 0 ? (
                <span className="text-xs text-muted-foreground">No staff members available.</span>
              ) : (
                users.map((user) => {
                  const userIsCeo = isCeo(user);
                  return (
                    <label
                      key={user.id}
                      className={cn(
                        "flex items-center gap-2 text-xs font-medium select-none text-foreground hover:text-foreground/85",
                        userIsCeo ? "cursor-not-allowed opacity-75" : "cursor-pointer"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.id) || userIsCeo}
                        disabled={userIsCeo}
                        onChange={() => toggleUser(user.id)}
                        className="h-3.5 w-3.5 rounded border-input accent-primary"
                      />
                      <span>{user.name}</span>
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wider ml-auto">
                        {user.role} {userIsCeo && "(CEO)"}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Teams Checklist */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Teams
            </div>
            <div className="border border-border/80 rounded-xl p-3 max-h-60 overflow-y-auto space-y-2 bg-muted/10">
              {teams.length === 0 ? (
                <span className="text-xs text-muted-foreground">No teams available.</span>
              ) : (
                teams.map((team) => (
                  <label
                    key={team.id}
                    className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none text-foreground hover:text-foreground/85"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTeamIds.includes(team.id)}
                      onChange={() => toggleTeam(team.id)}
                      className="h-3.5 w-3.5 rounded border-input accent-primary"
                    />
                    <span>{team.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Suppliers Checklist */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Suppliers (Vendors)
            </div>
            <div className="border border-border/80 rounded-xl p-3 max-h-60 overflow-y-auto space-y-2 bg-muted/10">
              {vendors.length === 0 ? (
                <span className="text-xs text-muted-foreground">No suppliers available.</span>
              ) : (
                vendors.map((vendor) => (
                  <label
                    key={vendor.id}
                    className="flex items-start gap-2 text-xs font-medium cursor-pointer select-none text-foreground hover:text-foreground/85"
                  >
                    <input
                      type="checkbox"
                      checked={selectedVendorIds.includes(vendor.id)}
                      onChange={() => toggleVendor(vendor.id)}
                      className="h-3.5 w-3.5 rounded border-input accent-primary mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{vendor.name}</div>
                      {vendor.supplies && (
                        <div className="text-[9px] text-muted-foreground truncate">{vendor.supplies}</div>
                      )}
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Subcontractors (with fixed contract price, editable by admin only) */}
        <div className="space-y-2 mb-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <HardHat className="h-3.5 w-3.5 text-amber-500" /> Subcontractors
            {!isAdmin && <span className="text-[9px] normal-case font-normal">(contract price is set by an admin)</span>}
          </div>
          <div className="border border-border/80 rounded-xl p-3 max-h-56 overflow-y-auto space-y-1.5 bg-muted/10">
            {subcontractors.length === 0 ? (
              <span className="text-xs text-muted-foreground">No subcontractors registered. Add them in Teams first.</span>
            ) : (
              subcontractors.map((s) => {
                const checked = selectedSubIds.includes(s.id);
                return (
                  <div key={s.id} className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none text-foreground flex-1 min-w-0">
                      <input type="checkbox" checked={checked} onChange={() => toggleSub(s.id)} className="h-3.5 w-3.5 rounded border-input accent-primary" />
                      <span className="truncate">{s.name}</span>
                    </label>
                    {checked && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">PKR</span>
                        <Input
                          type="number" min="0" placeholder="Contract price"
                          value={subPrices[s.id] ?? ''}
                          onChange={(e) => setSubPrices((p) => ({ ...p, [s.id]: e.target.value }))}
                          disabled={!isAdmin}
                          title={isAdmin ? 'Fixed contract price for the whole project' : 'Only an admin can set the contract price'}
                          className="h-7 w-32 text-xs"
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Save Assignments
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
