'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Ruler, Plus, Trash2, Loader2, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { computeMeasurement } from '@/lib/measurements';

interface Row {
  description: string;
  no: string;
  length: string;
  width: string;
  height: string;
}

interface Props {
  targetType: 'subtask' | 'task';
  targetId: string;
  unit?: string | null;
  /** The current effective/imported quantity to compare the measured sum against. */
  importedQty?: number | null;
  canEdit: boolean;
}

function emptyRow(): Row {
  return { description: '', no: '', length: '', width: '', height: '' };
}

function trim(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(3)));
}

export function MeasurementsEditor({ targetType, targetId, unit, importedQty, canEdit }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);

  const query = targetType === 'subtask' ? `subtaskId=${targetId}` : `taskId=${targetId}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/measurements?${query}`);
      if (res.ok) {
        const data = await res.json();
        setRows(
          (data.rows ?? []).map((r: any) => ({
            description: r.description ?? '',
            no: r.no != null ? String(r.no) : '',
            length: r.length != null ? String(r.length) : '',
            width: r.width != null ? String(r.width) : '',
            height: r.height != null ? String(r.height) : '',
          })),
        );
      }
    } finally {
      setLoading(false);
      setDirty(false);
    }
  }, [query]);

  useEffect(() => { load(); }, [load]);

  function update(i: number, k: keyof Row, v: string) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
    setDirty(true);
  }
  function addRow() { setRows((prev) => [...prev, emptyRow()]); setDirty(true); }
  function removeRow(i: number) { setRows((prev) => prev.filter((_, idx) => idx !== i)); setDirty(true); }

  const rowTotal = (r: Row) =>
    computeMeasurement({
      no: r.no === '' ? null : Number(r.no),
      length: r.length === '' ? null : Number(r.length),
      width: r.width === '' ? null : Number(r.width),
      height: r.height === '' ? null : Number(r.height),
    });

  const measured = rows.reduce((a, r) => a + rowTotal(r), 0);
  const measuredRounded = Math.round(measured * 1000) / 1000;
  const differs = importedQty != null && Math.abs(measuredRounded - importedQty) > 0.001;

  async function save() {
    setSaving(true); setError('');
    try {
      const body: any = { rows: rows.map((r) => ({
        description: r.description || null,
        no: r.no === '' ? null : Number(r.no),
        length: r.length === '' ? null : Number(r.length),
        width: r.width === '' ? null : Number(r.width),
        height: r.height === '' ? null : Number(r.height),
      })) };
      if (targetType === 'subtask') body.subtaskId = targetId; else body.taskId = targetId;
      const res = await fetch('/api/measurements', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Save failed');
      setDirty(false);
    } catch (e: any) {
      setError(e.message || 'Could not save measurements');
    } finally {
      setSaving(false);
    }
  }

  async function apply() {
    setApplying(true); setError('');
    try {
      if (dirty) await save();
      if (targetType === 'subtask') {
        const res = await fetch(`/api/subtasks/${targetId}/apply-measurement`, { method: 'POST' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not apply');
      } else {
        // Task-level items have no revision concept — write the quantity directly.
        const res = await fetch(`/api/tasks/${targetId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: measuredRounded }),
        });
        if (!res.ok) throw new Error('Could not apply');
      }
      router.refresh();
    } catch (e: any) {
      setError(e.message || 'Could not apply measured quantity');
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
        <Ruler className="h-3.5 w-3.5" /> Measurements {unit ? <span className="text-muted-foreground/60 normal-case">({unit})</span> : null}
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-4 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /></div>
      ) : (
        <div className="rounded-lg border border-border/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs">
              <tr className="text-left">
                <th className="px-2 py-2 font-medium">Description</th>
                <th className="px-2 py-2 font-medium w-16">No</th>
                <th className="px-2 py-2 font-medium w-20">Length</th>
                <th className="px-2 py-2 font-medium w-20">Width</th>
                <th className="px-2 py-2 font-medium w-20">Height</th>
                <th className="px-2 py-2 font-medium w-24 text-right">Total</th>
                {canEdit && <th className="w-9" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="px-1.5 py-1.5">
                    <Input value={r.description} onChange={(e) => update(i, 'description', e.target.value)} disabled={!canEdit} className="h-9 text-sm" placeholder="item" />
                  </td>
                  {(['no', 'length', 'width', 'height'] as const).map((k) => (
                    <td key={k} className="px-1.5 py-1.5">
                      <Input type="number" step="0.01" value={r[k]} onChange={(e) => update(i, k, e.target.value)} disabled={!canEdit} className="h-9 text-sm tabular-nums text-center px-1.5" />
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-right tabular-nums font-semibold">{trim(rowTotal(r))}</td>
                  {canEdit && (
                    <td className="px-1 py-1.5 text-center">
                      <button onClick={() => removeRow(i)} className="text-muted-foreground hover:text-destructive p-1" title="Remove"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  )}
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={canEdit ? 7 : 6} className="px-2 py-3 text-center text-muted-foreground text-xs">No measurement lines yet.</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-muted/30 font-semibold">
                <td className="px-2 py-2" colSpan={5}>Total {unit ? `(${unit})` : ''}</td>
                <td className="px-2 py-2 text-right tabular-nums">{trim(measuredRounded)}</td>
                {canEdit && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {canEdit && (
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addRow} className="gap-1.5 text-xs h-8">
            <Plus className="h-3.5 w-3.5" /> Add line
          </Button>
          <Button type="button" size="sm" onClick={save} disabled={saving || !dirty} className="text-xs h-8">
            {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</> : 'Save measurements'}
          </Button>
        </div>
      )}

      {/* Compare with the imported quantity and offer to apply to the latest revision. */}
      {canEdit && rows.length > 0 && importedQty != null && (
        <div className={`rounded-lg border px-3 py-2.5 text-xs ${differs ? 'border-amber-300/60 bg-amber-50/60 dark:bg-amber-900/10' : 'border-border/60 bg-muted/20'}`}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">
              Imported: <b className="tabular-nums text-foreground">{trim(importedQty)}</b> {unit || ''}
              <span className="mx-1.5">·</span>
              Measured: <b className="tabular-nums text-foreground">{trim(measuredRounded)}</b> {unit || ''}
            </span>
            {differs && (
              <Button type="button" size="sm" onClick={apply} disabled={applying} className="gap-1.5 text-xs h-8 flex-shrink-0">
                {applying ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Applying…</>
                  : <><ArrowRightLeft className="h-3.5 w-3.5" /> {targetType === 'subtask' ? 'Use in latest revision' : 'Use as quantity'}</>}
              </Button>
            )}
          </div>
          {differs && targetType === 'subtask' && (
            <p className="text-[11px] text-muted-foreground mt-1">Writes the measured quantity into the latest revision (creates Rev 1 if none). The original stays unchanged.</p>
          )}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
