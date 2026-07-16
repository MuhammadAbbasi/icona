'use client';

import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Check, Download, CalendarDays } from 'lucide-react';
import type { WorkerLabourSummary, AttendanceHistoryEntry } from '@/app/actions/workerLogs';

interface CrewInput { subcontractorId: string; name: string; logs: { date: string; headcount: number }[] }
interface VisitInput { date: string; name: string }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectName?: string;
  workers: WorkerLabourSummary[];
  history: AttendanceHistoryEntry[];
  subcontractors?: CrewInput[];
  siteVisits?: VisitInput[];
}

function todayISO(): string {
  return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD (local)
}

/** Every calendar day from start to end (inclusive), as YYYY-MM-DD. */
function eachDay(startISO: string, endISO: string): string[] {
  const days: string[] = [];
  const cur = new Date(startISO + 'T12:00:00');
  const end = new Date(endISO + 'T12:00:00');
  let guard = 0;
  while (cur <= end && guard < 4000) {
    days.push(cur.toLocaleDateString('en-CA'));
    cur.setDate(cur.getDate() + 1);
    guard++;
  }
  return days;
}

function dayMeta(iso: string) {
  const d = new Date(iso + 'T12:00:00');
  const dow = d.getDay();
  return {
    day: d.getDate(),
    month: iso.slice(0, 7),
    monthLabel: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
    dowLabel: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][dow],
    weekend: dow === 0 || dow === 6,
  };
}

