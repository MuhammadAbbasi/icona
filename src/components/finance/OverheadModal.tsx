'use client';

import { useState } from 'react';
import { Loader2, ReceiptText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OVERHEAD_CATEGORIES, OVERHEAD_PAYMENT_METHODS } from '@/lib/finance';
import { createOverhead } from '@/app/actions/overheads';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  companyId: string;
  companyName: string;
  onSaved: () => void;
}

function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

// Sentinel select value that switches the category field to a free-text input.
const CUSTOM = '__custom';

export function OverheadModal({ open, onOpenChange, companyId, companyName, onSaved }: Props) {
  const [category, setCategory] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [paymentMethod, setPaymentMethod] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setCategory(''); setCustomMode(false); setCustomCategory('');
    setAmount(''); setDate(todayISO());
    setPaymentMethod(''); setDescription(''); setError('');
  }

  async function submit() {
    const amt = parseFloat(amount);
    const chosen = (customMode ? customCategory : category).trim();
    if (!chosen) { setError('Pick or enter an overhead category.'); return; }
    if (!amt || amt <= 0) { setError('Enter an amount greater than zero.'); return; }

    setSaving(true); setError('');
    const res = await createOverhead({
      companyId, category: chosen, amount: amt, date,
      paymentMethod: paymentMethod || null,
      description: description || null,
    });
    setSaving(false);

    if (!res.ok) { setError(res.error ?? 'Could not save.'); return; }
    reset();
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) { if (!v) reset(); onOpenChange(v); } }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-primary" /> New Overhead
          </DialogTitle>
          <DialogDescription>Record an operating cost for {companyName}. It affects company profit, not any project.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category *</Label>
              {customMode ? (
                <div className="flex gap-1.5">
                  <Input
                    value={customCategory}
                    onChange={(e) => { setCustomCategory(e.target.value); setError(''); }}
                    placeholder="New category name"
                    autoFocus
                  />
                  <Button type="button" size="sm" variant="outline" className="flex-shrink-0"
                    onClick={() => { setCustomMode(false); setCustomCategory(''); }}>
                    List
                  </Button>
                </div>
              ) : (
                <Select
                  value={category || undefined}
                  onValueChange={(v) => {
                    if (v === CUSTOM) { setCustomMode(true); setCategory(''); return; }
                    setCategory(v); setError('');
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {OVERHEAD_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    <SelectItem value={CUSTOM} className="text-primary font-medium">+ New category…</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="oh-amount">Amount (PKR) *</Label>
              <Input
                id="oh-amount" type="number" min="0" step="1" inputMode="decimal"
                value={amount} onChange={(e) => { setAmount(e.target.value); setError(''); }}
                placeholder="0" autoFocus
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="oh-date">Date</Label>
              <Input id="oh-date" type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Payment method</Label>
              <Select value={paymentMethod || undefined} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {OVERHEAD_PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="oh-desc">Notes</Label>
            <Textarea
              id="oh-desc" rows={2} value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. June office rent, electricity bill, Facebook ads…"
              className="resize-none"
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" disabled={saving} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving} className="flex-1">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Record Overhead'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
