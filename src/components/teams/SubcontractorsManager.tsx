'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HardHat, Plus, Pencil, Trash2, Loader2, Phone, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createSubcontractor, updateSubcontractor, deleteSubcontractor } from '@/app/actions/subcontractors';

interface SubMember { id: string; name: string; role: string | null }
export interface SubRow {
  id: string; name: string; contactName: string | null; phone: string | null; email: string | null;
  address: string | null; notes: string | null; maxMembers: number | null; status: string; members: SubMember[];
}

interface Props { initial: SubRow[]; canDelete: boolean }

export function SubcontractorsManager({ initial, canDelete }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SubRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [f, setF] = useState({ name: '', contactName: '', phone: '', email: '', maxMembers: '', notes: '', members: '' });

  function openCreate() {
    setEditing(null);
    setF({ name: '', contactName: '', phone: '', email: '', maxMembers: '', notes: '', members: '' });
    setError(''); setOpen(true);
  }
  function openEdit(s: SubRow) {
    setEditing(s);
    setF({
      name: s.name, contactName: s.contactName || '', phone: s.phone || '', email: s.email || '',
      maxMembers: s.maxMembers != null ? String(s.maxMembers) : '', notes: s.notes || '',
      members: s.members.map((m) => m.name).join('\n'),
    });
    setError(''); setOpen(true);
  }

  async function save() {
    if (!f.name.trim()) { setError('Name is required.'); return; }
    setSaving(true); setError('');
    const input = {
      name: f.name.trim(), contactName: f.contactName || null, phone: f.phone || null, email: f.email || null,
      maxMembers: f.maxMembers ? parseInt(f.maxMembers, 10) : null, notes: f.notes || null,
      memberNames: f.members.split('\n').map((x) => x.trim()).filter(Boolean),
    };
    const res = editing ? await updateSubcontractor(editing.id, input) : await createSubcontractor(input);
    setSaving(false);
    if (res.ok) { setOpen(false); router.refresh(); } else setError(res.error || 'Save failed');
  }

  async function remove(s: SubRow) {
    if (!confirm(`Delete subcontractor "${s.name}"?`)) return;
    const res = await deleteSubcontractor(s.id);
    if (res.ok) router.refresh(); else alert(res.error || 'Delete failed');
  }

  return (
    <div className="rounded-xl border bg-card mt-6">
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <div className="flex items-center gap-2">
          <HardHat className="h-5 w-5 text-amber-500" />
          <h2 className="font-semibold text-sm">Subcontractors</h2>
          <span className="text-xs text-muted-foreground">({initial.length})</span>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" /> Add Subcontractor</Button>
      </div>

      {initial.length === 0 ? (
        <p className="text-sm text-muted-foreground px-5 py-6">No subcontractors yet. Add one to track their crew headcount and payments per project.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
          {initial.map((s) => (
            <div key={s.id} className="rounded-lg border p-3 bg-card hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{s.name}</p>
                  {s.contactName && <p className="text-xs text-muted-foreground truncate">{s.contactName}</p>}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(s)} className="p-1 text-muted-foreground hover:text-primary" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                  {canDelete && <button onClick={() => remove(s)} className="p-1 text-muted-foreground hover:text-destructive" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                {s.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {s.phone}</span>}
                <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {s.members.length ? `${s.members.length} named` : s.maxMembers ? `max ${s.maxMembers}` : 'crew'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><HardHat className="h-5 w-5 text-amber-500" /> {editing ? 'Edit Subcontractor' : 'Add Subcontractor'}</DialogTitle>
            <DialogDescription>Track a subcontractor crew: contact, cap on members, and (optionally) named members.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5"><Label>Name *</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Al-Hamd Electricals" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Contact person</Label><Input value={f.contactName} onChange={(e) => setF({ ...f, contactName: e.target.value })} placeholder="Card holder" /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Email</Label><Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Max members</Label><Input type="number" min="0" value={f.maxMembers} onChange={(e) => setF({ ...f, maxMembers: e.target.value })} placeholder="e.g. 10" /></div>
            </div>
            <div className="space-y-1.5">
              <Label>Named members <span className="text-muted-foreground font-normal">(optional, one per line)</span></Label>
              <Textarea rows={3} value={f.members} onChange={(e) => setF({ ...f, members: e.target.value })} placeholder={'Asif\nBilal\n…'} className="resize-none text-sm" />
            </div>
            <div className="space-y-1.5"><Label>Notes</Label><Input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Save'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
