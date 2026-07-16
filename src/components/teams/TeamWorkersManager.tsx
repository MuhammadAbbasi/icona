'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Loader2, HardHat, Phone, Users, Wallet, Calendar, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { createWorker, updateWorker, deleteWorker } from '@/app/actions/workers';
import { formatPKR } from '@/lib/utils';

interface Worker {
  id: string;
  name: string;
  role: string | null;
  phone: string | null;
  notes?: string | null;
  dailyWage: number;
}

interface Props {
  teamId: string;
  initialWorkers: Worker[];
  canEdit: boolean;
}

export function TeamWorkersManager({ teamId, initialWorkers, canEdit }: Props) {
  const router = useRouter();
  const [workers, setWorkers] = useState<Worker[]>(initialWorkers);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [dailyWage, setDailyWage] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [showWageEffectiveDate, setShowWageEffectiveDate] = useState(false);

  function openCreate() {
    setEditingWorker(null);
    setName('');
    setRole('');
    setPhone('');
    setNotes('');
    setDailyWage('0');
    setEffectiveDate('');
    setShowWageEffectiveDate(false);
    setError('');
    setModalOpen(true);
  }

  function openEdit(w: Worker) {
    setEditingWorker(w);
    setName(w.name);
    setRole(w.role || '');
    setPhone(w.phone || '');
    setNotes(w.notes || '');
    setDailyWage(String(w.dailyWage));
    setEffectiveDate('');
    setShowWageEffectiveDate(false);
    setError('');
    setModalOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('Worker name is required.');
      return;
    }
    const wageNum = parseFloat(dailyWage);
    if (isNaN(wageNum) || wageNum < 0) {
      setError('Daily wage must be a non-negative number.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (editingWorker) {
        // Edit worker
        const isWageChanged = wageNum !== editingWorker.dailyWage;
        const res = await updateWorker(editingWorker.id, {
          name: name.trim(),
          role: role.trim() || null,
          phone: phone.trim() || null,
          notes: notes.trim() || null,
          dailyWage: wageNum,
          teamId,
          ...(isWageChanged && effectiveDate && { effectiveDate }),
        });

        if (res.ok && res.worker) {
          setWorkers((prev) =>
            prev.map((x) => (x.id === editingWorker.id ? (res.worker as any) : x))
          );
          setModalOpen(false);
          router.refresh();
        } else {
          setError(res.error || 'Could not save worker details.');
        }
      } else {
        // Create worker
        const res = await createWorker({
          name: name.trim(),
          role: role.trim() || null,
          phone: phone.trim() || null,
          notes: notes.trim() || null,
          dailyWage: wageNum,
          teamId,
        });

        if (res.ok && res.worker) {
          setWorkers((prev) => [...prev, res.worker as any]);
          setModalOpen(false);
          router.refresh();
        } else {
          setError(res.error || 'Could not create worker profile.');
        }
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveFromTeam(workerId: string) {
    if (!confirm('Remove this worker from this team? They will be unassigned but their profile will remain.')) return;
    try {
      const res = await updateWorker(workerId, { teamId: 'none' });
      if (res.ok) {
        setWorkers((prev) => prev.filter((w) => w.id !== workerId));
        router.refresh();
      }
    } catch {
      alert('Could not remove worker from team.');
    }
  }

  async function handleDeleteWorker(workerId: string, name: string) {
    if (!confirm(`CAUTION: Permanently delete worker "${name}"? This deletes their profile and all attendance records. This cannot be undone.`)) return;
    try {
      const res = await deleteWorker(workerId);
      if (res.ok) {
        setWorkers((prev) => prev.filter((w) => w.id !== workerId));
        router.refresh();
      }
    } catch {
      alert('Could not delete worker profile.');
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <HardHat className="h-4.5 w-4.5 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground font-medium">Team Workers &amp; Laborers</h3>
          <span className="text-xs text-muted-foreground">({workers.length})</span>
        </div>
        {canEdit && (
          <Button size="sm" onClick={openCreate} className="gap-1.5 h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white">
            <Plus className="h-3.5 w-3.5" /> New Worker
          </Button>
        )}
      </div>

      {workers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-28 text-center rounded-xl border border-dashed border-border/80 bg-muted/5">
          <HardHat className="h-7 w-7 text-muted-foreground/30 mb-1.5" />
          <p className="text-xs text-muted-foreground">No workers assigned to this team.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {workers.map((w) => (
            <Card key={w.id} className="hover:shadow-sm transition-shadow border-border/70">
              <CardContent className="p-4 space-y-3 relative">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                      <HardHat className="h-4 w-4 text-violet-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{w.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{w.role || 'Laborer'}</p>
                    </div>
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-1.5 z-10">
                      <button
                        onClick={() => openEdit(w)}
                        title="Edit profile &amp; rates"
                        className="p-1 rounded text-muted-foreground hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemoveFromTeam(w.id)}
                        title="Remove from Team"
                        className="p-1 rounded text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteWorker(w.id, w.name)}
                        title="Delete permanently"
                        className="p-1 rounded text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1 border-t border-border/50">
                  <div className="flex items-center gap-1">
                    <Wallet className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-semibold text-foreground text-xs">{formatPKR(w.dailyWage)}/day</span>
                  </div>
                  {w.phone && (
                    <div className="flex items-center gap-1 min-w-0">
                      <Phone className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{w.phone}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Save Modal */}
      <Dialog open={modalOpen} onOpenChange={(v) => { if (!saving) setModalOpen(v); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HardHat className="h-5 w-5 text-violet-500" />
              {editingWorker ? 'Edit Worker Profile' : 'Add Team Worker'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editingWorker ? 'Modify profile and adjust wage rates.' : 'Register a worker and assign them to this team.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <div className="space-y-1">
              <Label htmlFor="w-name">Worker Name *</Label>
              <Input id="w-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Asif Ali" className="h-9" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="w-role">Role / Trade</Label>
                <Input id="w-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Mason" className="h-9" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="w-phone">Phone</Label>
                <Input id="w-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0300..." className="h-9" />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="w-wage">Daily Wage (PKR) *</Label>
              <Input
                id="w-wage"
                type="number"
                min="0"
                value={dailyWage}
                onChange={(e) => {
                  setDailyWage(e.target.value);
                  setError('');
                  if (editingWorker && parseFloat(e.target.value) !== editingWorker.dailyWage) {
                    setShowWageEffectiveDate(true);
                  } else {
                    setShowWageEffectiveDate(false);
                  }
                }}
                className="h-9"
              />
            </div>

            {showWageEffectiveDate && (
              <div className="rounded-lg border border-amber-300/40 bg-amber-50/20 dark:border-amber-500/20 dark:bg-amber-900/10 p-3 space-y-2">
                <p className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <strong>Daily rate adjusted!</strong> Choose effective start date:
                </p>
                <div className="space-y-1">
                  <Input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="h-8 text-xs bg-background"
                  />
                  <p className="text-[10px] text-muted-foreground leading-normal mt-1">
                    Past attendance logs on or after this date will be updated to the new wage of PKR {parseFloat(dailyWage).toLocaleString()}. Leave empty to only apply for future attendance logs.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="w-notes">Notes</Label>
              <Textarea id="w-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Skills, tags, bank details..." rows={2} className="resize-none" />
            </div>

            {error && (
              <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-2.5">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setModalOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Save Worker'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
