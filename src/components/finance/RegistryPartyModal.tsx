'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatPKR } from '@/lib/utils';
import { Pencil, Trash2, Loader2, User } from 'lucide-react';
import { getLenderDetail, updateLender, deleteLender } from '@/app/actions/loans';
import { getInvestorDetail, updateInvestor, deleteInvestor } from '@/app/actions/investments';

export type PartyState = { kind: 'lender' | 'investor'; id: string; mode: 'detail' | 'edit' } | null;

interface Props {
  state: PartyState;
  onClose: () => void;
  canDelete: boolean;
}

const fmt = (n: number) => formatPKR(n || 0);
const date = (s: string) => new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export function RegistryPartyModal({ state, onClose, canDelete }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [mode, setMode] = useState<'detail' | 'edit'>('detail');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // edit form
  const [form, setForm] = useState({ name: '', contactName: '', phone: '', email: '', address: '', notes: '' });

  useEffect(() => {
    if (!state) return;
    setMode(state.mode);
    setError('');
    setLoading(true);
    const load = state.kind === 'lender' ? getLenderDetail(state.id) : getInvestorDetail(state.id);
    load.then((res: any) => {
      if (res.ok) {
        setData(res);
        const p = state.kind === 'lender' ? res.lender : res.investor;
        setForm({ name: p.name, contactName: p.contactName || '', phone: p.phone || '', email: p.email || '', address: p.address || '', notes: p.notes || '' });
      } else setError(res.error || 'Could not load details');
    }).finally(() => setLoading(false));
  }, [state]);

  if (!state) return null;
  const isLender = state.kind === 'lender';
  const party = data ? (isLender ? data.lender : data.investor) : null;

  async function save() {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true); setError('');
    const input = { name: form.name.trim(), contactName: form.contactName || null, phone: form.phone || null, email: form.email || null, address: form.address || null, notes: form.notes || null };
    const res = isLender ? await updateLender(state!.id, input) : await updateInvestor(state!.id, input);
    setSaving(false);
    if (res.ok) { router.refresh(); setMode('detail'); setData((d: any) => ({ ...d, [isLender ? 'lender' : 'investor']: { ...party, ...input, contactName: input.contactName || '' } })); }
    else setError(res.error || 'Save failed');
  }

  async function remove() {
    if (!confirm(`Delete this ${state!.kind}? This cannot be undone.`)) return;
    setSaving(true); setError('');
    const res = isLender ? await deleteLender(state!.id) : await deleteInvestor(state!.id);
    setSaving(false);
    if (res.ok) { router.refresh(); onClose(); }
    else setError(res.error || 'Delete failed');
  }

  return (
    <Dialog open={!!state} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {mode === 'edit' ? `Edit ${isLender ? 'Lender' : 'Investor'}` : (party?.name ?? (isLender ? 'Lender' : 'Investor'))}
          </DialogTitle>
          <DialogDescription>{isLender ? 'Loans and repayments with this lender.' : 'Investments and payouts with this investor.'}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : mode === 'edit' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name *" v={form.name} on={(x) => setForm({ ...form, name: x })} />
              <Field label="Contact person" v={form.contactName} on={(x) => setForm({ ...form, contactName: x })} placeholder="Card holder / point of contact" />
              <Field label="Phone" v={form.phone} on={(x) => setForm({ ...form, phone: x })} />
              <Field label="Email" v={form.email} on={(x) => setForm({ ...form, email: x })} />
            </div>
            <Field label="Address" v={form.address} on={(x) => setForm({ ...form, address: x })} />
            <Field label="Notes" v={form.notes} on={(x) => setForm({ ...form, notes: x })} />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setMode('detail')}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </div>
        ) : data ? (
          <div className="space-y-4">
            {/* Contact + actions */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="text-xs text-muted-foreground space-y-0.5">
                {party.contactName && <p><b className="text-foreground">Contact:</b> {party.contactName}</p>}
                {party.phone && <p>Phone: {party.phone}</p>}
                {party.email && <p>Email: {party.email}</p>}
                {party.address && <p>Address: {party.address}</p>}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setMode('edit')}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                {canDelete && <Button variant="outline" size="sm" className="gap-1.5 text-destructive" onClick={remove} disabled={saving}><Trash2 className="h-3.5 w-3.5" /> Delete</Button>}
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {isLender ? (
                <>
                  <Stat label="Borrowed" value={fmt(data.summary.totalBorrowed)} />
                  <Stat label="Interest" value={fmt(data.summary.totalInterest)} />
                  <Stat label="Repaid" value={fmt(data.summary.totalPaid)} tone="good" />
                  <Stat label="Outstanding" value={fmt(data.summary.outstanding)} tone={data.summary.outstanding > 0 ? 'warn' : undefined} />
                </>
              ) : (
                <>
                  <Stat label="Invested" value={fmt(data.summary.totalInvested)} />
                  <Stat label="Paid out" value={fmt(data.summary.totalPayouts)} tone="warn" />
                  <Stat label="Net capital" value={fmt(data.summary.netOwed)} />
                  <Stat label="Profit share" value={`${data.summary.profitSharePct || 0}%`} />
                </>
              )}
            </div>
            {isLender && data.summary.interestRate > 0 && (
              <p className="text-xs text-muted-foreground">Interest rate: <b className="text-foreground">{data.summary.interestRate}%</b></p>
            )}

            {/* Transactions */}
            {isLender ? (
              <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-muted-foreground text-left">
                    <tr><th className="px-3 py-2">Project</th><th className="px-3 py-2">Received</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2 text-right">Rate</th><th className="px-3 py-2 text-right">Payable</th><th className="px-3 py-2 text-right">Paid</th><th className="px-3 py-2 text-right">Outstanding</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.loans.length === 0 && <tr><td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">No loans.</td></tr>}
                    {data.loans.map((l: any) => (
                      <tr key={l.id} className="hover:bg-muted/20">
                        <td className="px-3 py-2">{l.project}</td>
                        <td className="px-3 py-2 text-muted-foreground">{date(l.receivedDate)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(l.amount)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{l.interestRate ? `${l.interestRate}%` : '-'}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(l.totalPayable)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-emerald-600">{fmt(l.amountPaid)}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">{l.outstanding <= 0 ? 'Repaid' : fmt(l.outstanding)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="space-y-3">
                <TxTable title="Investments" rows={data.investments} cols={['Project', 'Date', 'Share', 'Amount']} render={(i: any) => [i.project, date(i.date), `${i.profitSharePct || 0}%`, fmt(i.amount)]} />
                <TxTable title="Payouts" rows={data.payouts} cols={['Project', 'Date', 'Method', 'Amount']} render={(p: any) => [p.project, date(p.date), p.method || '-', fmt(p.amount)]} />
              </div>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        ) : (
          <p className="text-sm text-destructive py-6">{error || 'Not found.'}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, v, on, placeholder }: { label: string; v: string; on: (x: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input value={v} onChange={(e) => on(e.target.value)} placeholder={placeholder} className="h-9" />
    </div>
  );
}
function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'warn' }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`text-sm font-bold tabular-nums mt-0.5 ${tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : ''}`}>{value}</p>
    </div>
  );
}
function TxTable({ title, rows, cols, render }: { title: string; rows: any[]; cols: string[]; render: (r: any) => (string | number)[] }) {
  return (
    <div className="rounded-lg border overflow-x-auto">
      <div className="px-3 py-2 bg-muted/40 text-xs font-semibold border-b">{title}</div>
      <table className="w-full text-xs">
        <thead className="bg-muted/30 text-muted-foreground text-left"><tr>{cols.map((c, i) => <th key={i} className={`px-3 py-1.5 ${i === cols.length - 1 ? 'text-right' : ''}`}>{c}</th>)}</tr></thead>
        <tbody className="divide-y divide-border">
          {rows.length === 0 && <tr><td colSpan={cols.length} className="px-3 py-3 text-center text-muted-foreground">None.</td></tr>}
          {rows.map((r, i) => { const cells = render(r); return <tr key={i} className="hover:bg-muted/20">{cells.map((c, j) => <td key={j} className={`px-3 py-1.5 ${j === cells.length - 1 ? 'text-right tabular-nums font-medium' : ''}`}>{c}</td>)}</tr>; })}
        </tbody>
      </table>
    </div>
  );
}