export function AttendanceGridModal({ open, onOpenChange, projectName, workers, history, subcontractors = [], siteVisits = [] }: Props) {
  const [monthFilter, setMonthFilter] = useState<string>('all');

  const model = useMemo(() => {
    const allDated = [
      ...history.map((h) => h.date),
      ...subcontractors.flatMap((s) => s.logs.map((l) => l.date)),
      ...siteVisits.map((v) => v.date),
    ].sort();
    if (!allDated.length) return null;
    const firstDate = allDated[0];
    const allDays = eachDay(firstDate, todayISO());

    // presence set: `${date}|${workerId}`
    const present = new Set<string>();
    for (const h of history) for (const w of h.workersList) present.add(`${h.date}|${w.workerId}`);

    // crew headcount: subId -> (date -> headcount)
    const crew = new Map<string, Map<string, number>>();
    for (const s of subcontractors) {
      const m = new Map<string, number>();
      for (const l of s.logs) m.set(l.date, l.headcount);
      crew.set(s.subcontractorId, m);
    }
    // visits: date -> names[]
    const visits = new Map<string, string[]>();
    for (const v of siteVisits) { const arr = visits.get(v.date) ?? []; arr.push(v.name); visits.set(v.date, arr); }

    const months = Array.from(new Set(allDays.map((d) => d.slice(0, 7))));
    const rows = [...workers].sort((a, b) => a.name.localeCompare(b.name));
    return { firstDate, allDays, present, months, rows, crew, visits };
  }, [history, workers, subcontractors, siteVisits]);

  if (!model) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Attendance Sheet</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">No attendance has been logged yet.</p>
        </DialogContent>
      </Dialog>
    );
  }

  const { allDays, present, months, rows, crew, visits } = model;
  const days = monthFilter === 'all' ? allDays : allDays.filter((d) => d.slice(0, 7) === monthFilter);

  const isPresent = (date: string, workerId: string) => present.has(`${date}|${workerId}`);
  const workerTotal = (workerId: string) => days.reduce((n, d) => n + (isPresent(d, workerId) ? 1 : 0), 0);
  const dayTotal = (date: string) => rows.reduce((n, w) => n + (isPresent(date, w.workerId) ? 1 : 0), 0);
  const grandManDays = days.reduce((n, d) => n + dayTotal(d), 0);
  const crewHead = (subId: string, date: string) => crew.get(subId)?.get(date) ?? 0;
  const crewTotal = (subId: string) => days.reduce((n, d) => n + crewHead(subId, d), 0);
  const visitNames = (date: string) => visits.get(date) ?? [];

  function exportCsv() {
    const header = ['Row', 'Role', ...days.map((d) => d.slice(8) + '/' + d.slice(5, 7)), 'Total'];
    const lines = [header.join(',')];
    for (const w of rows) {
      const cells = days.map((d) => (isPresent(d, w.workerId) ? 'P' : ''));
      lines.push([`"${w.name}"`, `"${w.role || ''}"`, ...cells, String(workerTotal(w.workerId))].join(','));
    }
    for (const s of subcontractors) {
      const cells = days.map((d) => { const h = crewHead(s.subcontractorId, d); return h ? String(h) : ''; });
      lines.push([`"${s.name}"`, 'Subcontractor', ...cells, String(crewTotal(s.subcontractorId))].join(','));
    }
    const visitCells = days.map((d) => { const v = visitNames(d); return v.length ? `"${v.join('; ')}"` : ''; });
    lines.push(['Site visits', '', ...visitCells, ''].join(','));
    lines.push(['On site (labour)', '', ...days.map((d) => String(dayTotal(d))), String(grandManDays)].join(','));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `attendance-${projectName ? projectName.replace(/[^\w]+/g, '-') : 'sheet'}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // Month header groups (only meaningful when showing "all").
  const monthGroups: { label: string; span: number }[] = [];
  for (const d of days) {
    const label = dayMeta(d).monthLabel;
    const last = monthGroups[monthGroups.length - 1];
    if (last && last.label === label) last.span++;
    else monthGroups.push({ label, span: 1 });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Attendance Sheet
          </DialogTitle>
          <DialogDescription>
            {projectName ? `${projectName} - ` : ''}presence of each worker from the first logged day to today.
          </DialogDescription>
        </DialogHeader>

        {/* Controls */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Month</label>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="text-xs border border-border rounded-md px-2 py-1.5 bg-card"
            >
              <option value="all">All ({allDays.length} days)</option>
              {months.map((m) => (
                <option key={m} value={m}>{dayMeta(m + '-01').monthLabel}</option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground ml-2">
              {rows.length} workers · {grandManDays} man-days
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-emerald-500/20 border border-emerald-500/50 inline-flex items-center justify-center"><Check className="h-2 w-2 text-emerald-600" /></span> Present</span>
              <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm border border-border inline-block" /> Absent</span>
            </div>
            <button onClick={exportCsv} className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-border bg-card hover:border-primary hover:text-primary transition-colors">
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto border border-border rounded-lg">
          {/* min-w-full: fill the width when few days; the per-column min-widths
              below make the table overflow (scroll) instead of squeezing when many. */}
          <table className="border-collapse text-xs min-w-full">
            <thead className="sticky top-0 z-20">
              {monthFilter === 'all' && (
                <tr>
                  <th className="sticky left-0 z-30 bg-muted p-1.5 border-b border-r border-border" />
                  {monthGroups.map((g, i) => (
                    <th key={i} colSpan={g.span} className="bg-muted text-muted-foreground font-semibold text-[10px] px-1 py-1 border-b border-r border-border text-center">
                      {g.label}
                    </th>
                  ))}
                  <th className="sticky right-0 z-30 bg-muted border-b border-l border-border" />
                </tr>
              )}
              <tr>
                <th className="sticky left-0 z-30 bg-muted text-left px-3 py-2 border-b border-r border-border min-w-[160px]">Worker</th>
                {days.map((d) => {
                  const m = dayMeta(d);
                  return (
                    <th key={d} title={d} className={`px-0 py-1 border-b border-r border-border/60 text-center min-w-[34px] font-medium ${m.weekend ? 'bg-muted/60' : 'bg-muted/30'}`}>
                      <div className="leading-none">{m.day}</div>
                      <div className="text-[8px] text-muted-foreground leading-none mt-0.5">{m.dowLabel}</div>
                    </th>
                  );
                })}
                <th className="sticky right-0 z-30 bg-muted px-2 py-2 border-b border-l border-border text-center w-14">Present</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((w, ri) => (
                <tr key={w.workerId} className={ri % 2 ? 'bg-muted/10' : ''}>
                  <td className={`sticky left-0 z-10 px-3 py-1.5 border-r border-border ${ri % 2 ? 'bg-muted/40' : 'bg-card'}`}>
                    <div className="font-medium text-foreground truncate max-w-[150px]">{w.name}</div>
                    <div className="text-[10px] text-muted-foreground">{w.role || 'Laborer'}</div>
                  </td>
                  {days.map((d) => {
                    const p = isPresent(d, w.workerId);
                    const weekend = dayMeta(d).weekend;
                    return (
                      <td key={d} className={`border-r border-border/40 text-center ${weekend ? 'bg-muted/30' : ''}`}>
                        {p ? (
                          <span className="inline-flex items-center justify-center h-5 w-5 mx-auto rounded-sm bg-emerald-500/15">
                            <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          </span>
                        ) : (
                          <span className="text-muted-foreground/30">·</span>
                        )}
                      </td>
                    );
                  })}
                  <td className={`sticky right-0 z-10 px-2 py-1.5 border-l border-border text-center font-bold tabular-nums ${ri % 2 ? 'bg-muted/40' : 'bg-card'}`}>
                    {workerTotal(w.workerId)}
                  </td>
                </tr>
              ))}

              {/* Subcontractor crews (cell = headcount) */}
              {subcontractors.length > 0 && (
                <tr className="bg-amber-500/5">
                  <td className="sticky left-0 z-10 bg-amber-500/10 px-3 py-1 border-r border-t border-border text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">Subcontractors</td>
                  <td colSpan={days.length} className="border-t border-border/40" />
                  <td className="sticky right-0 z-10 bg-amber-500/10 border-l border-t border-border" />
                </tr>
              )}
              {subcontractors.map((s) => (
                <tr key={s.subcontractorId} className="bg-amber-500/5">
                  <td className="sticky left-0 z-10 bg-amber-50 dark:bg-amber-950/20 px-3 py-1.5 border-r border-border">
                    <div className="font-medium text-foreground truncate max-w-[150px]">{s.name}</div>
                    <div className="text-[10px] text-muted-foreground">Crew</div>
                  </td>
                  {days.map((d) => {
                    const h = crewHead(s.subcontractorId, d);
                    const weekend = dayMeta(d).weekend;
                    return (
                      <td key={d} className={`border-r border-border/40 text-center tabular-nums ${weekend ? 'bg-muted/30' : ''}`}>
                        {h ? <span className="font-semibold text-amber-700 dark:text-amber-400">{h}</span> : <span className="text-muted-foreground/30">·</span>}
                      </td>
                    );
                  })}
                  <td className="sticky right-0 z-10 bg-amber-50 dark:bg-amber-950/20 px-2 py-1.5 border-l border-border text-center font-bold tabular-nums">{crewTotal(s.subcontractorId)}</td>
                </tr>
              ))}

              {/* Site visits row */}
              {siteVisits.length > 0 && (
                <tr className="bg-indigo-500/5">
                  <td className="sticky left-0 z-10 bg-indigo-50 dark:bg-indigo-950/20 px-3 py-1.5 border-r border-t border-border font-medium text-indigo-700 dark:text-indigo-400">Site visits</td>
                  {days.map((d) => {
                    const v = visitNames(d);
                    return (
                      <td key={d} title={v.join(', ')} className="border-r border-t border-border/40 text-center">
                        {v.length ? <span className="inline-block h-2 w-2 rounded-full bg-indigo-500" /> : <span className="text-muted-foreground/30">·</span>}
                      </td>
                    );
                  })}
                  <td className="sticky right-0 z-10 bg-indigo-50 dark:bg-indigo-950/20 border-l border-t border-border text-center tabular-nums font-bold">{siteVisits.length}</td>
                </tr>
              )}
            </tbody>
            <tfoot className="sticky bottom-0 z-20">
              <tr className="bg-muted font-semibold">
                <td className="sticky left-0 z-30 bg-muted px-3 py-2 border-t border-r border-border">On site</td>
                {days.map((d) => (
                  <td key={d} className="border-t border-r border-border/60 text-center tabular-nums text-muted-foreground">{dayTotal(d) || ''}</td>
                ))}
                <td className="sticky right-0 z-30 bg-muted px-2 py-2 border-t border-l border-border text-center tabular-nums">{grandManDays}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
