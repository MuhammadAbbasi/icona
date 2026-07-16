'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wallet, Plus, Search, TrendingUp, TrendingDown, Banknote,
  Users, Trash2, AlertTriangle, Receipt, FileSpreadsheet,
  Edit2, Check, X, RefreshCw, HandCoins, Info, ArrowUpRight, DollarSign, LineChart, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, formatCurrency, formatPKR, getInitials } from '@/lib/utils';
import { TXN_TYPE_CONFIG, PAYMENT_METHODS, type ProjectFinancials, type TransactionType } from '@/lib/finance';
import { deleteTransaction, payTransaction } from '@/app/actions/transactions';
import { updateProjectBudget } from '@/app/actions/projects';
import { repayLoan, deleteLoan } from '@/app/actions/loans';
import { payInvestor } from '@/app/actions/investments';
import { TransactionModal, type OwnerOption } from './TransactionModal';

interface LedgerTxn {
  id: string;
  type: string;
  amount: number;
  date: string | Date;
  category?: string | null;
  description?: string | null;
  paymentMethod?: string | null;
  isPaid?: boolean | null;
  dueDate?: string | Date | null;
  vendorInvoiceNo?: string | null;
  invoiceUrl?: string | null;
  invoicePath?: string | null;
  owner?: { id: string; name: string } | null;
  recordedBy?: { id: string; name: string } | null;
  bankAccount?: { id: string; name: string } | null;
}

interface Props {
  projectId: string;
  transactions: LedgerTxn[];
  financials: ProjectFinancials;
  boqValue: number;
  owners: OwnerOption[];
  bankAccounts: { id: string; name: string }[];
  loans: any[];
  investments?: any[];
  investorPayouts?: any[];
  lenders?: any[];
  investors?: any[];
  canEdit: boolean;
  canDelete: boolean;
}

