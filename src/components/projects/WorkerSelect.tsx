'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Search, UserPlus, X, HardHat } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { searchWorkers, createWorker, type WorkerOption } from '@/app/actions/workers';

interface Props {
  value: WorkerOption | null;
  onChange: (w: WorkerOption | null) => void;
}

function meta(w: { role: string | null; phone: string | null }) {
  return [w.role, w.phone].filter(Boolean).join(' · ');
}

export function WorkerSelect({ value, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WorkerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', role: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced search (skipped once a worker is chosen).
  useEffect(() => {
    if (value) return;
    let active = true;
    setLoading(true);
    const t = setTimeout(async () => {
      const r = await searchWorkers(query);
      if (active) { setResults(r); setLoading(false); }
    }, 250);
    return () => { active = false; clearTimeout(t); };
  }, [query, value]);

  // Close on outside click.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) { setOpen(false); setAdding(false); }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  function select(w: WorkerOption) {
    onChange(w); setOpen(false); setAdding(false); setQuery('');
  }

  function startAdd() {
    setForm({ name: query.trim(), role: '', phone: '' });
    setErr(''); setAdding(true);
  }

  async function saveNew() {
    if (!form.name.trim()) { setErr('Name is required'); return; }
    setSaving(true); setErr('');
    const res = await createWorker({ name: form.name, role: form.role || null, phone: form.phone || null });
    setSaving(false);
    if (!res.ok || !res.worker) { setErr(res.error ?? 'Could not add'); return; }
    select(res.worker);
  }

  const exact = results.some((w) => w.name.toLowerCase() === query.trim().toLowerCase());

  // Selected state — chip with clear.
  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2">
        <span className="flex items-center gap-2 min-w-0">
          <HardHat className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="min-w-0">
            <span className="block text-sm font-medium truncate">{value.name}</span>
            {meta(value) && <span className="block text-[11px] text-muted-foreground truncate">{meta(value)}</span>}
          </span>
        </span>
        <button type="button" onClick={() => { onChange(null); setQuery(''); setOpen(true); }}
          className="text-muted-foreground hover:text-destructive flex-shrink-0" title="Change">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={boxRef}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search worker / supervisor…"
          className="pl-8"
        />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover text-popover-foreground shadow-md overflow-hidden">
          {!adding ? (
            <div className="max-h-56 overflow-y-auto py-1">
              {loading && (
                <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
                </div>
              )}
              {!loading && results.map((w) => (
                <button type="button" key={w.id} onClick={() => select(w)}
                  className="w-full text-left px-3 py-2 hover:bg-muted/60 flex items-center gap-2">
                  <HardHat className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm truncate">{w.name}</span>
                    {meta(w) && <span className="block text-[11px] text-muted-foreground truncate">{meta(w)}</span>}
                  </span>
                </button>
              ))}
              {!loading && !results.length && !query.trim() && (
                <div className="px-3 py-2 text-xs text-muted-foreground">Type a name to search, or add a new one.</div>
              )}
              {!loading && query.trim() && !exact && (
                <button type="button" onClick={startAdd}
                  className="w-full text-left px-3 py-2 hover:bg-primary/5 text-primary flex items-center gap-2 border-t border-border/60">
                  <UserPlus className="h-3.5 w-3.5 flex-shrink-0" /> Add “{query.trim()}” as new worker/supervisor
                </button>
              )}
            </div>
          ) : (
            <div className="p-3 space-y-2">
              <p className="text-xs font-semibold text-foreground">New worker / supervisor</p>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Name *" autoFocus />
              <div className="grid grid-cols-2 gap-2">
                <Input value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} placeholder="Role (e.g. Mason)" />
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="Phone" />
              </div>
              {err && <p className="text-[11px] text-destructive">{err}</p>}
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setAdding(false)} disabled={saving}>Back</Button>
                <Button type="button" size="sm" className="flex-1" onClick={saveNew} disabled={saving}>
                  {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Adding…</> : 'Add & select'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
