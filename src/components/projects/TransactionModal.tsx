'use client';

import { useState } from 'react';
import { Loader2, Wallet, AlertTriangle, FileText, Upload, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  TXN_TYPE_CONFIG, CATEGORY_PRESETS, PAYMENT_METHODS, WORKER_CATEGORY,
  type TransactionType,
} from '@/lib/finance';
import { createTransaction } from '@/app/actions/transactions';
import { createLoan } from '@/app/actions/loans';
import { createInvestment } from '@/app/actions/investments';
import { WorkerSelect } from './WorkerSelect';
import type { WorkerOption } from '@/app/actions/workers';

export interface OwnerOption { id: string; name: string; }
export interface ProjectOption { id: string; name: string; }
export interface BankAccountOption { id: string; name: string; }
export interface LenderOption { id: string; name: string; }
export interface InvestorOption { id: string; name: string; }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId?: string;
  projects?: ProjectOption[];
  owners: OwnerOption[];
  bankAccounts: BankAccountOption[];
  lenders?: LenderOption[];
  investors?: InvestorOption[];
  onSaved: () => void;
}

function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

const TABS = ['INCOME', 'EXPENSE', 'DRAWING', 'LOAN', 'INVESTMENT'] as const;
type TabType = typeof TABS[number];

const TAB_CONFIG: Record<TabType, { label: string; badge: string }> = {
  INCOME:     { label: 'Income',     badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  EXPENSE:    { label: 'Expense',    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
  DRAWING:    { label: 'Payout',     badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  LOAN:       { label: 'Loan',       badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  INVESTMENT: { label: 'Investment', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
};

export function TransactionModal({
  open,
  onOpenChange,
  projectId,
  projects,
  owners,
  bankAccounts,
  lenders = [],
  investors = [],
  onSaved
}: Props) {
  const needsProjectPick = !projectId && !!projects;
  const [activeTab, setActiveTab] = useState<TabType>('INCOME');
  const [selectedProject, setSelectedProject] = useState(projectId ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // 1. Transaction Form States
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [worker, setWorker] = useState<WorkerOption | null>(null);
  const [description, setDescription] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [isPaid, setIsPaid] = useState(true);
  const [dueDate, setDueDate] = useState('');
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState('');
  const [invoiceUrl, setInvoiceUrl] = useState('');
  const [invoicePath, setInvoicePath] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  // 2. Loan Form States
  const [lenderId, setLenderId] = useState('');
  const [lenderName, setLenderName] = useState('');
  const [lenderPhone, setLenderPhone] = useState('');
  const [lenderEmail, setLenderEmail] = useState('');
  const [lenderAddress, setLenderAddress] = useState('');
  const [lenderNotes, setLenderNotes] = useState('');
  const [loanPrincipal, setLoanPrincipal] = useState('');
  const [loanInterestRate, setLoanInterestRate] = useState('0');
  const [loanInterestAmount, setLoanInterestAmount] = useState('0');
  const [loanReceivedDate, setLoanReceivedDate] = useState(todayISO());
  const [loanDueDate, setLoanDueDate] = useState('');
  const [loanBankAccountId, setLoanBankAccountId] = useState('');
  const [loanNotes, setLoanNotes] = useState('');

  // 3. Investment Form States
  const [investorId, setInvestorId] = useState('');
  const [investorName, setInvestorName] = useState('');
  const [investorPhone, setInvestorPhone] = useState('');
  const [investorEmail, setInvestorEmail] = useState('');
  const [investorAddress, setInvestorAddress] = useState('');
  const [investorNotes, setInvestorNotes] = useState('');
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [investmentProfitSharePct, setInvestmentProfitSharePct] = useState('0');
  const [investmentDate, setInvestmentDate] = useState(todayISO());
  const [investmentBankAccountId, setInvestmentBankAccountId] = useState('');
  const [investmentNotes, setInvestmentNotes] = useState('');

  const showWorker = activeTab === 'EXPENSE' && category === WORKER_CATEGORY;
  const isDrawing = activeTab === 'DRAWING';

  const calculateInterestCost = (principalStr: string, rateStr: string, recvStr: string, dueStr: string) => {
    const principal = parseFloat(principalStr) || 0;
    const rate = parseFloat(rateStr) || 0;
    if (principal <= 0 || rate <= 0 || !recvStr || !dueStr) {
      setLoanInterestAmount('0');
      return;
    }
    const dReceived = new Date(recvStr);
    const dDue = new Date(dueStr);
    const msDiff = dDue.getTime() - dReceived.getTime();
    const days = Math.floor(msDiff / (1000 * 60 * 60 * 24));
    if (days <= 0) {
      setLoanInterestAmount('0');
      return;
    }
    const interest = principal * (rate / 100) * (days / 365);
    setLoanInterestAmount(String(Math.round(interest)));
  };

  const whoLabel = activeTab === 'DRAWING'
    ? 'Owner (who withdrew)'
    : activeTab === 'EXPENSE'
    ? 'Paid to (category)'
    : 'Received as (category)';

  function pickCategory(v: string) {
    setCategory(v);
    if (v !== WORKER_CATEGORY) setWorker(null);
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'invoices');

    try {
      const res = await fetch('/api/uploads', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Failed to upload document.');
      } else {
        setInvoiceUrl(data.url);
        setInvoicePath(data.url.replace('/api/uploads/', ''));
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred during file upload.');
    } finally {
      setUploadingFile(false);
    }
  };

  function reset() {
    setActiveTab('INCOME'); setError('');
    setAmount(''); setDate(todayISO()); setCategory(''); setPaymentMethod(''); setOwnerId('');
    setWorker(null); setDescription(''); setBankAccountId(''); setIsPaid(true); setDueDate('');
    setVendorInvoiceNo(''); setInvoiceUrl(''); setInvoicePath(''); setUploadingFile(false);

    setLenderId(''); setLenderName(''); setLenderPhone(''); setLenderEmail(''); setLenderAddress(''); setLenderNotes('');
    setLoanPrincipal(''); setLoanInterestRate('0'); setLoanInterestAmount('0'); setLoanReceivedDate(todayISO()); setLoanDueDate('');
    setLoanBankAccountId(''); setLoanNotes('');

    setInvestorId(''); setInvestorName(''); setInvestorPhone(''); setInvestorEmail(''); setInvestorAddress(''); setInvestorNotes('');
    setInvestmentAmount(''); setInvestmentProfitSharePct('0'); setInvestmentDate(todayISO()); setInvestmentBankAccountId('');
    setInvestmentNotes('');

    setSelectedProject(projectId ?? '');
  }

  async function submit() {
    let effectiveProjectId = projectId ?? selectedProject;
    if (effectiveProjectId === 'none') {
      effectiveProjectId = '';
    }
    if (!effectiveProjectId && activeTab !== 'INVESTMENT') {
      setError('Select a project for this transaction.');
      return;
    }

    setSaving(true); setError('');

    try {
      if (activeTab === 'LOAN') {
        const principal = parseFloat(loanPrincipal);
        if (!principal || principal <= 0) { setError('Enter a valid principal amount.'); setSaving(false); return; }
        if (!lenderId) { setError('Select a lender or create a new one.'); setSaving(false); return; }
        if (lenderId === 'new' && !lenderName.trim()) { setError('Enter the new lender\'s name.'); setSaving(false); return; }

        const res = await createLoan({
          projectId: effectiveProjectId,
          lenderId,
          lenderName: lenderId === 'new' ? lenderName : undefined,
          lenderPhone: lenderId === 'new' ? lenderPhone : undefined,
          lenderEmail: lenderId === 'new' ? lenderEmail : undefined,
          lenderAddress: lenderId === 'new' ? lenderAddress : undefined,
          lenderNotes: lenderId === 'new' ? lenderNotes : undefined,
          provider: lenderId === 'new' ? lenderName : undefined,
          amount: principal,
          interestRate: parseFloat(loanInterestRate) || 0,
          interestAmount: parseFloat(loanInterestAmount) || 0,
          receivedDate: loanReceivedDate,
          dueDate: loanDueDate || null,
          bankAccountId: loanBankAccountId || null,
          notes: loanNotes,
        });

        if (!res.ok) { setError(res.error ?? 'Could not save.'); setSaving(false); return; }
      } 
      else if (activeTab === 'INVESTMENT') {
        const principal = parseFloat(investmentAmount);
        if (!principal || principal <= 0) { setError('Enter a valid investment amount.'); setSaving(false); return; }
        if (!investorId) { setError('Select an investor or create a new one.'); setSaving(false); return; }
        if (investorId === 'new' && !investorName.trim()) { setError('Enter the new investor\'s name.'); setSaving(false); return; }

        const res = await createInvestment({
          projectId: effectiveProjectId,
          investorId,
          investorName: investorId === 'new' ? investorName : undefined,
          investorPhone: investorId === 'new' ? investorPhone : undefined,
          investorEmail: investorId === 'new' ? investorEmail : undefined,
          investorAddress: investorId === 'new' ? investorAddress : undefined,
          investorNotes: investorId === 'new' ? investorNotes : undefined,
          amount: principal,
          profitSharePct: parseFloat(investmentProfitSharePct) || 0,
          date: investmentDate,
          bankAccountId: investmentBankAccountId || null,
          notes: investmentNotes,
        });

        if (!res.ok) { setError(res.error ?? 'Could not save.'); setSaving(false); return; }
      } 
      else {
        // Regular transaction
        const amt = parseFloat(amount);
        if (!amt || amt <= 0) { setError('Enter an amount greater than zero.'); setSaving(false); return; }
        if (isDrawing && !ownerId) { setError('Select the partner or company receiving this payout.'); setSaving(false); return; }
        if (activeTab === 'EXPENSE' && !isPaid && !dueDate) { setError('Please select a due date for the supplier loan.'); setSaving(false); return; }

        const res = await createTransaction({
          projectId: effectiveProjectId,
          type: activeTab as any,
          amount: amt,
          date,
          category: category || null,
          paymentMethod: isPaid ? (paymentMethod || null) : null,
          ownerId: isDrawing ? ownerId : null,
          workerId: showWorker ? (worker?.id ?? null) : null,
          bankAccountId: isPaid && bankAccountId && bankAccountId !== 'none' ? bankAccountId : null,
          isPaid: activeTab === 'EXPENSE' ? isPaid : true,
          dueDate: activeTab === 'EXPENSE' && !isPaid ? dueDate : null,
          vendorInvoiceNo: activeTab === 'EXPENSE' ? (vendorInvoiceNo || null) : null,
          invoiceUrl: activeTab === 'EXPENSE' ? (invoiceUrl || null) : null,
          invoicePath: activeTab === 'EXPENSE' ? (invoicePath || null) : null,
          description: description || (showWorker && worker ? worker.name : null),
        });

        if (!res.ok) { setError(res.error ?? 'Could not save.'); setSaving(false); return; }
        if (res.warning) {
          alert(res.warning);
        }
      }

      reset();
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) { if (!v) reset(); onOpenChange(v); } }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" /> Log Finance Flow
          </DialogTitle>
          <DialogDescription>Add a client receipt, expense, payout, start loan, or capital investment.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Tab selector */}
          <div className="grid grid-cols-5 gap-1">
            {TABS.map((t) => {
              const tc = TAB_CONFIG[t];
              const active = activeTab === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setActiveTab(t); setError(''); }}
                  className={cn(
                    'rounded-lg border py-1.5 text-[10px] font-bold transition-all text-center leading-none',
                    active ? cn(tc.badge, 'border-current ring-2 ring-current/10') : 'border-border text-muted-foreground hover:bg-muted/50'
                  )}
                >
                  {tc.label}
                </button>
              );
            })}
          </div>

          {/* Project picker (global view only) */}
          {needsProjectPick && (
            <div className="space-y-1.5">
              <Label>Project {activeTab !== 'INVESTMENT' && '*'}</Label>
              <Select value={selectedProject || undefined} onValueChange={(v) => { setSelectedProject(v); setError(''); }}>
                <SelectTrigger><SelectValue placeholder="Select project…" /></SelectTrigger>
                <SelectContent>
                  {activeTab === 'INVESTMENT' && (
                    <SelectItem value="none" className="text-primary font-semibold focus:text-primary">
                      Company-wide / Global (No Project)
                    </SelectItem>
                  )}
                  {projects!.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Render forms conditionally based on Tab */}
          {activeTab === 'LOAN' ? (
            // START LOAN FORM
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Lender / Provider *</Label>
                  <Select value={lenderId || undefined} onValueChange={(v) => { setLenderId(v); setError(''); }}>
                    <SelectTrigger><SelectValue placeholder="Select provider…" /></SelectTrigger>
                    <SelectContent>
                      {lenders.map((l) => (
                        <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                      ))}
                      <SelectItem value="new" className="text-primary font-semibold focus:text-primary">
                        + Add new lender...
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Principal (PKR) *</Label>
                  <Input
                    type="number" placeholder="0" value={loanPrincipal}
                    onChange={(e) => {
                      setLoanPrincipal(e.target.value);
                      calculateInterestCost(e.target.value, loanInterestRate, loanReceivedDate, loanDueDate);
                    }}
                  />
                </div>
              </div>

              {/* Inline Lender Details Form */}
              {lenderId === 'new' && (
                <div className="p-3 border rounded-xl bg-muted/30 space-y-2.5 border-dashed">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide">New Lender Details</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Lender Name *</Label>
                      <Input placeholder="e.g. Bank Alfalah" value={lenderName} onChange={(e) => setLenderName(e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Phone</Label>
                      <Input placeholder="0300..." value={lenderPhone} onChange={(e) => setLenderPhone(e.target.value)} className="h-8 text-xs" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Email</Label>
                      <Input type="email" placeholder="lender@bank.com" value={lenderEmail} onChange={(e) => setLenderEmail(e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Address</Label>
                      <Input placeholder="Branch address..." value={lenderAddress} onChange={(e) => setLenderAddress(e.target.value)} className="h-8 text-xs" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Notes</Label>
                    <Input placeholder="Remarks about lender..." value={lenderNotes} onChange={(e) => setLenderNotes(e.target.value)} className="h-8 text-xs" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Interest Rate (% P.A.)</Label>
                  <Input
                    type="number" step="0.1" value={loanInterestRate}
                    onChange={(e) => {
                      setLoanInterestRate(e.target.value);
                      calculateInterestCost(loanPrincipal, e.target.value, loanReceivedDate, loanDueDate);
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Interest Cost / Increased Amount (PKR)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={loanInterestAmount}
                    onChange={(e) => setLoanInterestAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Received Date</Label>
                  <Input
                    type="date" value={loanReceivedDate}
                    onChange={(e) => {
                      setLoanReceivedDate(e.target.value);
                      calculateInterestCost(loanPrincipal, loanInterestRate, e.target.value, loanDueDate);
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Due Date</Label>
                  <Input
                    type="date" value={loanDueDate}
                    onChange={(e) => {
                      setLoanDueDate(e.target.value);
                      calculateInterestCost(loanPrincipal, loanInterestRate, loanReceivedDate, e.target.value);
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Deposit Bank Account</Label>
                <Select value={loanBankAccountId || undefined} onValueChange={setLoanBankAccountId}>
                  <SelectTrigger><SelectValue placeholder="Select account…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Cash/Other)</SelectItem>
                    {bankAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Loan Notes</Label>
                <Textarea rows={2} value={loanNotes} onChange={(e) => setLoanNotes(e.target.value)} placeholder="Collateral, repayment details..." className="resize-none" />
              </div>
            </div>
          ) : activeTab === 'INVESTMENT' ? (
            // CAPITAL INVESTMENT FORM
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Investor *</Label>
                  <Select value={investorId || undefined} onValueChange={(v) => { setInvestorId(v); setError(''); }}>
                    <SelectTrigger><SelectValue placeholder="Select investor…" /></SelectTrigger>
                    <SelectContent>
                      {investors.map((inv) => (
                        <SelectItem key={inv.id} value={inv.id}>{inv.name}</SelectItem>
                      ))}
                      <SelectItem value="new" className="text-primary font-semibold focus:text-primary">
                        + Add new investor...
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Investment Amount (PKR) *</Label>
                  <Input type="number" placeholder="0" value={investmentAmount} onChange={(e) => setInvestmentAmount(e.target.value)} />
                </div>
              </div>

              {/* Inline Investor Details Form */}
              {investorId === 'new' && (
                <div className="p-3 border rounded-xl bg-muted/30 space-y-2.5 border-dashed">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide">New Investor Details</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Investor Name *</Label>
                      <Input placeholder="e.g. Irshad Ahmad" value={investorName} onChange={(e) => setInvestorName(e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Phone</Label>
                      <Input placeholder="0300..." value={investorPhone} onChange={(e) => setInvestorPhone(e.target.value)} className="h-8 text-xs" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Email</Label>
                      <Input type="email" placeholder="investor@mail.com" value={investorEmail} onChange={(e) => setInvestorEmail(e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Address</Label>
                      <Input placeholder="Resident address..." value={investorAddress} onChange={(e) => setInvestorAddress(e.target.value)} className="h-8 text-xs" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Notes</Label>
                    <Input placeholder="Special terms..." value={investorNotes} onChange={(e) => setInvestorNotes(e.target.value)} className="h-8 text-xs" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Profit Share Percentage (%)</Label>
                  <Input type="number" step="0.1" value={investmentProfitSharePct} onChange={(e) => setInvestmentProfitSharePct(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Date Received</Label>
                  <Input type="date" value={investmentDate} onChange={(e) => setInvestmentDate(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Deposit Bank Account</Label>
                <Select value={investmentBankAccountId || undefined} onValueChange={setInvestmentBankAccountId}>
                  <SelectTrigger><SelectValue placeholder="Select account…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Cash/Other)</SelectItem>
                    {bankAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Investment Notes</Label>
                <Textarea rows={2} value={investmentNotes} onChange={(e) => setInvestmentNotes(e.target.value)} placeholder="Terms, payouts timeline..." className="resize-none" />
              </div>
            </div>
          ) : (
            // REGULAR TRANSACTIONS (INCOME, EXPENSE, PAYOUT)
            <div className="space-y-3.5">
              {/* Amount + Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="txn-amount">Amount (PKR) *</Label>
                  <Input
                    id="txn-amount" type="number" min="0" step="1" inputMode="decimal"
                    value={amount} onChange={(e) => { setAmount(e.target.value); setError(''); }}
                    placeholder="0" autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="txn-date">Date</Label>
                  <Input id="txn-date" type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>

              {/* Owner Payout select */}
              {isDrawing && (
                <div className="space-y-1.5">
                  <Label>{whoLabel} *</Label>
                  <Select value={ownerId || undefined} onValueChange={(v) => { setOwnerId(v); setError(''); }}>
                    <SelectTrigger><SelectValue placeholder="Select owner…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="company" className="text-primary font-semibold focus:text-primary">
                        🏢 Company Account / General Pool
                      </SelectItem>
                      {owners.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {owners.length === 0 && (
                    <p className="text-[11px] text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> No admin/owner accounts found.
                    </p>
                  )}
                </div>
              )}

              {/* Category selector */}
              <div className="space-y-1.5">
                <Label>{isDrawing ? 'Category' : whoLabel}</Label>
                <Select value={category || undefined} onValueChange={pickCategory}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORY_PRESETS[activeTab as TransactionType].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Expense specific invoice fields */}
              {activeTab === 'EXPENSE' && (
                <div className="p-3 border rounded-xl bg-card space-y-3.5 border-dashed">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="vendor-invoice">Vendor Invoice No</Label>
                      <Input
                        id="vendor-invoice"
                        placeholder="e.g. INV-102"
                        value={vendorInvoiceNo}
                        onChange={(e) => setVendorInvoiceNo(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="invoice-file">Invoice Attachment</Label>
                      <div className="relative">
                        <Input
                          id="invoice-file"
                          type="file"
                          accept=".pdf,image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('invoice-file')?.click()}
                          className="w-full text-xs gap-1.5 h-10 border-border bg-card"
                          disabled={uploadingFile}
                        >
                          {uploadingFile ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          {invoicePath ? 'Document Staged' : 'Upload Invoice'}
                        </Button>
                      </div>
                    </div>
                  </div>
                  {invoiceUrl && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/5 px-2.5 py-1.5 border border-emerald-500/10 rounded-md">
                      <FileText className="h-4 w-4" />
                      <a href={invoiceUrl} target="_blank" rel="noreferrer" className="underline truncate hover:opacity-85">
                        View Uploaded Invoice
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Supplier Goods Loan Toggle (for Expense type only) */}
              {activeTab === 'EXPENSE' && (
                <div className="flex items-center space-x-2 py-1 bg-amber-500/5 border border-amber-500/10 rounded-lg px-3">
                  <input
                    type="checkbox"
                    id="txn-loan"
                    checked={!isPaid}
                    onChange={(e) => {
                      setIsPaid(!e.target.checked);
                      if (e.target.checked) {
                        setPaymentMethod('');
                        setBankAccountId('');
                      } else {
                        setDueDate('');
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  <label htmlFor="txn-loan" className="text-xs font-medium text-amber-800 dark:text-amber-300 cursor-pointer">
                    Goods taken on loan (pay later / supplier credit)
                  </label>
                </div>
              )}

              {/* Conditional payment details vs due date */}
              {!isPaid ? (
                <div className="space-y-1.5">
                  <Label htmlFor="txn-due-date">Due Date for Supplier Loan *</Label>
                  <Input
                    id="txn-due-date"
                    type="date"
                    min={todayISO()}
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Payment method</Label>
                    <Select value={paymentMethod || undefined} onValueChange={setPaymentMethod}>
                      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Bank Account</Label>
                    <Select value={bankAccountId || undefined} onValueChange={setBankAccountId}>
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
              )}

              {/* Worker / Supervisor search */}
              {showWorker && (
                <div className="space-y-1.5">
                  <Label>Worker / Supervisor</Label>
                  <WorkerSelect value={worker} onChange={setWorker} />
                  <p className="text-[11px] text-muted-foreground">
                    Search an existing worker, or add a new one. If the worker’s name isn’t known, use the supervisor’s.
                  </p>
                </div>
              )}

              {/* Description / who was paid */}
              <div className="space-y-1.5">
                <Label htmlFor="txn-desc">
                  {activeTab === 'EXPENSE' ? 'Who was paid? / Notes' : 'Notes'}
                </Label>
                <Textarea
                  id="txn-desc" rows={2} value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={activeTab === 'EXPENSE' ? 'e.g. Ali Transport - 2 trips of sand' : 'Reference, remarks…'}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" disabled={saving || uploadingFile} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving || uploadingFile} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white border-transparent">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <>Record {activeTab === 'LOAN' ? 'Loan' : activeTab === 'INVESTMENT' ? 'Investment' : TAB_CONFIG[activeTab].label}</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
