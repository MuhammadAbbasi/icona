'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  HardHat, Plus, Pencil, Trash2, Loader2, Phone, Wallet, 
  AlertTriangle, Users, ToggleLeft, ToggleRight, CheckCircle, Check, X
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { createWorker, updateWorker, deleteWorker } from '@/app/actions/workers';
import { formatPKR } from '@/lib/utils';
import type { WorkerAlert } from '@/app/actions/workers';

interface Worker {
  id: string;
  name: string;
  role: string | null;
  phone: string | null;
  notes?: string | null;
  dailyWage: number;
  status: string;
  teamId: string | null;
  team?: { id: string; name: string } | null;
}

interface TeamOption {
  id: string;
  name: string;
}

interface Props {
  initialLabours: Worker[];
  teams: TeamOption[];
  initialAlerts: WorkerAlert[];
}

export function LaboursManager({ initialLabours, teams, initialAlerts }: Props) {
  const router = useRouter();
  const [labours, setLabours] = useState<Worker[]>(initialLabours);
  const [alerts, setAlerts] = useState<WorkerAlert[]>(initialAlerts);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLabour, setEditingLabour] = useState<Worker | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const handleOpen = () => openCreate();
    window.addEventListener('open-add-labour', handleOpen);
    return () => window.removeEventListener('open-add-labour', handleOpen);
  }, []);

  // Form states
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [dailyWage, setDailyWage] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [teamId, setTeamId] = useState('none');
  const [newTeamName, setNewTeamName] = useState('');

  function openCreate() {
    setEditingLabour(null);
    setName('');
    setRole('');
    setPhone('');
    setNotes('');
    setDailyWage('0');
    setStatus('ACTIVE');
    setTeamId('none');
    setNewTeamName('');
    setError('');
    setModalOpen(true);
  }

  function openEdit(w: Worker) {
    setEditingLabour(w);
    setName(w.name);
    setRole(w.role || '');
    setPhone(w.phone || '');
    setNotes(w.notes || '');
    setDailyWage(String(w.dailyWage));
    setStatus(w.status);
    setTeamId(w.teamId || 'none');
    setNewTeamName('');
    setError('');
    setModalOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('Labour name is required.');
      return;
    }
    const wageNum = parseFloat(dailyWage);
    if (isNaN(wageNum) || wageNum < 0) {
      setError('Daily wage must be a non-negative number.');
      return;
    }
    if (teamId === 'create_new' && !newTeamName.trim()) {
      setError('Please provide a new team name.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        name: name.trim(),
        role: role.trim() || null,
        phone: phone.trim() || null,
        notes: notes.trim() || null,
        dailyWage: wageNum,
        status,
        teamId: teamId === 'none' ? null : teamId,
        newTeamName: teamId === 'create_new' ? newTeamName.trim() : null,
      };

      if (editingLabour) {
        const res = await updateWorker(editingLabour.id, payload);
        if (res.ok && res.worker) {
          const updated = {
            ...res.worker,
            team: teams.find(t => t.id === res.worker?.teamId) || null
          } as any;
          
          setLabours(prev => prev.map(x => x.id === editingLabour.id ? updated : x));
          setModalOpen(false);
          // Refresh alerts
          router.refresh();
        } else {
          setError(res.error || 'Could not update labourer details.');
        }
      } else {
        const res = await createWorker(payload);
        if (res.ok && res.worker) {
          const created = {
            ...res.worker,
            team: teams.find(t => t.id === res.worker?.teamId) || null
          } as any;
          setLabours(prev => [...prev, created]);
          setModalOpen(false);
          router.refresh();
        } else {
          setError(res.error || 'Could not create labourer profile.');
        }
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(workerId: string, newStatus: string) {
    try {
      const res = await updateWorker(workerId, { status: newStatus });
      if (res.ok) {
        setLabours(prev => prev.map(w => w.id === workerId ? { ...w, status: newStatus } : w));
        setAlerts(prev => prev.filter(a => a.workerId !== workerId));
        startTransition(() => {
          router.refresh();
        });
      }
    } catch {
      alert('Could not update status.');
    }
  }

  async function handleDelete(workerId: string, name: string) {
    if (!confirm(`CAUTION: Permanently delete labourer "${name}"? This deletes their profile and all attendance records. This cannot be undone.`)) return;
    try {
      const res = await deleteWorker(workerId);
      if (res.ok) {
        setLabours(prev => prev.filter(w => w.id !== workerId));
        setAlerts(prev => prev.filter(a => a.workerId !== workerId));
        startTransition(() => {
          router.refresh();
        });
      }
    } catch {
      alert('Could not delete laborer profile.');
    }
  }

  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <HardHat className="h-5 w-5 text-violet-500" />
              Labours Directory
            </h2>
            <p className="text-xs text-muted-foreground">Manage project-based daily wage workers, site laborers, and team allocations.</p>
          </div>
          <Button onClick={openCreate} className="gap-1.5 h-9 bg-violet-600 hover:bg-violet-700 text-white text-xs">
            <Plus className="h-4 w-4" /> Add Labourer
          </Button>
        </div>

        {/* Warnings & Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" /> Inactivity &amp; Alignment Alerts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {alerts.map((alert) => (
                <div 
                  key={`${alert.workerId}-${alert.type}`}
                  className="flex items-start justify-between gap-3 p-3 border border-amber-300/40 bg-amber-500/5 dark:border-amber-500/20 dark:bg-amber-900/10 rounded-xl text-xs"
                >
                  <div className="space-y-1">
                    <span className="font-semibold text-foreground">{alert.name}</span>
                    {alert.role && <span className="text-muted-foreground font-normal"> ({alert.role})</span>}
                    {alert.type === 'INACTIVE_7_DAYS' ? (
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-normal">
                        Active laborer has not logged attendance for <strong>{alert.daysSinceLastLog} days</strong>.
                      </p>
                    ) : (
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-normal">
                        Inactive laborer is assigned to ongoing project <strong>{alert.projectName}</strong>.
                      </p>
                    )}
                  </div>
                  
                  {alert.type === 'INACTIVE_7_DAYS' ? (
                    <Button 
                      size="sm" 
                      onClick={() => handleStatusChange(alert.workerId, 'INACTIVE')} 
                      className="bg-amber-600 hover:bg-amber-700 text-white h-7 text-[11px] px-2 rounded-lg flex-shrink-0"
                    >
                      Mark Inactive
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      onClick={() => handleStatusChange(alert.workerId, 'ACTIVE')} 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-[11px] px-2 rounded-lg flex-shrink-0"
                    >
                      Mark Active
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Directory Table */}
        <div className="overflow-x-auto border border-border/60 rounded-xl">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-muted/40 border-b border-border/50 text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
              <tr>
                <th className="p-3.5">Labourer</th>
                <th className="p-3.5">Assigned Team</th>
                <th className="p-3.5 text-right">Daily Wage</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {labours.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-muted-foreground italic">
                    No laborers registered. Click "Add Labourer" to register.
                  </td>
                </tr>
              ) : (
                labours.map((w) => (
                  <tr key={w.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3.5">
                      <div className="font-semibold text-foreground text-sm">{w.name}</div>
                      <div className="text-xs text-muted-foreground font-normal flex items-center gap-1.5 mt-0.5">
                        <span>{w.role || 'General Labourer'}</span>
                        {w.phone && (
                          <>
                            <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                            <span className="flex items-center gap-0.5"><Phone className="h-3 w-3" /> {w.phone}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 font-medium text-foreground/80">
                      {w.team ? (
                        <span className="inline-flex items-center gap-1 bg-violet-50 text-violet-700 dark:bg-violet-950/20 dark:text-violet-400 px-2 py-0.5 rounded-full font-semibold">
                          <Users className="h-3 w-3" />
                          {w.team.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic font-normal">Unassigned</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right font-bold text-foreground tabular-nums">{formatPKR(w.dailyWage)}</td>
                    <td className="p-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        w.status === 'ACTIVE' 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400' 
                          : 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-400'
                      }`}>
                        {w.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(w)}
                          title="Edit Details"
                          className="p-1.5 rounded hover:bg-violet-50 text-muted-foreground hover:text-violet-600 dark:hover:bg-violet-950/30 transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleStatusChange(w.id, w.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}
                          title={w.status === 'ACTIVE' ? 'Deactivate Labourer' : 'Activate Labourer'}
                          className="p-1.5 rounded hover:bg-slate-100 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {w.status === 'ACTIVE' ? <ToggleRight className="h-4 w-4 text-emerald-500" /> : <ToggleLeft className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(w.id, w.name)}
                          title="Delete worker profile"
                          className="p-1.5 rounded hover:bg-rose-50 text-muted-foreground hover:text-rose-600 dark:hover:bg-rose-950/20 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        <Dialog open={modalOpen} onOpenChange={(v) => { if (!saving) setModalOpen(v); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HardHat className="h-5 w-5 text-violet-500" />
                {editingLabour ? 'Edit Labourer details' : 'Register Labourer'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Provide profile and daily wage rate for project allocation.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-1">
              <div className="space-y-1">
                <Label htmlFor="l-name">Labourer Name *</Label>
                <Input id="l-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Asif Ali" className="h-9" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="l-role">Role / Trade</Label>
                  <Input id="l-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Mason" className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="l-phone">Phone</Label>
                  <Input id="l-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0300..." className="h-9" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="l-wage">Daily Wage (PKR) *</Label>
                  <Input id="l-wage" type="number" min="0" value={dailyWage} onChange={(e) => setDailyWage(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="l-status">Status</Label>
                  <select
                    id="l-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="l-team">Allocated Team</Label>
                <select
                  id="l-team"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="none">Unassigned / None</option>
                  <option value="create_new">Create New Team...</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {teamId === 'create_new' && (
                <div className="space-y-1 bg-violet-50/50 dark:bg-violet-950/10 border border-violet-200/50 dark:border-violet-800/30 rounded-lg p-3">
                  <Label htmlFor="l-new-team">New Team Name *</Label>
                  <Input 
                    id="l-new-team" 
                    value={newTeamName} 
                    onChange={(e) => setNewTeamName(e.target.value)} 
                    placeholder="e.g. Mason Team A" 
                    className="h-8 text-xs bg-background mt-1" 
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="l-notes">Notes</Label>
                <Textarea id="l-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Skills, tags, bank details..." rows={2} className="resize-none" />
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
                  {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Save Labourer'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