const pkr = (n: number) => `PKR ${formatCurrency(n)}`;
const FILTERS: Array<'ALL' | TransactionType> = ['ALL', 'INCOME', 'EXPENSE', 'DRAWING'];

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function ProjectLedger({
  projectId,
  transactions,
  financials,
  boqValue,
  owners,
  bankAccounts,
  loans,
  investments = [],
  investorPayouts = [],
  lenders = [],
  investors = [],
  canEdit,
  canDelete
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'LEDGER'>('LEDGER');
  
  // Ledger actions
  const [addOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'ALL' | TransactionType>('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Budget editing
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState(String(financials.budget));
  const [isUpdatingBudget, setIsUpdatingBudget] = useState(false);

  // Pay Supplier Loan states
  const [payTxnId, setPayTxnId] = useState<string | null>(null);
  const [payBillAmount, setPayBillAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Bank');
  const [payBankAccountId, setPayBankAccountId] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [isPaying, setIsPaying] = useState(false);

  const selectedPayTxn = useMemo(() => {
    return transactions.find(t => t.id === payTxnId);
  }, [transactions, payTxnId]);

  // Loan repayment states
  const [repayLoanId, setRepayLoanId] = useState<string | null>(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayDate, setRepayDate] = useState(new Date().toISOString().slice(0, 10));
  const [repayMethod, setRepayMethod] = useState('Bank');
  const [repayBankAccountId, setRepayBankAccountId] = useState('');
  const [repayNotes, setRepayNotes] = useState('');
  const [isSavingRepayment, setIsSavingRepayment] = useState(false);

  const selectedRepayLoan = useMemo(() => {
    return loans.find(l => l.id === repayLoanId);
  }, [loans, repayLoanId]);

  const repaymentInterestCost = useMemo(() => {
    if (!selectedRepayLoan || !repayDate) return 0;
    const principal = selectedRepayLoan.amount || 0;
    const rate = selectedRepayLoan.interestRate || 0;
    if (principal <= 0 || rate <= 0) return 0;

    const dReceived = new Date(selectedRepayLoan.receivedDate);
    const dRepay = new Date(repayDate);
    const msDiff = dRepay.getTime() - dReceived.getTime();
    const days = Math.floor(msDiff / (1000 * 60 * 60 * 24));
    if (days <= 0) return 0;

    return Math.round(principal * (rate / 100) * (days / 365));
  }, [selectedRepayLoan, repayDate]);

  const totalOwedToDate = useMemo(() => {
    if (!selectedRepayLoan) return 0;
    return selectedRepayLoan.amount + repaymentInterestCost;
  }, [selectedRepayLoan, repaymentInterestCost]);

  const outstandingBalanceToDate = useMemo(() => {
    if (!selectedRepayLoan) return 0;
    return totalOwedToDate - selectedRepayLoan.amountPaid;
  }, [selectedRepayLoan, totalOwedToDate]);

  // Investor Payout states
  const [investorPayoutOpen, setInvestorPayoutOpen] = useState(false);
  const [selectedInvestorId, setSelectedInvestorId] = useState('');
  const [selectedInvestorName, setSelectedInvestorName] = useState('');
  const [investorPayoutAmount, setInvestorPayoutAmount] = useState('');
  const [investorPayoutDate, setInvestorPayoutDate] = useState(new Date().toISOString().slice(0, 10));
  const [investorPayoutMethod, setInvestorPayoutMethod] = useState('Bank');
  const [investorPayoutBankAccountId, setInvestorPayoutBankAccountId] = useState('');
  const [investorPayoutNotes, setInvestorPayoutNotes] = useState('');
  const [isSavingInvestorPayout, setIsSavingInvestorPayout] = useState(false);

  const rows = useMemo(() => {
    const list: any[] = transactions.map(t => ({
      id: t.id,
      date: t.date,
      type: t.type,
      category: t.category,
      who: t.type === 'DRAWING' ? (t.owner?.name ?? 'Company Account / General Pool') : t.description,
      paymentMethod: t.paymentMethod,
      bankAccount: t.bankAccount,
      amount: t.amount,
      unpaid: t.type === 'EXPENSE' && t.isPaid === false,
      dueDate: t.dueDate,
      vendorInvoiceNo: t.vendorInvoiceNo,
      invoiceUrl: t.invoiceUrl,
      invoicePath: t.invoicePath,
      description: t.description,
      isOriginalTxn: true
    }));

    // Merge investments
    for (const inv of investments) {
      list.push({
        id: inv.id,
        date: inv.date,
        type: 'INCOME',
        category: 'Investor Investment',
        who: inv.investor?.name || inv.investorName || 'Investor',
        paymentMethod: 'Bank',
        bankAccount: inv.bankAccount,
        amount: inv.amount,
        unpaid: false,
        description: inv.notes,
        isOriginalTxn: false
      });
    }

    // Merge investor payouts
    for (const ip of investorPayouts) {
      list.push({
        id: ip.id,
        date: ip.date,
        type: 'DRAWING',
        category: 'Investor Profit Distribution',
        who: ip.investor?.name || 'Investor',
        paymentMethod: ip.paymentMethod,
        bankAccount: ip.bankAccount,
        amount: ip.amount,
        unpaid: false,
        description: ip.notes,
        isOriginalTxn: false
      });
    }

    // Merge loans & repayments
    for (const l of loans) {
      list.push({
        id: l.id,
        date: l.receivedDate,
        type: 'INCOME',
        category: 'Startup Loan',
        who: l.provider || 'Lender',
        paymentMethod: 'Bank',
        bankAccount: l.bankAccount,
        amount: l.amount,
        unpaid: false,
        description: l.notes,
        isOriginalTxn: false
      });

      if (l.repayments) {
        for (const r of l.repayments) {
          list.push({
            id: r.id,
            date: r.date,
            type: 'DRAWING',
            category: 'Startup Loan Repayment',
            who: l.provider || 'Lender',
            paymentMethod: r.paymentMethod,
            bankAccount: r.bankAccount,
            amount: r.amount,
            unpaid: false,
            description: r.notes,
            isOriginalTxn: false
          });
        }
      }
    }

    const q = query.trim().toLowerCase();
    return list
      .filter((t) => filter === 'ALL' || t.type === filter)
      .filter((t) => !q || [t.category, t.who, t.paymentMethod, t.description]
        .some((v) => v?.toLowerCase().includes(q)))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, investments, investorPayouts, loans, query, filter]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this transaction? This cannot be undone.')) return;
    setDeletingId(id);
    const res = await deleteTransaction(id);
    setDeletingId(null);
    if (!res.ok) { alert(res.error ?? 'Could not delete.'); return; }
    router.refresh();
  }

  async function handleUpdateBudget(value: number) {
    setIsUpdatingBudget(true);
    const res = await updateProjectBudget(projectId, value);
    setIsUpdatingBudget(false);
    if (res.ok) {
      setIsEditingBudget(false);
      router.refresh();
    } else {
      alert(res.error || 'Failed to update budget.');
    }
  }

  async function handlePayConfirm() {
    if (!payTxnId) return;
    const amt = parseFloat(payBillAmount);
    if (!amt || amt <= 0) { alert('Enter a positive payment amount'); return; }

    setIsPaying(true);
    const res = await payTransaction(payTxnId, payBankAccountId || 'none', payMethod, payDate, amt);
    setIsPaying(false);
    if (res.ok) {
      setPayTxnId(null);
      setPayBankAccountId('');
      setPayMethod('Bank');
      setPayBillAmount('');
      router.refresh();
    } else {
      alert(res.error || 'Failed to record payment.');
    }
  }

  async function handleInvestorPayout() {
    const amt = parseFloat(investorPayoutAmount);
    if (!selectedInvestorId) return;
    if (!amt || amt <= 0) { alert('Enter a positive payout amount'); return; }

    setIsSavingInvestorPayout(true);
    const res = await payInvestor({
      investorId: selectedInvestorId,
      projectId,
      amount: amt,
      date: investorPayoutDate,
      paymentMethod: investorPayoutMethod,
      bankAccountId: investorPayoutBankAccountId || null,
      notes: investorPayoutNotes || null,
    });
    setIsSavingInvestorPayout(false);

    if (res.ok) {
      setInvestorPayoutOpen(false);
      setInvestorPayoutAmount('');
      setInvestorPayoutNotes('');
      setInvestorPayoutBankAccountId('');
      router.refresh();
    } else {
      alert(res.error || 'Failed to save payout');
    }
  }

  async function handleRepayLoan() {
    const amt = parseFloat(repayAmount);
    if (!repayLoanId) return;
    if (!amt || amt <= 0) { alert('Enter a positive repayment amount'); return; }

    setIsSavingRepayment(true);
    const res = await repayLoan({
      loanId: repayLoanId,
      amount: amt,
      date: repayDate,
      paymentMethod: repayMethod,
      bankAccountId: repayBankAccountId || null,
      notes: repayNotes || null,
    });
    setIsSavingRepayment(false);

    if (res.ok) {
      setRepayLoanId(null);
      setRepayAmount('');
      setRepayNotes('');
      setRepayBankAccountId('');
      router.refresh();
    } else {
      alert(res.error || 'Failed to save repayment');
    }
  }

  async function handleDeleteLoan(loanId: string) {
    if (!confirm('Are you sure you want to delete this loan? Repayments will also be deleted.')) return;
    const res = await deleteLoan(loanId);
    if (res.ok) {
      router.refresh();
    } else {
      alert(res.error || 'Failed to delete loan');
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Project Treasury &amp; Ledger</h2>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> New Transaction
            </Button>
          )}
        </div>
      </div>

      {/* Financial Summary Cards Grid - 2 rows of 4 cards */}
      <div className="space-y-4">
        {/* Row 1: Core funds */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* BOQ Value Card */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">BOQ Value</span>
                <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-indigo-500/10">
                  <FileSpreadsheet className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
              <p className="text-xl font-bold tabular-nums text-indigo-600 dark:text-indigo-400">{formatPKR(boqValue)}</p>
              <div className="text-[11px] text-muted-foreground min-h-[1.5rem] flex flex-col justify-between">
                <span>approved contract scope</span>
                {canEdit && financials.budget !== boqValue && (
                  <button
                    onClick={() => handleUpdateBudget(boqValue)}
                    disabled={isUpdatingBudget}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-semibold underline mt-1 flex items-center gap-1"
                  >
                    {isUpdatingBudget && <RefreshCw className="h-2.5 w-2.5 animate-spin" />}
                    Apply as Project Budget
                  </button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Collected Card */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Collected</span>
                <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-emerald-500/10">
                  <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{pkr(financials.received)}</p>
              <div className="text-[11px] text-muted-foreground min-h-[1.5rem] flex flex-col justify-end">
                {isEditingBudget ? (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Input
                      type="number"
                      value={tempBudget}
                      onChange={(e) => setTempBudget(e.target.value)}
                      className="h-6 w-32 text-xs px-1.5 py-0"
                      disabled={isUpdatingBudget}
                      autoFocus
                    />
                    <button
                      onClick={() => handleUpdateBudget(parseFloat(tempBudget) || 0)}
                      disabled={isUpdatingBudget}
                      className="p-0.5 hover:bg-muted rounded text-emerald-600 disabled:opacity-50 flex-shrink-0"
                      title="Save"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => { setIsEditingBudget(false); setTempBudget(String(financials.budget)); }}
                      disabled={isUpdatingBudget}
                      className="p-0.5 hover:bg-muted rounded text-rose-600 disabled:opacity-50 flex-shrink-0"
                      title="Cancel"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 mt-1">
                    <span>of {pkr(financials.budget)} budget</span>
                    {canEdit && (
                      <button
                        onClick={() => { setIsEditingBudget(true); setTempBudget(String(financials.budget)); }}
                        className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                        title="Edit Budget"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Receivable Card */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Receivable</span>
                <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-blue-500/10">
                  <Receipt className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <p className="text-xl font-bold tabular-nums text-blue-600 dark:text-blue-400">{formatPKR(financials.receivable)}</p>
              <p className="text-[11px] text-muted-foreground min-h-[1.5rem] flex items-end">still owed by client</p>
            </CardContent>
          </Card>

          {/* Cash on Hand Card */}
          <Card className={cn(financials.isDeficit ? 'border-rose-300 dark:border-rose-900/50' : '')}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Cash on Hand</span>
                <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center', financials.isDeficit ? 'bg-rose-500/10' : 'bg-violet-500/10')}>
                  <Banknote className={cn('h-4 w-4', financials.isDeficit ? 'text-rose-600 dark:text-rose-400' : 'text-violet-600 dark:text-violet-400')} />
                </div>
              </div>
              <p className={cn('text-xl font-bold tabular-nums', financials.isDeficit ? 'text-rose-600 dark:text-rose-400' : 'text-foreground')}>{pkr(financials.cashOnHand)}</p>
              <p className="text-[11px] text-muted-foreground min-h-[1.5rem] flex items-end">
                {financials.isDeficit ? 'over-drawn cash' : 'liquid budget funds'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Spend, Liabilities & Investments */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Operational Spend Card */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Operational Spend</span>
                <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-rose-500/10">
                  <TrendingDown className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                </div>
              </div>
              <p className="text-xl font-bold tabular-nums text-rose-600 dark:text-rose-400">{pkr(financials.expense)}</p>
              <p className="text-[11px] text-muted-foreground min-h-[1.5rem] flex items-end">expenses (OPEX)</p>
            </CardContent>
          </Card>

          {/* Supplier Loans (Unpaid) */}
          <Card className={cn(financials.unpaidExpenses > 0 ? 'border-amber-300 dark:border-amber-900/50' : '')}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Supplier Loans (Unpaid)</span>
                <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center', financials.unpaidExpenses > 0 ? 'bg-amber-500/10' : 'bg-muted')}>
                  <HandCoins className={cn('h-4 w-4', financials.unpaidExpenses > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')} />
                </div>
              </div>
              <p className={cn('text-xl font-bold tabular-nums', financials.unpaidExpenses > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}>{pkr(financials.unpaidExpenses)}</p>
              <p className="text-[11px] text-muted-foreground min-h-[1.5rem] flex items-end">unpaid supplier credit</p>
            </CardContent>
          </Card>

          {/* Start Loans (Outstanding) */}
          <Card className={cn(financials.loansOutstanding > 0 ? 'border-indigo-300 dark:border-indigo-900/50' : '')}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Start Loans (Outstanding)</span>
                <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center', financials.loansOutstanding > 0 ? 'bg-indigo-500/10' : 'bg-muted')}>
                  <ArrowUpRight className={cn('h-4 w-4', financials.loansOutstanding > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-muted-foreground')} />
                </div>
              </div>
              <p className={cn('text-xl font-bold tabular-nums', financials.loansOutstanding > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-muted-foreground')}>{pkr(financials.loansOutstanding)}</p>
              <div className="flex items-center justify-between gap-2 mt-2">
                <p className="text-[11px] text-muted-foreground">lumpsum startup loans</p>
                {canEdit && financials.loansOutstanding > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-5 text-[9px] border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-900"
                    onClick={() => {
                      const firstOutstanding = loans.find(l => l.totalPayable - l.amountPaid > 0);
                      if (firstOutstanding) {
                        setRepayLoanId(firstOutstanding.id);
                        setRepayAmount(String(firstOutstanding.totalPayable - firstOutstanding.amountPaid));
                      } else {
                        setRepayLoanId('select');
                        setRepayAmount('');
                      }
                    }}
                  >
                    Repay Loan
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Investments Card */}
          <Card className={cn(financials.totalInvestmentsReceived > 0 ? 'border-blue-300 dark:border-blue-900/50' : '')}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Investments</span>
                <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center', financials.totalInvestmentsReceived > 0 ? 'bg-blue-500/10' : 'bg-muted')}>
                  <LineChart className={cn('h-4 w-4', financials.totalInvestmentsReceived > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground')} />
                </div>
              </div>
              <p className={cn('text-xl font-bold tabular-nums', financials.totalInvestmentsReceived > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground')}>{pkr(financials.totalInvestmentsReceived)}</p>
              <div className="flex items-center justify-between gap-2 mt-2">
                <p className="text-[11px] text-muted-foreground">
                  {financials.totalInvestmentsPaid > 0 ? `Paid: ${pkr(financials.totalInvestmentsPaid)}` : 'project investor capital'}
                </p>
                {canEdit && financials.totalInvestmentsReceived > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-5 text-[9px] border-blue-200 text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-900"
                    onClick={() => {
                      setSelectedInvestorId('');
                      setSelectedInvestorName('');
                      setInvestorPayoutAmount('');
                      setInvestorPayoutOpen(true);
                    }}
                  >
                    Distribute Profit
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Partner Payouts Card */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Total Payouts</span>
                <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-amber-500/10">
                  <Users className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <p className="text-xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{pkr(financials.drawings + financials.totalInvestmentsPaid)}</p>
              <p className="text-[11px] text-muted-foreground min-h-[1.5rem] flex items-end">drawings &amp; investor profit</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Deficit / Payout alerts */}
      {financials.isDeficit && (
        <div className="flex items-center gap-2 p-3.5 bg-rose-50 border border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-300 text-xs">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span><strong>Project Deficit Alert</strong>: actual payments &amp; withdrawals exceed client receipts by PKR {formatCurrency(Math.abs(financials.cashOnHand))}.</span>
        </div>
      )}

      {/* Owner breakdown */}
      {financials.ownerBreakdown.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Partner Payouts Breakdown
            </p>
            <div className="space-y-2">
              {financials.ownerBreakdown.map((o) => {
                const pct = financials.drawings > 0 ? (o.total / financials.drawings) * 100 : 0;
                return (
                  <div key={o.ownerId} className="flex items-center gap-3">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold">
                        {getInitials(o.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-foreground flex-1 truncate">{o.name}</span>
                    <div className="w-24 hidden sm:block"><Progress value={pct} className="h-1.5" /></div>
                    <span className="text-sm font-semibold tabular-nums text-amber-600 dark:text-amber-400 w-28 text-right">{pkr(o.total)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4 animate-fade-in">
          {/* Filters + search */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex items-center gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors',
                    filter === f ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted/50'
                  )}
                >
                  {f === 'ALL' ? 'All' : TXN_TYPE_CONFIG[f].label}
                </button>
              ))}
            </div>
            <div className="relative sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search ledger…"
                className="pl-8 h-9"
              />
            </div>
          </div>

          {/* Ledger table */}
          <div className="rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr className="text-left text-xs">
                    <th className="px-4 py-2.5 font-medium">Date</th>
                    <th className="px-4 py-2.5 font-medium">Type</th>
                    <th className="px-4 py-2.5 font-medium">Category</th>
                    <th className="px-4 py-2.5 font-medium">Details / Who</th>
                    <th className="px-4 py-2.5 font-medium">Method / Account</th>
                    <th className="px-4 py-2.5 font-medium text-right">Amount</th>
                    {(canEdit || canDelete) && <th className="px-2 py-2.5 text-center">Actions</th>}
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
                          <div className="flex items-center gap-1.5">
                            <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-md', cfg?.badge)}>{cfg?.label}</span>
                            {unpaid && (
                              <span className="text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                <HandCoins className="h-2.5 w-2.5" /> Unpaid
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-foreground/80">{t.category ?? '-'}</td>
                        <td className="px-4 py-2.5 text-foreground/80 max-w-[16rem]">
                          <div className="truncate font-semibold">{who || <span className="text-muted-foreground/50">-</span>}</div>
                          {t.type === 'DRAWING' && t.description && <span className="text-xs text-muted-foreground"> · {t.description}</span>}
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {unpaid && t.dueDate && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 px-1 rounded">Due: {fmtDate(t.dueDate)}</span>
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
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {unpaid ? (
                            <span className="text-amber-500">—</span>
                          ) : (
                            t.paymentMethod ?? '-'
                          )}
                        </td>
                        <td className={cn('px-4 py-2.5 text-right font-semibold tabular-nums whitespace-nowrap', cfg?.amount)}>
                          {cfg?.sign}{pkr(t.amount)}
                        </td>
                        {(canEdit || canDelete) && (
                          <td className="px-2 py-2.5">
                            <div className="flex items-center justify-center gap-2">
                              {t.isOriginalTxn && unpaid && canEdit && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-[10px] border-amber-300 text-amber-700 hover:bg-amber-500/5 dark:text-amber-400 dark:border-amber-900"
                                  onClick={() => { setPayTxnId(t.id); setPayBillAmount(String(t.amount)); setPayDate(new Date().toISOString().slice(0, 10)); }}
                                >
                                  Pay Now
                                </Button>
                              )}
                              {t.isOriginalTxn && canDelete && (
                                <button
                                  onClick={() => handleDelete(t.id)}
                                  disabled={deletingId === t.id}
                                  className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40 p-1 rounded hover:bg-muted"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        {transactions.length === 0
                          ? 'No transactions yet. Record the first client payment or expense.'
                          : 'No transactions match your filter.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      {/* Pay Supplier Loan Dialog */}
      <Dialog open={payTxnId !== null} onOpenChange={(v) => !v && setPayTxnId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <HandCoins className="h-5 w-5" /> Pay Supplier Bill
            </DialogTitle>
            <DialogDescription>Mark this supplier goods loan as paid and record the cash outflow.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Payment Date</Label>
              <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Amount (PKR) *</Label>
              <Input
                type="number"
                placeholder="0"
                value={payBillAmount}
                onChange={(e) => setPayBillAmount(e.target.value)}
              />
            </div>

            {selectedPayTxn && payBillAmount && (
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 rounded-lg text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-indigo-600 dark:text-indigo-400 font-medium">Original Bill Amount:</span>
                  <span className="font-semibold">{pkr(selectedPayTxn.amount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-indigo-600 dark:text-indigo-400 font-medium">Amount to Pay:</span>
                  <span className="font-bold text-sm text-indigo-700 dark:text-indigo-300">{pkr(parseFloat(payBillAmount) || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Payment Type:</span>
                  <span className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                    (parseFloat(payBillAmount) || 0) >= selectedPayTxn.amount - 0.01
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}>
                    {(parseFloat(payBillAmount) || 0) >= selectedPayTxn.amount - 0.01 ? 'Full Payment' : 'Partial Payment'}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-indigo-100 dark:border-indigo-900/50 mt-1 pt-1">
                  <span className="text-muted-foreground">Remaining Bill Balance after payment:</span>
                  <span className="font-bold">{pkr(Math.max(0, selectedPayTxn.amount - (parseFloat(payBillAmount) || 0)))}</span>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Payment Method</Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Bank Account</Label>
                <Select value={payBankAccountId || undefined} onValueChange={setPayBankAccountId}>
                  <SelectTrigger><SelectValue placeholder="Select account…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Cash/Other)</SelectItem>
                    {bankAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setPayTxnId(null)}>Cancel</Button>
              <Button className="flex-1" onClick={handlePayConfirm} disabled={isPaying}>
                {isPaying ? 'Processing…' : 'Record Payment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Loan Repayment Dialog */}
      <Dialog open={repayLoanId !== null} onOpenChange={(v) => !v && setRepayLoanId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-600">
              <HandCoins className="h-5 w-5" /> Repay Start Loan
            </DialogTitle>
            <DialogDescription>Record a cash repayment towards this lumpsum start loan.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Select Start Loan to Repay</Label>
              <Select value={repayLoanId || undefined} onValueChange={(val) => {
                setRepayLoanId(val);
                const l = loans.find(x => x.id === val);
                if (l) {
                  setRepayAmount(String(l.totalPayable - l.amountPaid));
                }
              }}>
                <SelectTrigger><SelectValue placeholder="Choose a loan..." /></SelectTrigger>
                <SelectContent>
                  {loans.filter(l => l.totalPayable - l.amountPaid > 0).map(l => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.provider} - Owed: {pkr(l.totalPayable - l.amountPaid)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedRepayLoan && (
            <div className="p-3 bg-muted rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Original Principal:</span>
                <span className="font-semibold">{pkr(selectedRepayLoan.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Received Date:</span>
                <span className="font-semibold">{fmtDate(selectedRepayLoan.receivedDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Interest Rate:</span>
                <span className="font-semibold">{selectedRepayLoan.interestRate}% P.A.</span>
              </div>
              <div className="flex justify-between border-t border-dashed mt-1.5 pt-1.5 text-amber-700 dark:text-amber-400 font-medium">
                <span>Accrued Interest (to Repay Date):</span>
                <span>+{pkr(repaymentInterestCost)}</span>
              </div>
              <div className="flex justify-between font-bold text-foreground">
                <span>Total Owed to Date:</span>
                <span>{pkr(totalOwedToDate)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Amount Paid So Far:</span>
                <span>-{pkr(selectedRepayLoan.amountPaid)}</span>
              </div>
              <div className="flex justify-between border-t border-dashed font-bold mt-1.5 pt-1.5 text-indigo-600 dark:text-indigo-400">
                <span>Estimated Remaining Balance:</span>
                <span>{pkr(outstandingBalanceToDate)}</span>
              </div>
            </div>
          )}
            <div className="space-y-1.5">
              <Label>Repayment Amount (PKR) *</Label>
              <Input type="number" placeholder="0" value={repayAmount} onChange={(e) => setRepayAmount(e.target.value)} />
            </div>

            {selectedRepayLoan && repayAmount && (
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 rounded-lg text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-indigo-600 dark:text-indigo-400 font-medium">Amount to Pay:</span>
                  <span className="font-bold text-base text-indigo-700 dark:text-indigo-300">{pkr(parseFloat(repayAmount) || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Repayment Type:</span>
                  <span className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                    (parseFloat(repayAmount) || 0) >= outstandingBalanceToDate - 0.01
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}>
                    {(parseFloat(repayAmount) || 0) >= outstandingBalanceToDate - 0.01 ? 'Full Repayment (Settle)' : 'Partial Repayment'}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-indigo-100 dark:border-indigo-900/50 mt-1 pt-1">
                  <span className="text-muted-foreground">Remaining Balance After Payment:</span>
                  <span className="font-bold">{pkr(Math.max(0, outstandingBalanceToDate - (parseFloat(repayAmount) || 0)))}</span>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Repayment Date</Label>
              <Input type="date" value={repayDate} onChange={(e) => setRepayDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Payment Method</Label>
                <Select value={repayMethod} onValueChange={setRepayMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Pay From Bank Account</Label>
                <Select value={repayBankAccountId || undefined} onValueChange={setRepayBankAccountId}>
                  <SelectTrigger><SelectValue placeholder="Select account…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Cash/Other)</SelectItem>
                    {bankAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes / Remarks</Label>
              <Input placeholder="Receipt ref, Cheque no..." value={repayNotes} onChange={(e) => setRepayNotes(e.target.value)} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setRepayLoanId(null)}>Cancel</Button>
              <Button variant="default" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleRepayLoan} disabled={isSavingRepayment}>
                {isSavingRepayment ? 'Saving…' : 'Record Repayment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Investor Payout Dialog */}
      <Dialog open={investorPayoutOpen} onOpenChange={(v) => !v && setInvestorPayoutOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <Banknote className="h-5 w-5" /> Distribute Investor Profit
            </DialogTitle>
            <DialogDescription>Record a profit share payment to {selectedInvestorName}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Select Investor</Label>
              <Select value={selectedInvestorId} onValueChange={(val) => {
                setSelectedInvestorId(val);
                const inv = investors.find(i => i.id === val);
                setSelectedInvestorName(inv?.name || '');
              }}>
                <SelectTrigger><SelectValue placeholder="Choose investor..." /></SelectTrigger>
                <SelectContent>
                  {investors.map(inv => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.name} (Net Capital: {pkr(inv.netOwed)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Payout Amount (PKR) *</Label>
              <Input type="number" placeholder="0" value={investorPayoutAmount} onChange={(e) => setInvestorPayoutAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Payout Date</Label>
              <Input type="date" value={investorPayoutDate} onChange={(e) => setInvestorPayoutDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Payment Method</Label>
                <Select value={investorPayoutMethod} onValueChange={setInvestorPayoutMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Pay From Bank Account</Label>
                <Select value={investorPayoutBankAccountId || undefined} onValueChange={setInvestorPayoutBankAccountId}>
                  <SelectTrigger><SelectValue placeholder="Select account…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Cash/Other)</SelectItem>
                    {bankAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes / Remarks</Label>
              <Input placeholder="Receipt ref, remarks..." value={investorPayoutNotes} onChange={(e) => setInvestorPayoutNotes(e.target.value)} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setInvestorPayoutOpen(false)}>Cancel</Button>
              <Button variant="default" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleInvestorPayout} disabled={isSavingInvestorPayout}>
                {isSavingInvestorPayout ? 'Saving…' : 'Record Payout'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <TransactionModal
        open={addOpen}
        onOpenChange={setAddOpen}
        projectId={projectId}
        owners={owners}
        bankAccounts={bankAccounts}
        lenders={lenders}
        investors={investors}
        onSaved={() => router.refresh()}
      />
    </section>
  );
}
