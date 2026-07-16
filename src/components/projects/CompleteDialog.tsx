'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, CalendarCheck, Clock, AlertTriangle, Ruler, Calculator } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatPKR } from '@/lib/utils';

function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

export interface CompletionData {
  completedAt: string;             // YYYY-MM-DD
  loggedHours: number | null;
  completeSubtasks: boolean;       // also mark remaining subtasks complete (tasks only)
  completedQuantity?: number | null; // subtasks: how much of the total quantity was done
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  itemType: 'task' | 'subtask';
  title: string;
  initialDate?: string | null;
  initialHours?: number | null;
  /** Number of still-incomplete subtasks (tasks only). */
  pendingSubtasks?: number;
  /** The subtask's fixed BOQ figures — shown read-only; quantity is the constant total to deliver. */
  unit?: string | null;
  quantity?: number | null;
  rate?: number | null;
  /** How much has already been completed (for re-opening a partially-done line). */
  completedQuantity?: number | null;
  onConfirm: (data: CompletionData) => Promise<void> | void;
}

export function CompleteDialog({
  open, onOpenChange, itemType, title, initialDate, initialHours, pendingSubtasks = 0,
  unit, quantity, rate, completedQuantity, onConfirm,
}: Props) {
  const total = quantity ?? 0;
  // Partial-completion tracking only applies to a priced line with a real quantity.
  const hasMeasure = itemType === 'subtask' && quantity != null && quantity > 0;

  const [date, setDate]   = useState(initialDate ?? todayISO());
  const [hours, setHours] = useState(initialHours != null ? String(initialHours) : '');
  const [alsoSubtasks, setAlsoSubtasks] = useState(true);
  const [doneInput, setDoneInput] = useState(
    completedQuantity != null ? String(completedQuantity) : (quantity != null ? String(quantity) : ''),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const showSubtaskWarning = itemType === 'task' && pendingSubtasks > 0;
  const doneNum = parseFloat(doneInput) || 0;
  const remaining = Math.max(0, total - doneNum);
  const earned = doneNum * (rate ?? 0);
  const fullyDone = !hasMeasure || doneNum >= total;

  useEffect(() => {
    if (!open) return;
    setDate(initialDate ?? todayISO());
    setHours(initialHours != null ? String(initialHours) : '');
    setDoneInput(completedQuantity != null ? String(completedQuantity) : (quantity != null ? String(quantity) : ''));
    setAlsoSubtasks(true);
    setError('');
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function confirm() {
    if (!date) { setError('Please pick a date.'); return; }
    if (hasMeasure && doneNum > total) { setError(`Completed quantity cannot exceed the total of ${total} ${unit ?? ''}.`); return; }
    setSaving(true); setError('');
    try {
      await onConfirm({
        completedAt: date,
        loggedHours: hours.trim() ? parseFloat(hours) : null,
        completeSubtasks: showSubtaskWarning && alsoSubtasks,
        ...(hasMeasure && { completedQuantity: doneNum }),
      });
      onOpenChange(false);
    } catch {
      setError('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            {hasMeasure ? 'Record progress' : `Complete ${itemType}`}
          </DialogTitle>
          <DialogDescription className="text-sm font-medium text-foreground/80 mt-0.5 line-clamp-2">
            {title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {hasMeasure && (
            <div className="space-y-2 rounded-lg border border-border/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Ruler className="h-3.5 w-3.5" /> Quantity Completed
              </p>
              {/* The BOQ total + rate are fixed (contracted) — shown for reference, not editable here. */}
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Total ({unit ?? 'qty'})</Label>
                  <Input value={total} disabled className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cmp-done" className="text-xs">Completed</Label>
                  <Input id="cmp-done" type="number" min="0" max={total} step="0.01" value={doneInput}
                    onChange={(e) => { setDoneInput(e.target.value); setError(''); }} placeholder="0" className="h-9" autoFocus />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Remaining</Label>
                  <Input value={remaining} disabled className="h-9" />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md bg-primary/5 border border-primary/15 px-3 py-1.5">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Calculator className="h-3 w-3" /> Value done</span>
                <span className="text-sm font-bold text-foreground">{formatPKR(earned)}</span>
              </div>
              {!fullyDone && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3" />
                  Partial: {remaining} {unit ?? ''} still remaining — the line stays open so the rest can be logged later.
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="finish-date" className="flex items-center gap-1.5">
              <CalendarCheck className="h-3.5 w-3.5 text-muted-foreground" /> {fullyDone ? 'Finish date *' : 'As-of date *'}
            </Label>
            <Input
              id="finish-date" type="date" value={date} max={todayISO()}
              onChange={(e) => { setDate(e.target.value); setError(''); }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="logged-hours" className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Time logged (hours)
            </Label>
            <Input
              id="logged-hours" type="number" min="0" step="0.25" value={hours}
              onChange={(e) => { setHours(e.target.value); setError(''); }}
              placeholder="e.g. 4.5 (optional)"
            />
          </div>

          {showSubtaskWarning && (
            <div className="rounded-lg border border-amber-300/50 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-900/15 px-3 py-2.5 space-y-2">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                {pendingSubtasks} subtask{pendingSubtasks > 1 ? 's are' : ' is'} still incomplete.
              </p>
              <label className="flex items-center gap-2 text-sm text-foreground/90 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={alsoSubtasks}
                  onChange={(e) => setAlsoSubtasks(e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-emerald-500"
                />
                Mark all remaining subtasks complete too
              </label>
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1" disabled={saving}>
              Cancel
            </Button>
            <Button onClick={confirm} disabled={saving} className="flex-1">
              {saving
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                : fullyDone
                ? <><CheckCircle2 className="h-4 w-4" /> Mark Complete</>
                : <><CheckCircle2 className="h-4 w-4" /> Save Progress</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
