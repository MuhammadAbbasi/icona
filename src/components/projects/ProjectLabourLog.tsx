'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, HardHat, Calendar, Wallet, CheckCircle,
  AlertCircle, ArrowUpRight, Banknote, ListCollapse, Trash2, Clock,
  CreditCard, X, LayoutGrid
} from 'lucide-react';
import { AttendanceGridModal } from './AttendanceGridModal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { saveAttendance, payWorker, logSiteVisit, deleteSiteVisit, type SiteVisitEntry } from '@/app/actions/workerLogs';
import { saveSubcontractorLog, paySubcontractor, type ProjectSubcontractorRow } from '@/app/actions/subcontractors';
import { formatPKR, cn } from '@/lib/utils';
import type { ProjectLabourSummary, WorkerLabourSummary } from '@/app/actions/workerLogs';

interface SubcontractorsData { engaged: ProjectSubcontractorRow[]; registry: { id: string; name: string; maxMembers: number | null }[] }

interface Props {
  projectId: string;
  summary: ProjectLabourSummary;
  teamWorkers: { id: string; name: string; role: string | null; dailyWage: number }[];
  bankAccounts: { id: string; name: string }[];
  canEdit: boolean;
  subcontractors?: SubcontractorsData;
  siteVisits?: SiteVisitEntry[];
  staffUsers?: { id: string; name: string }[];
}

