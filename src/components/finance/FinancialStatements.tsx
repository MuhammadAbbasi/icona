'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn, formatPKR } from '@/lib/utils';
import {
  Scale, BookOpen, TrendingUp, Clock, Layers, Landmark, RefreshCw, Loader2, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { projectLedgerAction } from '@/app/actions/ledger';

type Line = { code: string; name: string; amount: string };
type TbRow = { code: string; name: string; type: string; debit: string; credit: string };

export interface StatementsData {
  trialBalance: { rows: TbRow[]; totalDebit: string; totalCredit: string; balanced: boolean };
  balanceSheet: {
    assets: Line[]; liabilities: Line[]; equity: Line[];
    totalAssets: string; totalLiabilities: string; totalEquity: string; liabilitiesPlusEquity: string; balanced: boolean;
  };
  incomeStatement: { income: Line[]; expense: Line[]; incomeTotal: string; expenseTotal: string; netProfit: string };
  bankCash: { rows: Line[]; total: string };
  apAging: { items: any[]; totals: { current: number; d1_30: number; d31_60: number; d61_90: number; d90plus: number }; total: number };
  wip: { projectId: string; name: string; contractValue: number; earned: number; billed: number; overUnder: number; status: string }[];
}

const n = (s: string | number) => formatPKR(Number(s) || 0);

// Dynamic sub-accounts use "LOAN:<id>" / "INVESTOR:<id>" / "BANK:<id>" internal
// codes; show a readable tag instead of the raw hash (the name carries the rest).
function dispCode(code: string): string {
  if (!code) return '';
  if (code.startsWith('LOAN:')) return 'Loan';
  if (code.startsWith('INVESTOR:')) return 'Investor';
  if (code.startsWith('BANK:')) return 'Bank';
  return code;
}

const TABS = [
  { id: 'balance', label: 'Balance Sheet', icon: Scale },
  { id: 'pnl', label: 'Profit & Loss', icon: TrendingUp },
  { id: 'trial', label: 'Trial Balance', icon: BookOpen },
  { id: 'ap', label: 'AP Aging', icon: Clock },
  { id: 'wip', label: 'WIP / Billing', icon: Layers },
  { id: 'cash', label: 'Bank & Cash', icon: Landmark },
] as const;

export function FinancialStatements({ data }: { data: StatementsData }) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('balance');
  const [refreshing, setRefreshing] = useState(false);
  const [msg, setMsg] = useState('');

  async function refresh() {
    setRefreshing(true); setMsg('');
    try {
      const res = await projectLedgerAction();
      if (!res.ok) setMsg(res.error || 'Refresh failed');
      else setMsg(`Synced. Trial balance ${res.trialBalanced ? 'balanced' : 'OUT OF BALANCE'}.`);
      router.refresh();
    } finally {
      setRefreshing(false);
    }
  }

  const balanced = data.trialBalance.balanced;

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border',
            balanced ? 'text-emerald-600 border-emerald-500/30 bg-emerald-500/10' : 'text-rose-600 border-rose-500/30 bg-rose-500/10')}>
            {balanced ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
            {balanced ? 'Ledger balanced' : 'Out of balance'}
          </span>
          {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
        </div>
        <button onClick={refresh} disabled={refreshing}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-border bg-card hover:border-primary hover:text-primary transition-colors">
          {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh from ledger
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border flex-wrap">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('text-sm font-semibold px-4 py-2 border-b-2 transition-all mr-2 flex items-center gap-1.5',
              tab === t.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'balance' && <BalanceSheet d={data.balanceSheet} />}
      {tab === 'pnl' && <ProfitLoss d={data.incomeStatement} />}
      {tab === 'trial' && <TrialBalance d={data.trialBalance} />}
      {tab === 'ap' && <ApAging d={data.apAging} />}
      {tab === 'wip' && <Wip rows={data.wip} />}
      {tab === 'cash' && <BankCash d={data.bankCash} />}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-4 py-2.5 border-b bg-muted/40 text-sm font-semibold">{title}</div>
      {children}
    </div>
  );
}

