'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Wallet, Plus, Search, TrendingUp, TrendingDown, Banknote, Users,
  Trash2, AlertTriangle, Receipt, Download, PieChart as PieIcon, FolderKanban,
  HandCoins, ArrowUpRight, Building2, CreditCard, Edit2, Info, FileText
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn, formatCurrency, getInitials } from '@/lib/utils';
import { computeFinancials, TXN_TYPE_CONFIG, type TransactionType } from '@/lib/finance';
import { deleteTransaction } from '@/app/actions/transactions';
import { createBankAccount, updateBankAccount, deleteBankAccount } from '@/app/actions/bankAccounts';
import { TransactionModal, type OwnerOption, type ProjectOption } from '@/components/projects/TransactionModal';
import { RegistryPartyModal, type PartyState } from '@/components/finance/RegistryPartyModal';

interface LedgerTxn {
  id: string;
  type: string;
  amount: number;
  date: string;
  category?: string | null;
  description?: string | null;
  paymentMethod?: string | null;
  isPaid?: boolean | null;
  vendorInvoiceNo?: string | null;
  invoiceUrl?: string | null;
  project: { id: string; name: string };
  owner?: { id: string; name: string } | null;
  recordedBy?: { id: string; name: string } | null;
  bankAccount?: { id: string; name: string } | null;
}

interface ProjectRow extends ProjectOption {
  budget: number;
  company: string;
}

interface Props {
  transactions: LedgerTxn[];
  projects: ProjectRow[];
  owners: OwnerOption[];
  bankAccounts: any[];
  loans: any[];
  lenders?: any[];
  investors?: any[];
  investments?: any[];
  investorPayouts?: any[];
  canEdit: boolean;
  canDelete: boolean;
}

const pkr = (n: number) => `PKR ${formatCurrency(n)}`;
const FILTERS: Array<'ALL' | TransactionType> = ['ALL', 'INCOME', 'EXPENSE', 'DRAWING'];
const TYPE_COLORS: Record<TransactionType, string> = { INCOME: '#10b981', EXPENSE: '#f43f5e', DRAWING: '#f59e0b' };
const PERIODS = [
  { id: 'ALL', label: 'All time' },
  { id: 'MTD', label: 'This month' },
  { id: 'D30', label: 'Last 30 days' },
  { id: 'YTD', label: 'This year' },
] as const;
type Period = typeof PERIODS[number]['id'];

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function periodStart(p: Period): number | null {
  const now = new Date();
  if (p === 'MTD') return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  if (p === 'YTD') return new Date(now.getFullYear(), 0, 1).getTime();
  if (p === 'D30') return now.getTime() - 30 * 86_400_000;
  return null;
}

