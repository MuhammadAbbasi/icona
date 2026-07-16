'use client';

import { useState } from 'react';
import {
  Store, Plus, Loader2, Trash2, Phone, Mail, MapPin, User, Package, StickyNote,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { createVendor, updateVendor, deleteVendor, type Vendor } from '@/app/actions/vendors';

interface FormState {
  name: string; supplies: string; contactName: string;
  phone: string; email: string; address: string; notes: string;
}

function toForm(v: Vendor | null): FormState {
  return {
    name: v?.name ?? '', supplies: v?.supplies ?? '', contactName: v?.contactName ?? '',
    phone: v?.phone ?? '', email: v?.email ?? '', address: v?.address ?? '', notes: v?.notes ?? '',
  };
}

function VendorForm({
  initial, saving, error, submitLabel, onSubmit, onCancel,
}: {
  initial: FormState; saving: boolean; error: string; submitLabel: string;
  onSubmit: (f: FormState) => void; onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-1.5">
        <Label>Vendor / Shop Name *</Label>
        <Input value={form.name} onChange={set('name')} placeholder="e.g. Al-Madina Hardware Store" />
      </div>
      <div className="space-y-1.5">
        <Label>Supplies (materials)</Label>
        <Input value={form.supplies} onChange={set('supplies')} placeholder="e.g. Cement, Steel, Bricks, Paint" />
        <p className="text-[11px] text-muted-foreground">Separate materials with commas.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Contact Person</Label>
          <Input value={form.contactName} onChange={set('contactName')} placeholder="e.g. Bilal Ahmed" />
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input value={form.phone} onChange={set('phone')} placeholder="+92 300 0000000" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={form.email} onChange={set('email')} type="email" placeholder="shop@email.com" />
        </div>
        <div className="space-y-1.5">
          <Label>Address</Label>
          <Input value={form.address} onChange={set('address')} placeholder="Market / area" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={set('notes')} rows={2} className="resize-none"
          placeholder="Payment terms, rates, reliability…" />
      </div>

      {error && <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</div>}

      <div className="flex gap-3 pt-1">
        <Button variant="outline" className="flex-1" disabled={saving} onClick={onCancel}>Cancel</Button>
        <Button className="flex-1" disabled={saving || !form.name.trim()} onClick={() => onSubmit(form)}>
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : submitLabel}
        </Button>
      </div>
    </div>
  );
}

export function VendorsManager({ initialVendors, canEdit }: { initialVendors: Vendor[]; canEdit: boolean }) {
  const [vendors, setVendors] = useState(initialVendors);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleAdd(f: FormState) {
    setSaving(true); setError('');
    const res = await createVendor(f);
    setSaving(false);
    if (!res.ok || !res.vendor) { setError(res.error ?? 'Could not save.'); return; }
    setVendors((prev) => [...prev, res.vendor!].sort((a, b) => a.name.localeCompare(b.name)));
    setShowAdd(false);
  }

  async function handleUpdate(f: FormState) {
    if (!editing) return;
    setSaving(true); setError('');
    const res = await updateVendor(editing.id, f);
    setSaving(false);
    if (!res.ok || !res.vendor) { setError(res.error ?? 'Could not save.'); return; }
    setVendors((prev) => prev.map((v) => (v.id === res.vendor!.id ? res.vendor! : v)).sort((a, b) => a.name.localeCompare(b.name)));
    setEditing(null);
  }

  async function handleDelete() {
    if (!editing) return;
    setSaving(true); setError('');
    const res = await deleteVendor(editing.id);
    setSaving(false);
    if (!res.ok) { setError(res.error ?? 'Could not delete.'); return; }
    setVendors((prev) => prev.filter((v) => v.id !== editing.id));
    setEditing(null); setConfirmDelete(false);
  }

  return (
    <section className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Vendors &amp; Suppliers</h2>
          <span className="text-xs text-muted-foreground">({vendors.length})</span>
        </div>
        {canEdit && (
          <Button size="sm" variant="outline" className="gap-2" onClick={() => { setError(''); setShowAdd(true); }}>
            <Plus className="h-4 w-4" /> Add Vendor
          </Button>
        )}
      </div>

      {vendors.length === 0 ? (
        <p className="text-sm text-muted-foreground italic px-1">No vendors or suppliers yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {vendors.map((v) => (
            <Card key={v.id}
              className={cn('group transition-all', canEdit && 'cursor-pointer hover:shadow-md hover:border-primary/30')}
              onClick={canEdit ? () => { setEditing(v); setError(''); setConfirmDelete(false); } : undefined}>
              <CardContent className="p-5 space-y-2.5">
                <div className="flex items-start gap-3">
                  <span className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <Store className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">{v.name}</p>
                    {v.contactName && <p className="text-xs text-muted-foreground truncate flex items-center gap-1"><User className="h-3 w-3" />{v.contactName}</p>}
                  </div>
                </div>

                {v.supplies && (
                  <div className="flex flex-wrap gap-1">
                    {v.supplies.split(',').map((s, i) => s.trim() && (
                      <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-muted text-muted-foreground rounded px-1.5 py-0.5">
                        <Package className="h-2.5 w-2.5" />{s.trim()}
                      </span>
                    ))}
                  </div>
                )}

                <div className="space-y-1 text-xs text-muted-foreground">
                  {v.phone && <p className="flex items-center gap-1.5 truncate"><Phone className="h-3 w-3 flex-shrink-0" />{v.phone}</p>}
                  {v.email && <p className="flex items-center gap-1.5 truncate"><Mail className="h-3 w-3 flex-shrink-0" />{v.email}</p>}
                  {v.address && <p className="flex items-center gap-1.5 truncate"><MapPin className="h-3 w-3 flex-shrink-0" />{v.address}</p>}
                  {v.notes && <p className="flex items-center gap-1.5 truncate"><StickyNote className="h-3 w-3 flex-shrink-0" />{v.notes}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add */}
      <Dialog open={showAdd} onOpenChange={(o) => { setShowAdd(o); setError(''); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Store className="h-5 w-5 text-primary" /> Add Vendor / Supplier</DialogTitle></DialogHeader>
          <VendorForm initial={toForm(null)} saving={saving} error={error} submitLabel="Add Vendor" onSubmit={handleAdd} onCancel={() => setShowAdd(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) { setEditing(null); setConfirmDelete(false); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Store className="h-5 w-5 text-primary" /> Edit Vendor</DialogTitle></DialogHeader>
          {editing && (
            <>
              <VendorForm initial={toForm(editing)} saving={saving} error={error} submitLabel="Save Changes" onSubmit={handleUpdate} onCancel={() => setEditing(null)} />
              <div className="mt-4 pt-4 border-t border-destructive/20">
                {!confirmDelete ? (
                  <Button variant="outline" className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="h-4 w-4" /> Delete Vendor
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Delete <span className="font-semibold text-foreground">{editing.name}</span>? This cannot be undone.</p>
                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1" disabled={saving} onClick={() => setConfirmDelete(false)}>Cancel</Button>
                      <Button variant="destructive" className="flex-1" disabled={saving} onClick={handleDelete}>
                        {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting…</> : 'Delete'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