function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function ProjectLabourLog({ projectId, summary, teamWorkers, bankAccounts, canEdit, subcontractors = { engaged: [], registry: [] }, siteVisits = [], staffUsers = [] }: Props) {
  const router = useRouter();
  const [date, setDate] = useState(todayISO());

  // Subcontractor crew logging
  const [subId, setSubId] = useState('');
  const [subHeadcount, setSubHeadcount] = useState('');
  const [subBusy, setSubBusy] = useState(false);
  // Subcontractor pay
  const [subPayFor, setSubPayFor] = useState<ProjectSubcontractorRow | null>(null);
  const [subPayAmount, setSubPayAmount] = useState('');
  // Site visit
  const [visitUser, setVisitUser] = useState('');
  const [visitNote, setVisitNote] = useState('');
  const [visitBusy, setVisitBusy] = useState(false);

  async function handleSaveCrew() {
    if (!subId || !subHeadcount) return;
    setSubBusy(true);
    // Contract price is fixed at assignment (Manage Assignments); here we only log headcount.
    await saveSubcontractorLog({ projectId, subcontractorId: subId, date, headcount: parseInt(subHeadcount, 10) || 0 });
    setSubBusy(false); setSubHeadcount(''); setSubId('');
    router.refresh();
  }
  async function handlePaySub() {
    if (!subPayFor || !subPayAmount) return;
    setSubBusy(true);
    await paySubcontractor({ projectId, subcontractorId: subPayFor.subcontractorId, amount: parseFloat(subPayAmount), date, paymentMethod: 'Cash' });
    setSubBusy(false); setSubPayFor(null); setSubPayAmount('');
    router.refresh();
  }
  async function handleLogVisit() {
    if (!visitUser) return;
    setVisitBusy(true);
    await logSiteVisit({ projectId, userId: visitUser, date, note: visitNote || null });
    setVisitBusy(false); setVisitUser(''); setVisitNote('');
    router.refresh();
  }
  async function handleDeleteVisit(id: string) {
    await deleteSiteVisit(id);
    router.refresh();
  }
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>(() => {
    // Default checked workers for chosen date from history if it exists
    const histEntry = summary.history.find(h => h.date === todayISO());
    return histEntry ? histEntry.workersList.map(w => w.workerId) : [];
  });
  
  const [isPending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Quick-pay modal state
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payWorkerData, setPayWorkerData] = useState<WorkerLabourSummary | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(todayISO());
  const [payMethod, setPayMethod] = useState('Cash');
  const [payBankId, setPayBankId] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payError, setPayError] = useState('');
  const [paySuccess, setPaySuccess] = useState('');
  const [payWarning, setPayWarning] = useState('');
  const [payingSaving, setPayingSaving] = useState(false);
  const [gridOpen, setGridOpen] = useState(false);

  // Handle date change: prefill checkboxes from history if already logged for that date
  function handleDateChange(newDate: string) {
    setDate(newDate);
    setError('');
    setSuccess('');
    const histEntry = summary.history.find(h => h.date === newDate);
    if (histEntry) {
      setSelectedWorkers(histEntry.workersList.map(w => w.workerId));
    } else {
      setSelectedWorkers([]);
    }
  }

  function toggleWorker(workerId: string) {
    setSelectedWorkers(prev => 
      prev.includes(workerId) ? prev.filter(id => id !== workerId) : [...prev, workerId]
    );
    setError('');
    setSuccess('');
  }

  async function handleSaveAttendance() {
    setSaving(true);
    setError('');
    setSuccess('');
    
    const res = await saveAttendance(projectId, date, selectedWorkers);
    
    setSaving(false);
    if (res.ok) {
      setSuccess(`Attendance successfully saved for ${new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}.`);
      startTransition(() => {
        router.refresh();
      });
    } else {
      setError(res.error || 'Failed to save attendance.');
    }
  }

  async function handleClearAttendance(logDate: string) {
    const formattedDate = new Date(logDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    if (!confirm(`Are you sure you want to clear all attendance logs for ${formattedDate}?`)) return;
    
    setSaving(true);
    const res = await saveAttendance(projectId, logDate, []);
    setSaving(false);
    
    if (res.ok) {
      if (date === logDate) {
        setSelectedWorkers([]);
      }
      startTransition(() => {
        router.refresh();
      });
    } else {
      alert(res.error || 'Failed to clear logs.');
    }
  }

  function openPayModal(worker: WorkerLabourSummary) {
    setPayWorkerData(worker);
    setPayAmount(worker.remaining > 0 ? String(worker.remaining) : '');
    setPayDate(todayISO());
    setPayMethod('Cash');
    setPayBankId('');
    setPayNotes('');
    setPayError('');
    setPaySuccess('');
    setPayWarning('');
    setPayModalOpen(true);
  }

  function openPayModalGeneric() {
    setPayWorkerData(null);
    setPayAmount('');
    setPayDate(todayISO());
    setPayMethod('Cash');
    setPayBankId('');
    setPayNotes('');
    setPayError('');
    setPaySuccess('');
    setPayWarning('');
    setPayModalOpen(true);
  }

  async function handlePayWorker() {
    if (!payWorkerData) return;
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) {
      setPayError('Enter a valid amount greater than zero.');
      return;
    }

    setPayingSaving(true);
    setPayError('');
    setPaySuccess('');
    setPayWarning('');

    const res = await payWorker({
      projectId,
      workerId: payWorkerData.workerId,
      amount: amt,
      date: payDate,
      paymentMethod: payMethod,
      bankAccountId: payBankId || undefined,
      notes: payNotes || undefined,
    });

    setPayingSaving(false);

    if (res.ok) {
      setPaySuccess(`PKR ${amt.toLocaleString()} paid to ${payWorkerData.name} successfully.`);
      if (res.warning) setPayWarning(res.warning);
      startTransition(() => {
        router.refresh();
      });
      // Auto-close after short delay
      setTimeout(() => setPayModalOpen(false), 1500);
    } else {
      setPayError(res.error || 'Failed to record payment.');
    }
  }

  const earned = summary.totalEarnedAmount;
  const paid = summary.totalPaidAmount;
  const remaining = summary.totalRemainingAmount;

  // All workers for the generic pay modal dropdown (team workers + workers from summary)
  const allPayableWorkers = [...summary.workers];
  for (const tw of teamWorkers) {
    if (!allPayableWorkers.find(w => w.workerId === tw.id)) {
      allPayableWorkers.push({
        workerId: tw.id,
        name: tw.name,
        role: tw.role,
        phone: null,
        dailyWage: tw.dailyWage,
        daysWorked: 0,
        totalEarned: 0,
        totalPaid: 0,
        remaining: 0,
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Workers Utilized */}
        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Workers Utilized</span>
              <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-violet-500/10">
                <HardHat className="h-4 w-4 text-violet-500" />
              </div>
            </div>
            <p className="text-xl font-bold text-foreground">{summary.totalWorkersCount}</p>
            <p className="text-[10px] text-muted-foreground">unique workers on site</p>
          </CardContent>
        </Card>

        {/* Man-Days Logged */}
        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total Man-Days</span>
              <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-indigo-500/10">
                <Calendar className="h-4 w-4 text-indigo-500" />
              </div>
            </div>
            <p className="text-xl font-bold text-foreground">{summary.totalManDays}</p>
            <p className="text-[10px] text-muted-foreground">accumulated attendance days</p>
          </CardContent>
        </Card>

        {/* Total Earned */}
        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total Earned</span>
              <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-blue-500/10">
                <Wallet className="h-4 w-4 text-blue-500" />
              </div>
            </div>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatPKR(earned)}</p>
            <p className="text-[10px] text-muted-foreground">based on daily rates</p>
          </CardContent>
        </Card>

        {/* Total Paid */}
        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total Paid</span>
              <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-emerald-500/10">
                <Banknote className="h-4 w-4 text-emerald-500" />
              </div>
            </div>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatPKR(paid)}</p>
            <p className="text-[10px] text-muted-foreground">paid as treasury expenses</p>
          </CardContent>
        </Card>

        {/* Remaining Dues */}
        <Card className={remaining > 0 ? 'border-amber-300 dark:border-amber-900/50' : ''}>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Remaining Dues</span>
              <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-amber-500/10">
                <ArrowUpRight className="h-4 w-4 text-amber-500" />
              </div>
            </div>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{formatPKR(remaining)}</p>
            <p className="text-[10px] text-muted-foreground">outstanding wage balance</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Attendance Logger */}
        <div className="space-y-4">
          <Card className="border-border/70">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                <Clock className="h-4.5 w-4.5 text-violet-500" />
                <h3 className="font-semibold text-sm text-foreground">Log Daily Attendance</h3>
              </div>

              {/* Date selection */}
              <div className="space-y-1.5">
                <Label htmlFor="log-date">Select Attendance Date</Label>
                <Input
                  id="log-date"
                  type="date"
                  value={date}
                  onChange={(e) => handleDateChange(e.target.value)}
                  max={todayISO()}
                  className="h-9"
                  disabled={saving || isPending}
                />
              </div>

              {/* Workers checklist */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Active Team Workers</Label>
                <div className="border border-border/80 bg-muted/5 rounded-lg p-3 max-h-60 overflow-y-auto space-y-2.5">
                  {teamWorkers.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      No workers associated with this project's teams yet. Set them up in the <span className="font-semibold text-foreground">Teams</span> section first.
                    </div>
                  ) : (
                    teamWorkers.map((w) => {
                      const isChecked = selectedWorkers.includes(w.id);
                      return (
                        <label
                          key={w.id}
                          className="flex items-center justify-between gap-3 text-xs font-medium cursor-pointer select-none text-foreground hover:bg-muted/30 p-1.5 rounded transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleWorker(w.id)}
                              className="h-3.5 w-3.5 rounded border-input accent-violet-600 cursor-pointer"
                              disabled={saving || isPending}
                            />
                            <div>
                              <div className="font-semibold">{w.name}</div>
                              <div className="text-[10px] text-muted-foreground">{w.role || 'Laborer'}</div>
                            </div>
                          </div>
                          <span className="text-[10px] tabular-nums text-muted-foreground">{formatPKR(w.dailyWage)}/day</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {error && (
                <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-2.5 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="text-xs text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>{success}</span>
                </div>
              )}

              {canEdit && teamWorkers.length > 0 && (
                <Button
                  onClick={handleSaveAttendance}
                  disabled={saving || isPending}
                  className="w-full h-9 bg-violet-600 hover:bg-violet-700 text-white border-transparent"
                >
                  {saving || isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Saving Logs…</>
                  ) : (
                    'Save Daily Attendance'
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Registry & History (takes 2/3 of grid space) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Worker Utilization Table */}
          <Card className="border-border/70">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4.5 w-4.5 text-violet-500" />
                  <h3 className="font-semibold text-sm text-foreground">Workers Utilization Registry</h3>
                </div>
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openPayModalGeneric}
                    className="h-7 text-xs gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                  >
                    <Banknote className="h-3.5 w-3.5" />
                    Pay Worker
                  </Button>
                )}
              </div>

              <div className="overflow-x-auto border border-border/50 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 border-b border-border/50 text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                    <tr>
                      <th className="p-3">Worker</th>
                      <th className="p-3 text-right">Rate</th>
                      <th className="p-3 text-center">Days</th>
                      <th className="p-3 text-right">Earned</th>
                      <th className="p-3 text-right">Paid</th>
                      <th className="p-3 text-right">Remaining</th>
                      {canEdit && <th className="p-3 text-center">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {summary.workers.length === 0 ? (
                      <tr>
                        <td colSpan={canEdit ? 7 : 6} className="p-8 text-center text-muted-foreground italic">
                          No workers have logged attendance on this project yet.
                        </td>
                      </tr>
                    ) : (
                      summary.workers.map((w) => (
                        <tr key={w.workerId} className="hover:bg-muted/20 transition-colors">
                          <td className="p-3 font-semibold">
                            <div className="font-semibold text-foreground">{w.name}</div>
                            <div className="text-[10px] text-muted-foreground font-normal">{w.role || 'Laborer'}</div>
                          </td>
                          <td className="p-3 text-right font-medium tabular-nums">{formatPKR(w.dailyWage)}</td>
                          <td className="p-3 text-center font-bold text-foreground tabular-nums">{w.daysWorked}</td>
                          <td className="p-3 text-right font-semibold text-blue-600 dark:text-blue-400 tabular-nums">{formatPKR(w.totalEarned)}</td>
                          <td className="p-3 text-right font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatPKR(w.totalPaid)}</td>
                          <td className="p-3 text-right font-bold tabular-nums">
                            <span className={w.remaining > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground/80'}>
                              {formatPKR(w.remaining)}
                            </span>
                          </td>
                          {canEdit && (
                            <td className="p-3 text-center">
                              {w.remaining > 0 ? (
                                <button
                                  onClick={() => openPayModal(w)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-900/40 transition-colors"
                                  title={`Pay ${w.name}`}
                                >
                                  <Banknote className="h-3 w-3" />
                                  Pay
                                </button>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">Settled</span>
                              )}
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Subcontractors & Site Visits */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Subcontractors */}
            <Card className="border-border/70">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                  <HardHat className="h-4.5 w-4.5 text-amber-500" />
                  <h3 className="font-semibold text-sm text-foreground">Subcontractors</h3>
                </div>

                {canEdit && (
                  <div className="rounded-lg border border-border/60 bg-muted/10 p-3 space-y-2">
                    <p className="text-[11px] font-semibold text-muted-foreground">Log crew for {new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                    {subcontractors.engaged.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground">Assign a subcontractor in <span className="font-medium">Manage Assignments</span> (with its contract price) to log its crew here.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 items-end">
                        <select value={subId} onChange={(e) => setSubId(e.target.value)} className="text-xs border border-border rounded-md px-2 py-1.5 bg-card flex-1 min-w-[120px]">
                          <option value="">Select subcontractor…</option>
                          {subcontractors.engaged.map((s) => <option key={s.subcontractorId} value={s.subcontractorId}>{s.name}{s.maxMembers ? ` (max ${s.maxMembers})` : ''}</option>)}
                        </select>
                        <Input type="number" min="0" placeholder="Headcount" value={subHeadcount} onChange={(e) => setSubHeadcount(e.target.value)} className="h-8 w-24 text-xs" />
                        <Button size="sm" className="h-8" onClick={handleSaveCrew} disabled={subBusy || !subId || !subHeadcount}>Log</Button>
                      </div>
                    )}
                  </div>
                )}

                {subcontractors.engaged.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-3 text-center">No subcontractors engaged yet.</p>
                ) : (
                  <div className="space-y-2">
                    {subcontractors.engaged.map((s) => (
                      <div key={s.subcontractorId} className="rounded-lg border border-border/60 p-3 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-foreground">{s.name}</span>
                          <span className="text-muted-foreground">{s.totalCrewDays} crew-days</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-2 text-[11px]">
                          <div><span className="text-muted-foreground">Contract</span><p className="font-semibold tabular-nums">{formatPKR(s.contractAmount)}</p></div>
                          <div><span className="text-muted-foreground">Paid</span><p className="font-semibold tabular-nums text-emerald-600">{formatPKR(s.paid)}</p></div>
                          <div><span className="text-muted-foreground">Remaining</span><p className={cn('font-semibold tabular-nums', s.remaining > 0 ? 'text-amber-600' : 'text-muted-foreground')}>{formatPKR(s.remaining)}</p></div>
                        </div>
                        {canEdit && (
                          subPayFor?.subcontractorId === s.subcontractorId ? (
                            <div className="flex gap-2 items-center mt-2">
                              <Input type="number" min="0" placeholder="Amount" value={subPayAmount} onChange={(e) => setSubPayAmount(e.target.value)} className="h-8 text-xs" autoFocus />
                              <Button size="sm" className="h-8" onClick={handlePaySub} disabled={subBusy}>Pay</Button>
                              <Button size="sm" variant="outline" className="h-8" onClick={() => setSubPayFor(null)}>×</Button>
                            </div>
                          ) : (
                            <button onClick={() => { setSubPayFor(s); setSubPayAmount(String(Math.max(0, s.remaining))); }} className="mt-2 text-[11px] font-semibold text-primary hover:underline">Record payment</button>
                          )
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Site Visits */}
            <Card className="border-border/70">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                  <Users className="h-4.5 w-4.5 text-indigo-500" />
                  <h3 className="font-semibold text-sm text-foreground">Core Team Site Visits</h3>
                </div>
                {canEdit && (
                  <div className="rounded-lg border border-border/60 bg-muted/10 p-3 space-y-2">
                    <p className="text-[11px] font-semibold text-muted-foreground">Log visit for {new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                    <div className="flex flex-wrap gap-2 items-end">
                      <select value={visitUser} onChange={(e) => setVisitUser(e.target.value)} className="text-xs border border-border rounded-md px-2 py-1.5 bg-card flex-1 min-w-[120px]">
                        <option value="">Select team member…</option>
                        {staffUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                      <Input placeholder="Purpose / note" value={visitNote} onChange={(e) => setVisitNote(e.target.value)} className="h-8 flex-1 min-w-[120px] text-xs" />
                      <Button size="sm" className="h-8" onClick={handleLogVisit} disabled={visitBusy || !visitUser}>Log</Button>
                    </div>
                  </div>
                )}
                {siteVisits.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-3 text-center">No site visits logged.</p>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {siteVisits.map((v) => (
                      <div key={v.id} className="flex items-center justify-between gap-2 text-xs border border-border/50 rounded-md px-2.5 py-1.5">
                        <div className="min-w-0">
                          <span className="font-medium text-foreground">{v.name}</span>
                          <span className="text-muted-foreground"> · {new Date(v.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                          {v.note && <span className="text-muted-foreground"> · {v.note}</span>}
                        </div>
                        {canEdit && <button onClick={() => handleDeleteVisit(v.id)} className="text-muted-foreground hover:text-destructive flex-shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Historical Log */}
          <Card className="border-border/70">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4.5 w-4.5 text-violet-500" />
                  <h3 className="font-semibold text-sm text-foreground">Attendance Logs History</h3>
                </div>
                {summary.history.length > 0 && (
                  <button
                    onClick={() => setGridOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-border bg-card hover:border-primary hover:text-primary transition-colors"
                    title="View the full attendance sheet (workers x days)"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" /> Attendance Sheet
                  </button>
                )}
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {summary.history.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-4 text-center">No attendance logged yet.</p>
                ) : (
                  summary.history.map((hist) => {
                    const formattedDate = new Date(hist.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                    return (
                      <div key={hist.date} className="p-3 border border-border/60 bg-muted/10 rounded-lg flex items-start justify-between gap-3 text-xs">
                        <div className="space-y-1.5 min-w-0">
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {formattedDate}
                            <span className="text-[10px] bg-violet-100 text-violet-800 dark:bg-violet-950/30 dark:text-violet-400 px-1.5 py-0.5 rounded-full font-bold">
                              {hist.workersCount} worker{hist.workersCount !== 1 ? 's' : ''} on site
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground leading-normal">
                            {hist.workersList.map((w, idx) => (
                              <span key={w.workerId} className="after:content-[',_'] last:after:content-none font-medium">
                                {w.name} ({w.role || 'Laborer'}{w.wageRate > 0 && ` @ ${w.wageRate.toLocaleString()}`})
                              </span>
                            ))}
                          </div>
                        </div>
                        {canEdit && (
                          <button
                            onClick={() => handleClearAttendance(hist.date)}
                            title="Clear attendance logs for this day"
                            className="p-1 rounded hover:bg-rose-50 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                            disabled={saving}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Pay Worker Modal */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
                <Banknote className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              Pay Worker
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Worker Selector (if opened from generic button) or Worker Info (if opened from row) */}
            {payWorkerData ? (
              <div className="flex items-center justify-between p-3 bg-muted/30 border border-border/60 rounded-lg">
                <div>
                  <div className="font-semibold text-sm text-foreground">{payWorkerData.name}</div>
                  <div className="text-xs text-muted-foreground">{payWorkerData.role || 'Laborer'} &middot; Rate: {formatPKR(payWorkerData.dailyWage)}/day</div>
                </div>
                {payWorkerData.remaining > 0 && (
                  <div className="text-right">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Remaining</div>
                    <div className="text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums">{formatPKR(payWorkerData.remaining)}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Select Worker</Label>
                <Select
                  value={''}
                  onValueChange={(val) => {
                    const found = allPayableWorkers.find(w => w.workerId === val);
                    if (found) {
                      setPayWorkerData(found);
                      if (found.remaining > 0) setPayAmount(String(found.remaining));
                    }
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Choose a worker..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allPayableWorkers.map(w => (
                      <SelectItem key={w.workerId} value={w.workerId}>
                        {w.name} {w.role ? `(${w.role})` : ''} {w.remaining > 0 ? `- Due: ${formatPKR(w.remaining)}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Amount + Date Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pay-amount">Amount (PKR) *</Label>
                <Input
                  id="pay-amount"
                  type="number"
                  min="1"
                  placeholder="e.g. 5000"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="h-9 tabular-nums"
                  disabled={payingSaving}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pay-date">Date</Label>
                <Input
                  id="pay-date"
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  max={todayISO()}
                  className="h-9"
                  disabled={payingSaving}
                />
              </div>
            </div>

            {/* Payment Method + Bank Account Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Payment Method</Label>
                <Select value={payMethod} onValueChange={setPayMethod} disabled={payingSaving}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank">Bank Transfer</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    <SelectItem value="Online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {payMethod !== 'Cash' && (
                <div className="space-y-1.5">
                  <Label>Bank Account</Label>
                  <Select value={payBankId} onValueChange={setPayBankId} disabled={payingSaving}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map(ba => (
                        <SelectItem key={ba.id} value={ba.id}>{ba.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Quick amount buttons */}
            {payWorkerData && payWorkerData.remaining > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPayAmount(String(payWorkerData.remaining))}
                  className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-900/40 transition-colors"
                >
                  Full Remaining ({formatPKR(payWorkerData.remaining)})
                </button>
                {payWorkerData.dailyWage > 0 && (
                  <button
                    type="button"
                    onClick={() => setPayAmount(String(payWorkerData.dailyWage))}
                    className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    1 Day Rate ({formatPKR(payWorkerData.dailyWage)})
                  </button>
                )}
                {payWorkerData.dailyWage > 0 && payWorkerData.daysWorked >= 7 && (
                  <button
                    type="button"
                    onClick={() => setPayAmount(String(payWorkerData.dailyWage * 7))}
                    className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:hover:bg-indigo-900/40 transition-colors"
                  >
                    Weekly ({formatPKR(payWorkerData.dailyWage * 7)})
                  </button>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="pay-notes">Notes (optional)</Label>
              <Input
                id="pay-notes"
                placeholder="e.g. Weekly settlement, advance payment..."
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                className="h-9"
                disabled={payingSaving}
              />
            </div>

            {/* Feedback messages */}
            {payError && (
              <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-2.5 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{payError}</span>
              </div>
            )}
            {payWarning && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-center gap-2 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-800">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{payWarning}</span>
              </div>
            )}
            {paySuccess && (
              <div className="text-xs text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                <span>{paySuccess}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                className="flex-1 h-9"
                onClick={() => setPayModalOpen(false)}
                disabled={payingSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePayWorker}
                disabled={payingSaving || !payWorkerData || !payAmount}
                className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
              >
                {payingSaving ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Recording…</>
                ) : (
                  <><CreditCard className="h-4 w-4 mr-1" /> Record Payment</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full attendance sheet (muster roll: workers x days) */}
      <AttendanceGridModal
        open={gridOpen}
        onOpenChange={setGridOpen}
        workers={summary.workers}
        history={summary.history}
        subcontractors={subcontractors.engaged.map((s) => ({ subcontractorId: s.subcontractorId, name: s.name, logs: s.logs }))}
        siteVisits={siteVisits.map((v) => ({ date: v.date, name: v.name }))}
      />
    </div>
  );
}

// Simple loader icon
function Loader2({ className, ...props }: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className={`animate-spin ${className}`} {...props}>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}
