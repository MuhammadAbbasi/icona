'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ReceiptText, Plus, TrendingUp, TrendingDown, Wallet, Users,
  Trash2, PieChart as PieIcon, AlertTriangle, CheckCircle2, Loader2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, formatCurrency, formatPKR } from '@/lib/utils';
import { computeCompanyPnl, OVERHEAD_CATEGORY_LABEL } from '@/lib/finance';
import { deleteOverhead } from '@/app/actions/overheads';
import { OverheadModal } from './OverheadModal';
import { PaySalaryDialog, type StaffMember } from './PaySalaryDialog';

interface CompanyLite { id: string; name: string }
interface ProjectTxn { companyId: string; type: string; amount: number; date: string }
interface Overhead {
  id: string; companyId: string; category: string; amount: number;
  date: string; description: string | null; paymentMethod: string | null;
  source: string; staffUserId: string | null; period: string | null;
}
interface StaffGroup { companyId: string; members: StaffMember[] }

interface Props {
  mainCompanies: CompanyLite[];
  projectTxns: ProjectTxn[];
  overheads: Overhead[];
  staffByCompany: StaffGroup[];
  unassignedStaffCount: number;
  currentPeriod: string;     // YYYY-MM
  isAdmin: boolean;
}

const PERIODS = [
  { id: 'ALL', label: 'All time' },
  { id: 'MTD', label: 'This month' },
  { id: 'D30', label: 'Last 30 days' },
  { id: 'YTD', label: 'This year' },
] as const;
type Period = typeof PERIODS[number]['id'];

function periodStart(p: Period): number | null {
  const now = new Date();
  if (p === 'MTD') return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  if (p === 'YTD') return new Date(now.getFullYear(), 0, 1).getTime();
  if (p === 'D30') return now.getTime() - 30 * 86_400_000;
  return null;
}