function Section({ lines, total, totalLabel }: { lines: Line[]; total: string; totalLabel: string }) {
  return (
    <table className="w-full text-sm">
      <tbody className="divide-y divide-border">
        {lines.length === 0 && <tr><td className="px-4 py-3 text-muted-foreground text-xs">Nothing recorded.</td></tr>}
        {lines.map((l, i) => (
          <tr key={i} className="hover:bg-muted/20">
            <td className="px-4 py-2 text-muted-foreground tabular-nums w-16">{dispCode(l.code)}</td>
            <td className="px-4 py-2">{l.name}</td>
            <td className="px-4 py-2 text-right tabular-nums font-medium">{n(l.amount)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="bg-muted/40 font-bold">
          <td className="px-4 py-2" colSpan={2}>{totalLabel}</td>
          <td className="px-4 py-2 text-right tabular-nums">{n(total)}</td>
        </tr>
      </tfoot>
    </table>
  );
}

function BalanceSheet({ d }: { d: StatementsData['balanceSheet'] }) {
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Assets"><Section lines={d.assets} total={d.totalAssets} totalLabel="Total Assets" /></Card>
        <div className="space-y-4">
          <Card title="Liabilities"><Section lines={d.liabilities} total={d.totalLiabilities} totalLabel="Total Liabilities" /></Card>
          <Card title="Equity"><Section lines={d.equity} total={d.totalEquity} totalLabel="Total Equity" /></Card>
        </div>
      </div>
      <div className={cn('rounded-lg border px-4 py-3 text-sm flex items-center justify-between',
        d.balanced ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5')}>
        <span className="font-semibold">Assets = Liabilities + Equity</span>
        <span className="tabular-nums font-bold">{n(d.totalAssets)} {d.balanced ? '=' : '≠'} {n(d.liabilitiesPlusEquity)}</span>
      </div>
    </div>
  );
}

function ProfitLoss({ d }: { d: StatementsData['incomeStatement'] }) {
  const profit = Number(d.netProfit) >= 0;
  return (
    <div className="space-y-4 max-w-2xl">
      <Card title="Income"><Section lines={d.income} total={d.incomeTotal} totalLabel="Total Income" /></Card>
      <Card title="Expenses"><Section lines={d.expense} total={d.expenseTotal} totalLabel="Total Expenses" /></Card>
      <div className={cn('rounded-lg border px-4 py-3 text-sm flex items-center justify-between',
        profit ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5')}>
        <span className="font-semibold">Net {profit ? 'Profit' : 'Loss'}</span>
        <span className={cn('tabular-nums font-bold', profit ? 'text-emerald-600' : 'text-rose-600')}>{n(d.netProfit)}</span>
      </div>
    </div>
  );
}

function TrialBalance({ d }: { d: StatementsData['trialBalance'] }) {
  return (
    <div className="rounded-xl border bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground text-xs">
          <tr className="text-left">
            <th className="px-4 py-2 font-medium w-16">Code</th>
            <th className="px-4 py-2 font-medium">Account</th>
            <th className="px-4 py-2 font-medium text-right">Debit</th>
            <th className="px-4 py-2 font-medium text-right">Credit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {d.rows.map((r, i) => (
            <tr key={i} className="hover:bg-muted/20">
              <td className="px-4 py-2 text-muted-foreground tabular-nums">{dispCode(r.code)}</td>
              <td className="px-4 py-2">{r.name}</td>
              <td className="px-4 py-2 text-right tabular-nums">{Number(r.debit) ? n(r.debit) : ''}</td>
              <td className="px-4 py-2 text-right tabular-nums">{Number(r.credit) ? n(r.credit) : ''}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-muted/40 font-bold">
            <td className="px-4 py-2" colSpan={2}>Total</td>
            <td className="px-4 py-2 text-right tabular-nums">{n(d.totalDebit)}</td>
            <td className="px-4 py-2 text-right tabular-nums">{n(d.totalCredit)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function ApAging({ d }: { d: StatementsData['apAging'] }) {
  const buckets = [
    { k: 'current', label: 'Current', v: d.totals.current },
    { k: 'd1_30', label: '1-30 days', v: d.totals.d1_30 },
    { k: 'd31_60', label: '31-60 days', v: d.totals.d31_60 },
    { k: 'd61_90', label: '61-90 days', v: d.totals.d61_90 },
    { k: 'd90plus', label: '90+ days', v: d.totals.d90plus },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {buckets.map((b) => (
          <div key={b.k} className={cn('rounded-lg border p-3', b.k === 'd90plus' && b.v > 0 ? 'border-rose-500/30 bg-rose-500/5' : 'bg-card')}>
            <p className="text-[11px] text-muted-foreground">{b.label}</p>
            <p className="text-sm font-bold tabular-nums mt-0.5">{n(b.v)}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-xs">
            <tr className="text-left">
              <th className="px-4 py-2 font-medium">Description</th>
              <th className="px-4 py-2 font-medium">Invoice</th>
              <th className="px-4 py-2 font-medium">Due</th>
              <th className="px-4 py-2 font-medium text-right">Days</th>
              <th className="px-4 py-2 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {d.items.length === 0 && <tr><td colSpan={5} className="px-4 py-4 text-center text-muted-foreground text-xs">No outstanding bills.</td></tr>}
            {d.items.map((it) => (
              <tr key={it.id} className="hover:bg-muted/20">
                <td className="px-4 py-2">{it.description || it.category || '-'}</td>
                <td className="px-4 py-2 text-muted-foreground">{it.vendorInvoiceNo || '-'}</td>
                <td className="px-4 py-2 text-muted-foreground">{it.dueDate ? new Date(it.dueDate).toLocaleDateString('en-GB') : '-'}</td>
                <td className="px-4 py-2 text-right tabular-nums">{it.daysOverdue > 0 ? it.daysOverdue : ''}</td>
                <td className="px-4 py-2 text-right tabular-nums font-medium">{n(it.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-muted/40 font-bold">
              <td className="px-4 py-2" colSpan={4}>Total Payable</td>
              <td className="px-4 py-2 text-right tabular-nums">{n(d.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function Wip({ rows }: { rows: StatementsData['wip'] }) {
  return (
    <div className="rounded-xl border bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground text-xs">
          <tr className="text-left">
            <th className="px-4 py-2 font-medium">Project</th>
            <th className="px-4 py-2 font-medium text-right">Contract</th>
            <th className="px-4 py-2 font-medium text-right">Earned</th>
            <th className="px-4 py-2 font-medium text-right">Billed</th>
            <th className="px-4 py-2 font-medium text-right">Over / Under</th>
            <th className="px-4 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-4 text-center text-muted-foreground text-xs">No projects.</td></tr>}
          {rows.map((r) => (
            <tr key={r.projectId} className="hover:bg-muted/20">
              <td className="px-4 py-2 font-medium">{r.name}</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{n(r.contractValue)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{n(r.earned)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{n(r.billed)}</td>
              <td className={cn('px-4 py-2 text-right tabular-nums font-medium', r.overUnder > 0 ? 'text-amber-600' : r.overUnder < 0 ? 'text-indigo-600' : '')}>{n(r.overUnder)}</td>
              <td className="px-4 py-2">
                <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full',
                  r.status === 'OVERBILLED' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  : r.status === 'UNDERBILLED' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                  : 'bg-muted text-muted-foreground')}>{r.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BankCash({ d }: { d: StatementsData['bankCash'] }) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden max-w-xl">
      <Section lines={d.rows} total={d.total} totalLabel="Total Cash Position" />
    </div>
  );
}
