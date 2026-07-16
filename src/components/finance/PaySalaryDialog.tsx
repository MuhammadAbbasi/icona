'use client';

import { useState } from 'react';
import { Loader2, Wallet } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OVERHEAD_PAYMENT_METHODS } from '@/lib/finance';
import { formatPKR } from '@/lib/utils';
import { payRoutineSalary } from '@/app/actions/overheads';

export interface StaffMember { userId: string; name: string; salary: number }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  companyId: string;
  member: StaffMember | null;
  onSaved: () => void;
}

function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function PaySalaryDialog({ open, onOpenChange, companyId, member, onSaved }: Props) {
  const [salary, setSalary] = useState('');
  const [bonus, setBonus] = useState('');
  const [date, setDate] = useState(todayISO());
  const [paymentMethod, setPaymentMethod] = useState('Bank');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Re-seed the form each time a different member opens the dialog.
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if (open && member && seededFor !== member.userId) {
    setSeededFor(member.userId);
    setSalary(String(member.salary));
    setBonus('');
    setDate(todayISO());
    setPaymentMethod('Bank');
    setError('');
  }
  if (!open && seededFor !== null) setSeededFor(null);

  const total = (parseFloat(salary) || 0) + (parseFloat(bonus) || 0);

  async function submit() {
    if (!member) return;
    const s = parseFloat(salary);
    if (isNaN(s) || s < 0) { setError('Enter a valid salary amount.'); return; }

    setSaving(true); setError('');
    const res = await payRoutineSalary({
      companyId,
      userId: member.userId,
      salary: s,
      bonus: parseFloat(bonus) || 0,
      date,
      paymentMethod: paymentMethod || null,
    });
    setSaving(false);
    if (!res.ok) { setError(res.error ?? 'Could not record payment.'); return; }
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" /> Confirm salary payment
          </DialogTitle>
          <DialogDescription>
            Recording <span className="font-medium text-foreground">{member?.name}</span>&apos;s salary as paid. Review the figures and date before confirming.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pay-salary">Salary (PKR)</Label>
              <Input id="pay-salary" type="number" min="0" value={salary}
                onChange={(e) => { setSalary(e.target.value); setError(''); }} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-bonus">Bonus (PKR)</Label>
              <Input id="pay-bonus" type="number" min="0" value={bonus} placeholder="0"
                onChange={(e) => { setBonus(e.target.value); setError(''); }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pay-date">Payment date</Label>
              <Input id="pay-date" type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />
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

          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
            <span className="text-sm text-muted-foreground">Total to record</span>
            <span className="text-base font-bold tabular-nums text-foreground">{formatPKR(total)}</span>
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
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Recording…</> : 'Confirm & record'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