export function GlobalLedger({
  transactions,
  projects,
  owners,
  bankAccounts,
  loans,
  lenders = [],
  investors = [],
  investments = [],
  investorPayouts = [],
  canEdit,
  canDelete
}: Props) {
  const router = useRouter();
  const [activeView, setActiveView] = useState<'LEDGER' | 'BANKS' | 'LENDERS' | 'INVESTORS'>('LEDGER');
  const [partyModal, setPartyModal] = useState<PartyState>(null);
  
  // Ledger operations
  const [addOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'ALL' | TransactionType>('ALL');
  const [projectFilter, setProjectFilter] = useState<string>('ALL');
  const [period, setPeriod] = useState<Period>('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Bank Accounts CRUD modal states
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any | null>(null);
  const [bankName, setBankName] = useState('');
  const [accName, setAccName] = useState('');
  const [accNumber, setAccNumber] = useState('');
  const [accBranch, setAccBranch] = useState('');
  const [accInitialBalance, setAccInitialBalance] = useState('0');
  const [isSavingAccount, setIsSavingAccount] = useState(false);

  // Period-scoped set drives the cards, charts AND table (one consistent lens).
  const scoped = useMemo(() => {
    const start = periodStart(period);
    return transactions
      .filter((t) => projectFilter === 'ALL' || t.project.id === projectFilter)
      .filter((t) => start == null || new Date(t.date).getTime() >= start);
  }, [transactions, projectFilter, period]);

  const rows = useMemo(() => {
    const list: any[] = scoped.map(t => ({
      id: t.id,
      date: t.date,
      type: t.type,
      category: t.category,
      who: t.type === 'DRAWING' ? (t.owner?.name ?? 'Company Account / General Pool') : t.description,
      paymentMethod: t.paymentMethod,
      bankAccount: t.bankAccount,
      amount: t.amount,
      project: t.project,
      recordedBy: t.recordedBy,
      unpaid: t.type === 'EXPENSE' && t.isPaid === false,
      description: t.description,
      isOriginalTxn: true
    }));

    // Scope and map investments
    const start = periodStart(period);
    const scInvestments = (investments || [])
      .filter((inv) => projectFilter === 'ALL' || inv.projectId === projectFilter || !inv.projectId)
      .filter((inv) => start == null || new Date(inv.date).getTime() >= start);

    for (const inv of scInvestments) {
      list.push({
        id: inv.id,
        date: inv.date,
        type: 'INCOME',
        category: 'Investor Investment',
        who: inv.investor?.name || inv.investorName || 'Investor',
        paymentMethod: 'Bank',
        bankAccount: inv.bankAccount,
        amount: inv.amount,
        project: inv.project || { id: 'company', name: 'Company General' },
        recordedBy: null,
        unpaid: false,
        description: inv.notes,
        isOriginalTxn: false
      });
    }

    // Scope and map payouts
    const scPayouts = (investorPayouts || [])
      .filter((p) => projectFilter === 'ALL' || p.projectId === projectFilter || !p.projectId)
      .filter((p) => start == null || new Date(p.date).getTime() >= start);

    for (const ip of scPayouts) {
      list.push({
        id: ip.id,
        date: ip.date,
        type: 'DRAWING',
        category: 'Investor Profit Distribution',
        who: ip.investor?.name || 'Investor',
        paymentMethod: ip.paymentMethod,
        bankAccount: ip.bankAccount,
        amount: ip.amount,
        project: ip.project || { id: 'company', name: 'Company General' },
        recordedBy: null,
        unpaid: false,
        description: ip.notes,
        isOriginalTxn: false
      });
    }

    // Scope and map loans
    const scLoans = (loans || [])
      .filter((l) => projectFilter === 'ALL' || l.projectId === projectFilter)
      .filter((l) => start == null || new Date(l.receivedDate).getTime() >= start);

    for (const l of scLoans) {
      list.push({
        id: l.id,
        date: l.receivedDate,
        type: 'INCOME',
        category: 'Startup Loan',
        who: l.provider || 'Lender',
        paymentMethod: 'Bank',
        bankAccount: l.bankAccount,
        amount: l.amount,
        project: l.project || { id: 'company', name: 'Company General' },
        recordedBy: null,
        unpaid: false,
        description: l.notes,
        isOriginalTxn: false
      });

      if (l.repayments) {
        for (const r of l.repayments) {
          if (start == null || new Date(r.date).getTime() >= start) {
            list.push({
              id: r.id,
              date: r.date,
              type: 'DRAWING',
              category: 'Startup Loan Repayment',
              who: l.provider || 'Lender',
              paymentMethod: r.paymentMethod,
              bankAccount: r.bankAccount,
              amount: r.amount,
              project: l.project || { id: 'company', name: 'Company General' },
              recordedBy: null,
              unpaid: false,
              description: r.notes,
              isOriginalTxn: false
            });
          }
        }
      }
    }

    const q = query.trim().toLowerCase();
    return list
      .filter((t) => filter === 'ALL' || t.type === filter)
      .filter((t) => !q || [t.category, t.who, t.project?.name, t.paymentMethod, t.description]
        .some((v) => v?.toLowerCase().includes(q)))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [scoped, investments, investorPayouts, loans, projectFilter, period, query, filter]);

  const totalBudget = useMemo(
    () => projects
      .filter((p) => projectFilter === 'ALL' || p.id === projectFilter)
      .reduce((s, p) => s + (p.budget || 0), 0),
    [projects, projectFilter],
  );

  // Scope project start loans
  const scopedLoans = useMemo(() => {
    const start = periodStart(period);
    return loans
      .filter((l) => projectFilter === 'ALL' || l.projectId === projectFilter)
      .filter((l) => start == null || new Date(l.receivedDate).getTime() >= start);
  }, [loans, projectFilter, period]);

  // Aggregate start loans data for computeFinancials structure
  const mappedLoans = useMemo(() => {
    return scopedLoans.map(l => ({
      amount: l.amount,
      interestAmount: l.interestAmount,
      amountPaid: l.amountPaid
    }));
  }, [scopedLoans]);

  // Scope project/company investments
  const scopedInvestments = useMemo(() => {
    const start = periodStart(period);
    return (investments || [])
      .filter((inv) => projectFilter === 'ALL' || inv.projectId === projectFilter || !inv.projectId)
      .filter((inv) => start == null || new Date(inv.date).getTime() >= start);
  }, [investments, projectFilter, period]);

  // Scope investor payouts
  const scopedPayouts = useMemo(() => {
    const start = periodStart(period);
    return (investorPayouts || [])
      .filter((p) => projectFilter === 'ALL' || p.projectId === projectFilter || !p.projectId)
      .filter((p) => start == null || new Date(p.date).getTime() >= start);
  }, [investorPayouts, projectFilter, period]);

  const fin = useMemo(() => {
    const mappedInvestments = scopedInvestments.map(inv => ({ amount: inv.amount }));
    const mappedPayouts = scopedPayouts.map(ip => ({ amount: ip.amount }));
    return computeFinancials(totalBudget, scoped, mappedLoans, mappedInvestments, mappedPayouts);
  }, [totalBudget, scoped, mappedLoans, scopedInvestments, scopedPayouts]);

  // Expense-by-category for the bar chart (job-costing view).
  const expenseByCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of scoped) if (t.type === 'EXPENSE') {
      const k = t.category || 'Uncategorized';
      m.set(k, (m.get(k) ?? 0) + t.amount);
    }
    return Array.from(m, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [scoped]);

  const flowData = useMemo(() => ([
    { name: 'Income', value: fin.revenue, key: 'INCOME' as const },
    { name: 'Expense', value: fin.expense, key: 'EXPENSE' as const },
    { name: 'Payout', value: fin.drawings, key: 'DRAWING' as const },
  ].filter((d) => d.value > 0)), [fin]);

  // Per-project rollup (job costing).
  const projectRollup = useMemo(() => {
    const visible = projects.filter((p) => projectFilter === 'ALL' || p.id === projectFilter);
    return visible.map((p) => {
      const txns = scoped.filter((t) => t.project.id === p.id);
      const prjLoans = scopedLoans.filter((l) => l.projectId === p.id).map(l => ({
        amount: l.amount,
        interestAmount: l.interestAmount,
        amountPaid: l.amountPaid
      }));
      const prjInvestments = (investments || [])
        .filter((inv: any) => inv.projectId === p.id);
      const prjPayouts = (investorPayouts || [])
        .filter((ip: any) => ip.projectId === p.id);
      const companyInvestmentsTotal = (investments || [])
        .filter((inv: any) => !inv.projectId)
        .reduce((sum: number, inv: any) => sum + inv.amount, 0);
      const companyPayoutsTotal = (investorPayouts || [])
        .filter((ip: any) => !ip.projectId)
        .reduce((sum: number, ip: any) => sum + ip.amount, 0);

      return {
        project: p,
        f: computeFinancials(
          p.budget,
          txns,
          prjLoans,
          prjInvestments,
          prjPayouts,
          companyInvestmentsTotal,
          companyPayoutsTotal
        )
      };
    }).filter((r) => r.f.revenue || r.f.expense || r.f.drawings || r.project.budget)
      .sort((a, b) => b.f.received - a.f.received);
  }, [projects, scoped, scopedLoans, investments, investorPayouts, projectFilter]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this transaction? This cannot be undone.')) return;
    setDeletingId(id);
    const res = await deleteTransaction(id);
    setDeletingId(null);
    if (!res.ok) { alert(res.error ?? 'Could not delete.'); return; }
    router.refresh();
  }

  // Bank actions
  function openAddBankModal() {
    setEditingAccount(null);
    setAccName('');
    setBankName('');
    setAccNumber('');
    setAccBranch('');
    setAccInitialBalance('0');
    setBankModalOpen(true);
  }

  function openEditBankModal(acc: any) {
    setEditingAccount(acc);
    setAccName(acc.name);
    setBankName(acc.bankName || '');
    setAccNumber(acc.accountNumber || '');
    setAccBranch(acc.branch || '');
    setAccInitialBalance(String(acc.initialBalance));
    setBankModalOpen(true);
  }

  async function handleSaveBankAccount() {
    if (!accName) { alert('Account name is required'); return; }
    setIsSavingAccount(true);

    const inputData = {
      name: accName,
      bankName: bankName || null,
      accountNumber: accNumber || null,
      branch: accBranch || null,
      initialBalance: parseFloat(accInitialBalance) || 0,
    };

    const res = editingAccount
      ? await updateBankAccount(editingAccount.id, inputData)
      : await createBankAccount(inputData);

    setIsSavingAccount(false);

    if (res.ok) {
      setBankModalOpen(false);
      router.refresh();
    } else {
      alert(res.error || 'Failed to save bank account');
    }
  }

  async function handleDeleteBankAccount(id: string) {
    if (!confirm('Are you sure you want to delete this bank account? This cannot be undone.')) return;
    const res = await deleteBankAccount(id);
    if (res.ok) {
      router.refresh();
    } else {
      alert(res.error || 'Failed to delete bank account');
    }
  }

  function exportCsv() {
    const head = ['Date', 'Project', 'Type', 'Category', 'Details/Who', 'Method', 'Recorded By', 'Amount (PKR)'];
    const esc = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
    const lines = rows.map((t) => [
      fmtDate(t.date), t.project.name, t.type, t.category ?? '',
      t.type === 'DRAWING' ? (t.owner?.name ?? 'Company Account / General Pool') : (t.description ?? ''),
      t.paymentMethod ?? '', t.recordedBy?.name ?? '', String(t.amount),
    ].map(esc).join(','));
    const csv = [head.map(esc).join(','), ...lines].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url; a.download = `ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  const cards = [
    { label: 'Collected', value: fin.received, sub: `of ${pkr(fin.budget)} budget`, icon: TrendingUp, tone: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Receivable', value: fin.receivable, sub: 'still owed by clients', icon: Receipt, tone: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Expenses', value: fin.expense, sub: 'operational spend', icon: TrendingDown, tone: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10' },
    { label: 'Supplier Loans', value: fin.unpaidExpenses, sub: 'unpaid supplier bills', icon: HandCoins, tone: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Start Loans', value: fin.loansOutstanding, sub: 'outstanding start loans', icon: ArrowUpRight, tone: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10' },
    { label: 'Investments', value: fin.totalInvestmentsReceived, sub: `payouts: ${pkr(fin.totalInvestmentsPaid)}`, icon: Wallet, tone: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Partner Payouts', value: fin.drawings, sub: 'equity withdrawn', icon: Users, tone: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Cash on Hand', value: fin.cashOnHand, sub: fin.isDeficit ? 'over-drawn' : 'liquid company funds', icon: Banknote, tone: fin.isDeficit ? 'text-rose-600 dark:text-rose-400' : 'text-foreground', bg: 'bg-violet-500/10' },
  ];

  return (
    <div className="space-y-6">
      {/* View Switcher Tabs */}
      <div className="flex border-b border-border pb-1 flex-wrap">
        <button
          onClick={() => setActiveView('LEDGER')}
          className={cn('text-sm font-semibold px-4 py-2 border-b-2 transition-all mr-4 flex items-center gap-1.5',
            activeView === 'LEDGER' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}
        >
          <PieIcon className="h-4 w-4" /> Overview &amp; Ledger
        </button>
        <button
          onClick={() => setActiveView('BANKS')}
          className={cn('text-sm font-semibold px-4 py-2 border-b-2 transition-all mr-4 flex items-center gap-1.5',
            activeView === 'BANKS' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}
        >
          <Building2 className="h-4 w-4" /> Accounts Setup
          <span className="bg-muted text-foreground text-[10px] px-1.5 py-0.5 rounded-full border">{bankAccounts.length}</span>
        </button>
        <button
          onClick={() => setActiveView('LENDERS')}
          className={cn('text-sm font-semibold px-4 py-2 border-b-2 transition-all mr-4 flex items-center gap-1.5',
            activeView === 'LENDERS' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}
        >
          <ArrowUpRight className="h-4 w-4" /> Lenders Registry
          <span className="bg-muted text-foreground text-[10px] px-1.5 py-0.5 rounded-full border">{lenders.length}</span>
        </button>
        <button
          onClick={() => setActiveView('INVESTORS')}
          className={cn('text-sm font-semibold px-4 py-2 border-b-2 transition-all flex items-center gap-1.5',
            activeView === 'INVESTORS' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}
        >
          <Users className="h-4 w-4" /> Investors Registry
          <span className="bg-muted text-foreground text-[10px] px-1.5 py-0.5 rounded-full border">{investors.length}</span>
        </button>
      </div>

      {activeView === 'LEDGER' ? (
        <div className="space-y-6 animate-fade-in">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
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
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={exportCsv} disabled={rows.length === 0}>
                <Download className="h-4 w-4" /> Export CSV
              </Button>
              {canEdit && (
                <Button size="sm" className="gap-2" onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4" /> New Transaction
                </Button>
              )}
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-8 gap-3">
            {cards.map((c) => (
              <Card key={c.label} className="min-w-0">
                <CardContent className="p-3 sm:p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-semibold text-muted-foreground truncate min-w-0">{c.label}</span>
                    <div className={cn('h-5 w-5 sm:h-6 sm:w-6 rounded-md flex items-center justify-center flex-shrink-0', c.bg)}>
                      <c.icon className={cn('h-3 w-3 sm:h-3.5 sm:w-3.5', c.tone)} />
                    </div>
                  </div>
                  <p className={cn('text-xs sm:text-sm font-bold tabular-nums whitespace-nowrap min-w-0 overflow-hidden text-ellipsis', c.tone)} title={pkr(c.value)}>{pkr(c.value)}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight truncate">{c.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 mb-3">
                  <PieIcon className="h-3.5 w-3.5" /> Money Flow
                </p>
                {flowData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-16">No transactions in this period.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={flowData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                        {flowData.map((d) => <Cell key={d.key} fill={TYPE_COLORS[d.key]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => pkr(v)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 mb-3">
                  <TrendingDown className="h-3.5 w-3.5" /> Expenses by Category
                </p>
                {expenseByCategory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-16">No expenses in this period.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={expenseByCategory} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} fontSize={11} />
                      <YAxis type="category" dataKey="name" width={90} fontSize={11} />
                      <Tooltip formatter={(v: number) => pkr(v)} cursor={{ fill: 'rgba(244,63,94,0.08)' }} />
                      <Bar dataKey="value" fill="#f43f5e" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Per-project breakdown */}
          {projectRollup.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <FolderKanban className="h-3.5 w-3.5" /> By Project
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-muted-foreground text-xs">
                      <tr className="text-left">
                        <th className="py-2 pr-4 font-medium">Project</th>
                        <th className="py-2 px-4 font-medium w-40">Collection</th>
                        <th className="py-2 px-4 font-medium text-right">Collected</th>
                        <th className="py-2 px-4 font-medium text-right">Expenses</th>
                        <th className="py-2 px-4 font-medium text-right">Payouts</th>
                        <th className="py-2 px-4 font-medium text-right">Start Loans</th>
                        <th className="py-2 pl-4 font-medium text-right">Cash on Hand</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {projectRollup.map(({ project, f }) => (
                        <tr key={project.id} className="hover:bg-muted/30">
                          <td className="py-2.5 pr-4">
                            <Link href={`/projects/${project.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                              {project.name}
                            </Link>
                            <p className="text-[11px] text-muted-foreground">{project.company}</p>
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-2">
                              <Progress value={f.collectionPct} className="h-1.5 flex-1" />
                              <span className="text-[11px] text-muted-foreground tabular-nums w-9 text-right">{Math.round(f.collectionPct)}%</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{pkr(f.received)}</td>
                          <td className="py-2.5 px-4 text-right tabular-nums text-rose-600 dark:text-rose-400">{pkr(f.expense)}</td>
                          <td className="py-2.5 px-4 text-right tabular-nums text-amber-600 dark:text-amber-400">{pkr(f.drawings + f.totalInvestmentsPaid)}</td>
                          <td className="py-2.5 px-4 text-right tabular-nums text-indigo-600 dark:text-indigo-400">{pkr(f.loansOutstanding)}</td>
                          <td className={cn('py-2.5 pl-4 text-right tabular-nums font-semibold', f.isDeficit ? 'text-rose-600 dark:text-rose-400' : 'text-foreground')}>{pkr(f.cashOnHand)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Owner breakdown */}
          {fin.ownerBreakdown.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Partner Payouts
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {fin.ownerBreakdown.map((o) => {
                    const pct = fin.drawings > 0 ? (o.total / fin.drawings) * 100 : 0;
                    return (
                      <div key={o.ownerId} className="flex items-center gap-3">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold">{getInitials(o.name)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-foreground flex-1 truncate">{o.name}</span>
                        <div className="w-20 hidden sm:block"><Progress value={pct} className="h-1.5" /></div>
                        <span className="text-sm font-semibold tabular-nums text-amber-600 dark:text-amber-400 w-28 text-right">{pkr(o.total)}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters + search */}
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn('text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors',
                    filter === f ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted/50')}
                >
                  {f === 'ALL' ? 'All types' : TXN_TYPE_CONFIG[f].label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All projects</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search ledger…" className="pl-8 h-9" />
              </div>
            </div>
          </div>

          {/* Ledger table */}
          <div className="rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr className="text-left text-xs">
                    <th className="px-4 py-2.5 font-medium">Date</th>
                    <th className="px-4 py-2.5 font-medium">Project</th>
                    <th className="px-4 py-2.5 font-medium">Type</th>
                    <th className="px-4 py-2.5 font-medium">Category</th>
                    <th className="px-4 py-2.5 font-medium">Details / Who</th>
                    <th className="px-4 py-2.5 font-medium">Method</th>
                    <th className="px-4 py-2.5 font-medium text-right">Amount</th>
                    {canDelete && <th className="px-2 py-2.5" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((t) => {
                    const cfg = TXN_TYPE_CONFIG[t.type as TransactionType];
                    const who = t.who;
                    const unpaid = t.type === 'EXPENSE' && t.isPaid === false;
                    return (
                      <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap tabular-nums">{fmtDate(t.date)}</td>
                        <td className="px-4 py-2.5">
                          {t.project.id === 'company' ? (
                             <span className="text-muted-foreground italic font-medium">{t.project.name}</span>
                           ) : (
                             <Link href={`/projects/${t.project.id}`} className="text-foreground/80 hover:text-primary transition-colors">{t.project.name}</Link>
                           )}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-md', cfg?.badge)}>{cfg?.label}</span>
                            {unpaid && (
                              <span className="text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-md">
                                Unpaid
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-foreground/80">{t.category ?? '-'}</td>
                        <td className="px-4 py-2.5 text-foreground/80 max-w-[14rem]">
                          <div className="truncate font-semibold">{who || <span className="text-muted-foreground/50">-</span>}</div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {unpaid && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 px-1 rounded">Unpaid</span>
                            )}
                            {t.vendorInvoiceNo && (
                              <span className="text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 px-1.5 py-0.5 rounded font-semibold">
                                Invoice: {t.vendorInvoiceNo}
                              </span>
                            )}
                            {t.invoiceUrl && (
                              <a
                                href={t.invoiceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-0.5"
                              >
                                <FileText className="h-3 w-3" /> View Doc
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{unpaid ? <span className="text-amber-500">-</span> : t.paymentMethod ?? '-'}</td>
                        <td className={cn('px-4 py-2.5 text-right font-semibold tabular-nums whitespace-nowrap', cfg?.amount)}>
                          {cfg?.sign}{pkr(t.amount)}
                        </td>
                        {canDelete && (
                          <td className="px-2 py-2.5">
                            {t.isOriginalTxn && (
                              <button onClick={() => handleDelete(t.id)} disabled={deletingId === t.id}
                                className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40" title="Delete">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={canDelete ? 8 : 7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                        {transactions.length === 0
                          ? 'No transactions recorded yet. Use “New Transaction” to log the first one.'
                          : 'No transactions match these filters.'}
                      </td>
                    </tr>
                  )}
                </tbody>
                {rows.length > 0 && (
                  <tfoot className="border-t-2 border-border bg-muted/30">
                    <tr className="text-sm font-semibold">
                      <td className="px-4 py-2.5" colSpan={canDelete ? 7 : 6}>
                        {rows.length} transaction{rows.length !== 1 ? 's' : ''} · Net (income − expense)
                      </td>
                      <td className={cn('px-4 py-2.5 text-right tabular-nums', (fin.revenue - fin.expense) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                        {pkr(fin.revenue - fin.expense)}
                      </td>
                      {canDelete && <td />}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>

      ) : activeView === 'BANKS' ? (
        /* Accounts setup view */
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between gap-2 border-b pb-2">
            <h3 className="font-semibold text-sm text-foreground">Treasury Bank Accounts &amp; Vaults</h3>
            {canEdit && (
              <Button size="sm" onClick={openAddBankModal} className="h-8 gap-1 text-xs">
                <Plus className="h-3.5 w-3.5" /> Add Account
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bankAccounts.map((acc) => (
              <Card key={acc.id} className="hover:shadow-md transition-shadow relative group">
                <CardContent className="p-4 space-y-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <Building2 className="h-4 w-4 text-primary" /> {acc.name}
                      </h4>
                      {acc.bankName && <p className="text-xs text-muted-foreground">{acc.bankName}</p>}
                      {acc.accountNumber && (
                        <p className="text-xs text-muted-foreground/80 font-mono tracking-wider">{acc.accountNumber}</p>
                      )}
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditBankModal(acc)}
                          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit account details"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteBankAccount(acc.id)}
                            className="p-1 hover:bg-rose-50 hover:text-rose-600 rounded text-muted-foreground transition-colors"
                            title="Delete account"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-muted-foreground">Credits (+)</span>
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">+{formatCurrency(acc.credits)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-muted-foreground">Debits (−)</span>
                      <p className="font-semibold text-rose-600 dark:text-rose-400 tabular-nums">−{formatCurrency(acc.debits)}</p>
                    </div>
                    <div className="space-y-0.5 text-right">
                      <span className="text-[10px] text-muted-foreground">Balance</span>
                      <p className={cn('font-bold tabular-nums', acc.balance >= 0 ? 'text-foreground' : 'text-rose-600 dark:text-rose-400')}>
                        {acc.balance < 0 ? '−' : ''}PKR {formatCurrency(Math.abs(acc.balance))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {bankAccounts.length === 0 && (
              <div className="col-span-full border-2 border-dashed border-border rounded-xl p-10 text-center space-y-3 bg-muted/20">
                <Building2 className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                <div>
                  <h4 className="text-sm font-semibold text-foreground">No bank accounts setup yet</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Setup bank accounts to link with transaction expenses and credit start loans.</p>
                </div>
                {canEdit && (
                  <Button size="sm" onClick={openAddBankModal}>Add Bank Account</Button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : activeView === 'LENDERS' ? (
        /* Lenders Registry View */
        <div className="space-y-4 animate-fade-in">
          <div className="rounded-xl border overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Lender Name</th>
                    <th className="px-4 py-3 font-medium">Contact Details</th>
                    <th className="px-4 py-3 font-medium">Address / Branch</th>
                    <th className="px-4 py-3 font-medium text-right">Total Borrowed</th>
                    <th className="px-4 py-3 font-medium text-right">Accrued Interest</th>
                    <th className="px-4 py-3 font-medium text-right">Total Repaid</th>
                    <th className="px-4 py-3 font-medium text-right">Outstanding Balance</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lenders.map((l: any) => (
                    <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground">
                        <button onClick={() => setPartyModal({ kind: 'lender', id: l.id, mode: 'detail' })} className="text-left hover:text-primary hover:underline">
                          {l.name}
                        </button>
                        {l.contactName && <p className="text-[11px] text-muted-foreground font-normal">{l.contactName}</p>}
                        {l.notes && <p className="text-[11px] text-muted-foreground font-normal">{l.notes}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {l.phone && <p>Phone: {l.phone}</p>}
                        {l.email && <p>Email: {l.email}</p>}
                        {!l.phone && !l.email && '-'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground truncate max-w-[12rem]">{l.address || '-'}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold">{pkr(l.totalBorrowed)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-rose-600 font-medium">+{pkr(l.totalInterest)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-emerald-600 font-semibold">{pkr(l.totalPaid)}</td>
                      <td className={cn('px-4 py-3 text-right tabular-nums font-bold', l.outstanding > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-muted-foreground')}>
                        {l.outstanding <= 0 ? 'Repaid' : pkr(l.outstanding)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button onClick={() => setPartyModal({ kind: 'lender', id: l.id, mode: 'detail' })} title="View transactions" className="p-1 text-muted-foreground hover:text-primary"><Info className="h-4 w-4" /></button>
                        {canEdit && <button onClick={() => setPartyModal({ kind: 'lender', id: l.id, mode: 'edit' })} title="Edit" className="p-1 text-muted-foreground hover:text-primary"><Edit2 className="h-4 w-4" /></button>}
                      </td>
                    </tr>
                  ))}
                  {lenders.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        No registered lenders found in the system.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Investors Registry View */
        <div className="space-y-4 animate-fade-in">
          <div className="rounded-xl border overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Investor Name</th>
                    <th className="px-4 py-3 font-medium">Contact Details</th>
                    <th className="px-4 py-3 font-medium">Address</th>
                    <th className="px-4 py-3 font-medium text-right">Total Invested</th>
                    <th className="px-4 py-3 font-medium text-right">Total Distributed</th>
                    <th className="px-4 py-3 font-medium text-right">Net capital</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {investors.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground">
                        <button onClick={() => setPartyModal({ kind: 'investor', id: inv.id, mode: 'detail' })} className="text-left hover:text-primary hover:underline">
                          {inv.name}
                        </button>
                        {inv.contactName && <p className="text-[11px] text-muted-foreground font-normal">{inv.contactName}</p>}
                        {inv.notes && <p className="text-[11px] text-muted-foreground font-normal">{inv.notes}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {inv.phone && <p>Phone: {inv.phone}</p>}
                        {inv.email && <p>Email: {inv.email}</p>}
                        {!inv.phone && !inv.email && '-'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground truncate max-w-[12rem]">{inv.address || '-'}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold">{pkr(inv.totalInvested)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-amber-600 font-semibold">{pkr(inv.totalPayouts)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-bold text-foreground">{pkr(inv.netOwed)}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button onClick={() => setPartyModal({ kind: 'investor', id: inv.id, mode: 'detail' })} title="View transactions" className="p-1 text-muted-foreground hover:text-primary"><Info className="h-4 w-4" /></button>
                        {canEdit && <button onClick={() => setPartyModal({ kind: 'investor', id: inv.id, mode: 'edit' })} title="Edit" className="p-1 text-muted-foreground hover:text-primary"><Edit2 className="h-4 w-4" /></button>}
                      </td>
                    </tr>
                  ))}
                  {investors.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        No registered investors found in the system.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Lender / Investor detail + edit modal */}
      <RegistryPartyModal state={partyModal} onClose={() => setPartyModal(null)} canDelete={canDelete} />

      {/* Bank Account Create/Edit Dialog */}
      <Dialog open={bankModalOpen} onOpenChange={setBankModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {editingAccount ? 'Edit Bank Account' : 'Add Bank Account'}
            </DialogTitle>
            <DialogDescription>Setup a bank account or office cash vault to track cash flows.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="acc-name">Account Display Name *</Label>
              <Input id="acc-name" placeholder="e.g. Bank Islami - Raju Branch" value={accName} onChange={(e) => setAccName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bank-name">Bank Name</Label>
              <Input id="bank-name" placeholder="e.g. Bank Islami Pakistan" value={bankName} onChange={(e) => setBankName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-num">Account Number</Label>
              <Input id="acc-num" placeholder="e.g. 1024-001254-001" value={accNumber} onChange={(e) => setAccNumber(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-branch">Branch</Label>
              <Input id="acc-branch" placeholder="e.g. Head Office / Gulshan" value={accBranch} onChange={(e) => setAccBranch(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-balance">Initial Balance (PKR)</Label>
              <Input id="acc-balance" type="number" placeholder="0" disabled={!!editingAccount} value={accInitialBalance} onChange={(e) => setAccInitialBalance(e.target.value)} />
              {!editingAccount && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" /> Initial deposits / starting balance
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setBankModalOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleSaveBankAccount} disabled={isSavingAccount}>
                {isSavingAccount ? 'Saving…' : 'Save Account'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <TransactionModal
        open={addOpen}
        onOpenChange={setAddOpen}
        projects={projects}
        owners={owners}
        bankAccounts={bankAccounts.map(acc => ({ id: acc.id, name: acc.name }))}
        lenders={lenders}
        investors={investors}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