function monthLabel(period: string): string {
  const [y, m] = period.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function OverheadsManager({
  mainCompanies, projectTxns, overheads, staffByCompany,
  unassignedStaffCount, currentPeriod, isAdmin,
}: Props) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState(mainCompanies[0]?.id ?? '');
  const [period, setPeriod] = useState<Period>('MTD');
  const [addOpen, setAddOpen] = useState(false);
  const [payMember, setPayMember] = useState<StaffMember | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const company = mainCompanies.find((c) => c.id === companyId) ?? mainCompanies[0];
  const members = staffByCompany.find((s) => s.companyId === companyId)?.members ?? [];

  const start = periodStart(period);
  const inPeriod = (iso: string) => start == null || new Date(iso).getTime() >= start;

  const coOverheads = useMemo(
    () => overheads.filter((o) => o.companyId === companyId && inPeriod(o.date)),
    [overheads, companyId, period], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const coTxns = useMemo(
    () => projectTxns.filter((t) => t.companyId === companyId && inPeriod(t.date)),
    [projectTxns, companyId, period], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const pnl = useMemo(() => {
    let income = 0, projectExpense = 0, drawings = 0;
    for (const t of coTxns) {
      if (t.type === 'INCOME') income += t.amount;
      else if (t.type === 'EXPENSE') projectExpense += t.amount;
      else if (t.type === 'DRAWING') drawings += t.amount;
    }
    const overheadTotal = coOverheads.reduce((s, o) => s + o.amount, 0);
    return computeCompanyPnl({ income, projectExpense, overheads: overheadTotal, drawings });
  }, [coTxns, coOverheads]);

  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of coOverheads) {
      const k = OVERHEAD_CATEGORY_LABEL[o.category] ?? o.category;
      m.set(k, (m.get(k) ?? 0) + o.amount);
    }
    return Array.from(m, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [coOverheads]);

  // Paid-this-month detection for the routine expenses roster (keyed to currentPeriod,
  // independent of the dashboard period filter).
  const paidThisMonth = useMemo(() => {
    const m = new Map<string, Overhead>();
    for (const o of overheads) {
      if (o.companyId === companyId && o.period === currentPeriod && o.staffUserId) m.set(o.staffUserId, o);
    }
    return m;
  }, [overheads, companyId, currentPeriod]);

  const paidCount = members.filter((m) => paidThisMonth.has(m.userId)).length;

  async function handleDeleteOverhead(id: string) {
    if (!confirm('Delete this overhead? This cannot be undone.')) return;
    setBusyId(id);
    const res = await deleteOverhead(id);
    setBusyId(null);
    if (!res.ok) { alert(res.error ?? 'Could not delete.'); return; }
    router.refresh();
  }

  const cards = [
    { label: 'Project Income', value: pnl.income, sub: 'collected from clients', icon: TrendingUp, tone: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Direct Costs', value: pnl.projectExpense, sub: 'project expenses', icon: TrendingDown, tone: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10' },
    { label: 'Overheads', value: pnl.overheads, sub: 'rent, salaries, marketing…', icon: ReceiptText, tone: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10' },
    { label: 'Operating Profit', value: pnl.operatingProfit, sub: `${Math.round(pnl.margin)}% margin · after overheads`, icon: Wallet, tone: pnl.operatingProfit < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground', bg: 'bg-violet-500/10' },
    { label: 'Owner Drawings', value: pnl.drawings, sub: 'equity withdrawn', icon: Users, tone: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
  ];

  if (!company) return null;

  return (
    <div className="space-y-6">
      {/* Toolbar: company + period + add */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger className="h-9 w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              {mainCompanies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1.5">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={cn('text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors',
                  period === p.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted/50')}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> New Overhead
        </Button>
      </div>

      {/* P&L cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{c.label}</span>
                <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center', c.bg)}>
                  <c.icon className={cn('h-4 w-4', c.tone)} />
                </div>
              </div>
              <p className={cn('text-lg font-bold tabular-nums', c.tone)}>{formatPKR(c.value)}</p>
              <p className="text-[11px] text-muted-foreground">{c.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Overhead breakdown chart */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 mb-3">
              <PieIcon className="h-3.5 w-3.5" /> Overheads by Category
            </p>
            {byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-16">No overheads in this period.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byCategory} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} fontSize={11} />
                  <YAxis type="category" dataKey="name" width={110} fontSize={11} />
                  <Tooltip formatter={(v: number) => formatPKR(v)} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />
                  <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Monthly Routine Expenses — staff salaries, paid one by one */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Monthly Routine Expenses: {monthLabel(currentPeriod)}
              </p>
              <span className="text-[11px] text-muted-foreground">{paidCount}/{members.length} salaries paid</span>
            </div>

            {unassignedStaffCount > 0 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3" />
                {unassignedStaffCount} active staff are not assigned to a main company and won&apos;t appear here.
              </p>
            )}

            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No active staff assigned to {company.name}.</p>
            ) : (
              <div className="max-h-72 overflow-y-auto rounded-md border border-border/60 divide-y divide-border/60">
                {members.map((m) => {
                  const paid = paidThisMonth.get(m.userId);
                  return (
                    <div key={m.userId} className="flex items-center justify-between gap-3 px-3 py-2">
                      <span className="text-sm text-foreground/90 truncate">{m.name}</span>
                      {paid ? (
                        <span className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-sm tabular-nums text-foreground">{formatPKR(paid.amount)}</span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Paid
                          </span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs tabular-nums text-muted-foreground">{formatPKR(m.salary)}</span>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPayMember(m)}>
                            Mark paid
                          </Button>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Marking paid opens a confirmation (salary, bonus, date) and posts that person as their own ledger row.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Overheads ledger */}
      <div className="rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr className="text-left text-xs">
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Category</th>
                <th className="px-4 py-2.5 font-medium">Notes</th>
                <th className="px-4 py-2.5 font-medium">Method</th>
                <th className="px-4 py-2.5 font-medium text-right">Amount</th>
                {isAdmin && <th className="px-2 py-2.5" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {coOverheads.map((o) => (
                <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap tabular-nums">{fmtDate(o.date)}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                      {OVERHEAD_CATEGORY_LABEL[o.category] ?? o.category}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-foreground/80 max-w-[18rem] truncate">{o.description || <span className="text-muted-foreground/50">-</span>}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{o.paymentMethod ?? '-'}</td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums whitespace-nowrap text-indigo-600 dark:text-indigo-400">{formatPKR(o.amount)}</td>
                  {isAdmin && (
                    <td className="px-2 py-2.5">
                      <button
                        onClick={() => handleDeleteOverhead(o.id)} disabled={busyId === o.id}
                        className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40" title="Delete"
                      >
                        {busyId === o.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {coOverheads.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No overheads for {company.name} in this period. Use “New Overhead” to record one.
                  </td>
                </tr>
              )}
            </tbody>
            {coOverheads.length > 0 && (
              <tfoot className="border-t-2 border-border bg-muted/30">
                <tr className="text-sm font-semibold">
                  <td className="px-4 py-2.5" colSpan={isAdmin ? 4 : 3}>
                    {coOverheads.length} overhead{coOverheads.length !== 1 ? 's' : ''} · total
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-indigo-600 dark:text-indigo-400">
                    {formatPKR(pnl.overheads)}
                  </td>
                  {isAdmin && <td />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <OverheadModal
        open={addOpen}
        onOpenChange={setAddOpen}
        companyId={companyId}
        companyName={company.name}
        onSaved={() => router.refresh()}
      />

      <PaySalaryDialog
        open={!!payMember}
        onOpenChange={(v) => { if (!v) setPayMember(null); }}
        companyId={companyId}
        member={payMember}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
