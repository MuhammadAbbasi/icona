'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Plus, Trash2, Loader2, Users, FolderKanban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CompanyRow {
  id: string;
  name: string;
  type: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  _count: { users: number; projects: number };
}

const TYPE_BADGE: Record<string, 'default' | 'info' | 'secondary'> = {
  MAIN: 'default',
  CLIENT: 'info',
  FREELANCER: 'secondary',
};

const EMPTY_FORM = { name: '', type: 'CLIENT', email: '', phone: '', address: '', website: '' };

export function CompaniesManager({ initialCompanies, isAdmin }: { initialCompanies: CompanyRow[]; isAdmin: boolean }) {
  const router = useRouter();
  const [companies, setCompanies] = useState(initialCompanies);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create company');
      setCompanies((c) => [...c, { ...data, _count: { users: 0, projects: 0 } }].sort((a, b) => a.name.localeCompare(b.name)));
      setForm(EMPTY_FORM);
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this company? Its users and projects keep existing but lose the link.')) return;
    setDeletingId(id);
    const res = await fetch(`/api/companies/${id}`, { method: 'DELETE' });
    if (res.ok) setCompanies((c) => c.filter((x) => x.id !== id));
    setDeletingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Company
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {companies.map((c) => (
          <Card key={c.id} className="p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <Link href={`/companies/${c.id}`} className="flex items-center gap-3 min-w-0">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold hover:underline">{c.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{c.email || c.phone || '-'}</span>
                </span>
              </Link>
              <Badge variant={TYPE_BADGE[c.type] ?? 'secondary'}>{c.type}</Badge>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {c._count.users}</span>
                <span className="inline-flex items-center gap-1"><FolderKanban className="h-3.5 w-3.5" /> {c._count.projects}</span>
              </span>
              {isAdmin && c.type !== 'MAIN' && (
                <button
                  onClick={() => remove(c.id)}
                  disabled={deletingId === c.id}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  aria-label={`Delete ${c.name}`}
                >
                  {deletingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              )}
            </div>
          </Card>
        ))}
        {companies.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-muted-foreground">No companies yet.</p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Company</DialogTitle>
          </DialogHeader>
          <form onSubmit={create} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Name</Label>
              <Input id="c-name" value={form.name} onChange={set('name')} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-type">Type</Label>
              <select
                id="c-type"
                value={form.type}
                onChange={set('type')}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="CLIENT">Client</option>
                <option value="FREELANCER">Freelancer / Subcontractor</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="c-email">Email</Label>
                <Input id="c-email" type="email" value={form.email} onChange={set('email')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-phone">Phone</Label>
                <Input id="c-phone" value={form.phone} onChange={set('phone')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-address">Address</Label>
              <Input id="c-address" value={form.address} onChange={set('address')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-website">Website</Label>
              <Input id="c-website" value={form.website} onChange={set('website')} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Saving…</> : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
