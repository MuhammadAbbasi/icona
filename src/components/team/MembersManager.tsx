'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  Plus, Loader2, Pencil, Trash2, KeyRound, ShieldCheck, Eye, EyeOff,
  Mail, Phone, Briefcase, Building2, Wallet, FolderKanban, CalendarDays,
  UserCog, CircleUserRound, Users, UserPlus, MapPin, Upload, HardHat,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { cn, getInitials, formatCurrency, ROLE_CONFIG } from '@/lib/utils';
import type { Role } from '@/types';

interface CompanyLite { id: string; name: string }
interface ProjectLite { id: string; name: string; status: string }
interface ProjectOption { id: string; name: string }

export interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  salary: number | null;
  paymentType: string | null;
  phone: string | null;
  position: string | null;
  department: string | null;
  address: string | null;
  avatar: string | null;
  companyId: string | null;
  company: CompanyLite | null;
  projectId: string | null;
  project: ProjectOption | null;
  taskCount: number;
  teamCount: number;
  createdAt: string;
  projects: ProjectLite[];
}

const ROLES: Role[] = ['ADMIN', 'MANAGER', 'EMPLOYEE', 'FREELANCER', 'CLIENT'];

// Freelancer (Project Based) pay models. Freelancers are not salaried monthly.
const PAYMENT_TYPES = [
  { value: 'MONTHLY',  label: 'Monthly (mutually agreed)' },
  { value: 'LUMP_SUM', label: 'Lump sum (whole task/project)' },
  { value: 'PER_TASK', label: 'Per task / milestone' },
];
const PAYMENT_LABEL: Record<string, string> = Object.fromEntries(PAYMENT_TYPES.map((p) => [p.value, p.label]));

function salaryLabel(salary: number | null) {
  return salary != null ? `PKR ${formatCurrency(salary)}` : '-';
}

/* ------------------------------------------------------------------ */
/* Member form (shared by Add + Edit Settings)                         */
/* ------------------------------------------------------------------ */

interface FormState {
  name: string; email: string; password: string;
  role: Role; status: 'ACTIVE' | 'INACTIVE';
  companyId: string; salary: string;
  paymentType: string; projectId: string;
  phone: string; position: string; department: string; address: string;
  avatar: string;
}

function emptyForm(): FormState {
  return {
    name: '', email: '', password: '', role: 'EMPLOYEE', status: 'ACTIVE',
    companyId: '', salary: '', paymentType: 'MONTHLY', projectId: '',
    phone: '', position: '', department: '', address: '', avatar: '',
  };
}

function MemberForm({
  initial, companies, projects, isLoading, error, withPassword, submitLabel, onSubmit, onCancel, onCompanyCreated,
}: {
  initial: FormState; companies: CompanyLite[]; projects: ProjectOption[]; isLoading: boolean; error: string;
  withPassword: boolean; submitLabel: string;
  onSubmit: (f: FormState) => void; onCancel: () => void;
  onCompanyCreated: (c: CompanyLite) => void;
}) {
  const [form, setForm] = useState(initial);
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));
  const isFreelancer = form.role === 'FREELANCER';

  // Inline "create a company without leaving this form" state.
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [companySaving, setCompanySaving] = useState(false);
  const [companyError, setCompanyError] = useState('');

  // Avatar upload states
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('File must be under 2MB.');
      return;
    }
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml'];
    if (!allowed.includes(file.type)) {
      setUploadError('Allowed formats: PNG, JPG, JPEG, GIF, SVG.');
      return;
    }

    setUploading(true);
    setUploadError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', 'avatars');
      const res = await fetch('/api/uploads', { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Upload failed');
      const { url } = await res.json();
      setForm((p) => ({ ...p, avatar: url }));
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function createCompany() {
    const nm = newCompanyName.trim();
    if (nm.length < 2) { setCompanyError('Name must be at least 2 characters.'); return; }
    setCompanySaving(true); setCompanyError('');
    try {
      const res = await fetch('/api/companies', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        // Mirror the member's role so the company lands in the right Companies tab.
        body: JSON.stringify({ name: nm, type: isFreelancer ? 'FREELANCER' : 'CLIENT' }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Could not create company');
      const created = await res.json();
      const lite: CompanyLite = { id: created.id, name: created.name };
      onCompanyCreated(lite);
      setForm((p) => ({ ...p, companyId: lite.id }));
      setCreatingCompany(false); setNewCompanyName('');
    } catch (e: any) { setCompanyError(e.message); }
    finally { setCompanySaving(false); }
  }

  return (
    <div className="space-y-4 pt-2">
      {/* Profile Picture Upload Section */}
      <div className="flex items-center gap-4 p-3 bg-muted/20 rounded-xl border border-border/50">
        <Avatar className="h-14 w-14 border">
          {form.avatar && <AvatarImage src={form.avatar} className="object-cover h-full w-full" />}
          <AvatarFallback className="bg-primary/10 text-primary font-semibold h-full w-full flex items-center justify-center">{getInitials(form.name || 'U')}</AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Profile Picture</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              Upload Photo
            </Button>
            {form.avatar && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-destructive hover:bg-destructive/10"
                onClick={() => setForm((p) => ({ ...p, avatar: '' }))}
              >
                Remove
              </Button>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarChange}
            accept=".png,.jpg,.jpeg,.gif,.svg"
            className="hidden"
          />
          {uploadError && <p className="text-[10px] text-destructive">{uploadError}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Full Name *</Label>
          <Input value={form.name} onChange={set('name')} placeholder="e.g. Ahmad Raza" />
        </div>
        <div className="space-y-1.5">
          <Label>Email *</Label>
          <Input value={form.email} onChange={set('email')} type="email" placeholder="name@company.com" />
        </div>
      </div>

      {withPassword && (
        <div className="space-y-1.5">
          <Label>Temporary Password *</Label>
          <Input value={form.password} onChange={set('password')} type="text" placeholder="Minimum 8 characters" autoComplete="new-password" />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Role</Label>
          <Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v as Role }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_CONFIG[r].label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v as FormState['status'] }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Job Title</Label>
          <Input value={form.position} onChange={set('position')} placeholder="e.g. Site Engineer" />
        </div>
        <div className="space-y-1.5">
          <Label>Department</Label>
          <Input value={form.department} onChange={set('department')} placeholder="e.g. Civil" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input value={form.phone} onChange={set('phone')} placeholder="+92 300 0000000" />
        </div>
        <div className="space-y-1.5">
          <Label>{isFreelancer ? 'Agreed Amount (PKR)' : 'Monthly Salary (PKR)'}</Label>
          <Input value={form.salary} onChange={set('salary')} type="number" min="0" placeholder="e.g. 120000" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Address</Label>
        <Input value={form.address} onChange={set('address')} placeholder="House, street, city" />
      </div>

      {/* Freelancer (Project Based): pay model + optional project engagement */}
      {isFreelancer && (
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-cyan-200/60 dark:border-cyan-500/20 bg-cyan-50/50 dark:bg-cyan-900/10 p-3">
          <div className="space-y-1.5">
            <Label>Payment Type</Label>
            <Select value={form.paymentType || 'MONTHLY'} onValueChange={(v) => setForm((p) => ({ ...p, paymentType: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_TYPES.map((pt) => <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Project (optional)</Label>
            <Select value={form.projectId || 'none'} onValueChange={(v) => setForm((p) => ({ ...p, projectId: v === 'none' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="No specific project" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific project</SelectItem>
                {projects.map((pr) => <SelectItem key={pr.id} value={pr.id}>{pr.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Company</Label>
        {creatingCompany ? (
          <div className="space-y-1.5">
            <div className="flex gap-2">
              <Input
                value={newCompanyName}
                onChange={(e) => { setNewCompanyName(e.target.value); setCompanyError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); createCompany(); } }}
                placeholder="New company name"
                autoFocus
              />
              <Button type="button" size="sm" disabled={companySaving || newCompanyName.trim().length < 2} onClick={createCompany}>
                {companySaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={companySaving}
                onClick={() => { setCreatingCompany(false); setNewCompanyName(''); setCompanyError(''); }}>
                Cancel
              </Button>
            </div>
            {companyError && <p className="text-[11px] text-destructive">{companyError}</p>}
          </div>
        ) : (
          <Select
            value={form.companyId || (form.role === 'FREELANCER' ? 'none' : undefined)}
            onValueChange={(v) => {
              if (v === '__new') { setCreatingCompany(true); return; }
              setForm((p) => ({ ...p, companyId: v === 'none' ? '' : v }));
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={form.role === 'FREELANCER' ? "No company" : "Select company *"} />
            </SelectTrigger>
            <SelectContent>
              {form.role === 'FREELANCER' && (
                <SelectItem value="none">No company (internal)</SelectItem>
              )}
              {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              <SelectItem value="__new" className="text-primary font-medium">
                <span className="flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> Create new company…</span>
              </SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {error && <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</div>}

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1" disabled={isLoading}>Cancel</Button>
        <Button
          onClick={() => onSubmit(form)}
          disabled={
            isLoading ||
            !form.name.trim() ||
            !form.email.trim() ||
            (withPassword && form.password.length < 8) ||
            (form.role !== 'FREELANCER' && !form.companyId)
          }
          className="flex-1"
        >
          {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : submitLabel}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Admin password reset                                                */
/* ------------------------------------------------------------------ */

function ResetPasswordForm({ memberId, memberName }: { memberId: string; memberName: string }) {
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function submit() {
    if (pwd.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (pwd !== confirm) { setError('Passwords do not match.'); return; }
    setIsLoading(true); setError(''); setSuccess(false);
    try {
      const res = await fetch(`/api/users/${memberId}/password`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: pwd }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSuccess(true); setPwd(''); setConfirm('');
    } catch (e: any) { setError(e.message); }
    finally { setIsLoading(false); }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Set a new password for <span className="font-medium text-foreground">{memberName}</span>. They can change it later from their own settings.
      </p>
      <div className="space-y-1.5">
        <Label>New Password</Label>
        <div className="relative">
          <Input type={show ? 'text' : 'password'} value={pwd} onChange={(e) => { setPwd(e.target.value); setError(''); setSuccess(false); }} placeholder="Minimum 8 characters" className="pr-10" autoComplete="new-password" />
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Confirm Password</Label>
        <Input type={show ? 'text' : 'password'} value={confirm} onChange={(e) => { setConfirm(e.target.value); setError(''); setSuccess(false); }} placeholder="Re-enter password" autoComplete="new-password" />
      </div>
      {error && <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</div>}
      {success && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2.5">
          <ShieldCheck className="h-4 w-4 flex-shrink-0" /> Password reset successfully.
        </div>
      )}
      <Button onClick={submit} disabled={isLoading || !pwd || !confirm} className="gap-2">
        {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" />Resetting…</> : <><KeyRound className="h-4 w-4" />Reset Password</>}
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Detail row helper                                                   */
/* ------------------------------------------------------------------ */

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/60 last:border-0">
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <span className="text-xs text-muted-foreground w-28 flex-shrink-0">{label}</span>
      <span className="text-sm text-foreground font-medium truncate">{value || '-'}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Member detail modal                                                 */
/* ------------------------------------------------------------------ */

type Tab = 'overview' | 'settings' | 'security';

function MemberDetail({
  member, companies, projects, isAdmin, isSelf, onSaved, onDeleted, onClose, onCompanyCreated,
}: {
  member: Member; companies: CompanyLite[]; projects: ProjectOption[]; isAdmin: boolean; isSelf: boolean;
  onSaved: (m: Member) => void; onDeleted: (id: string) => void; onClose: () => void;
  onCompanyCreated: (c: CompanyLite) => void;
}) {
  const { update: updateSession } = useSession();
  const [tab, setTab] = useState<Tab>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const roleCfg = ROLE_CONFIG[member.role as Role];

  async function handleSave(f: FormState) {
    setIsLoading(true); setError('');
    try {
      const res = await fetch(`/api/users/${member.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: f.name, email: f.email, role: f.role, status: f.status,
          companyId: f.companyId || null,
          salary: f.salary === '' ? null : Number(f.salary),
          paymentType: f.role === 'FREELANCER' ? (f.paymentType || null) : null,
          projectId: f.role === 'FREELANCER' ? (f.projectId || null) : null,
          phone: f.phone || null, position: f.position || null, department: f.department || null, address: f.address || null,
          avatar: f.avatar || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const updated = await res.json();
      onSaved({ ...member, ...updated, company: updated.company ?? null, project: updated.project ?? null });
      // Editing your own profile: refresh the session so the sidebar updates now.
      if (isSelf) await updateSession();
      setTab('overview');
    } catch (e: any) { setError(e.message); }
    finally { setIsLoading(false); }
  }

  async function handleDelete() {
    setIsLoading(true); setError('');
    try {
      const res = await fetch(`/api/users/${member.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      onDeleted(member.id);
    } catch (e: any) { setError(e.message); setIsLoading(false); }
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: CircleUserRound },
    ...(isAdmin ? [
      { id: 'settings' as Tab, label: 'Settings', icon: UserCog },
      { id: 'security' as Tab, label: 'Security', icon: KeyRound },
    ] : []),
  ];

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <Avatar className="h-11 w-11">
            {member.avatar && <AvatarImage src={member.avatar} alt={member.name} className="object-cover h-full w-full" />}
            <AvatarFallback className="bg-primary/10 text-primary font-semibold h-full w-full flex items-center justify-center">{getInitials(member.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-base font-semibold truncate">{member.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cn('text-[11px] font-medium px-1.5 py-0.5 rounded-md', roleCfg?.color)}>{roleCfg?.label}</span>
              <span className={cn('text-[11px] font-medium px-1.5 py-0.5 rounded-md',
                member.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400')}>
                {member.status === 'ACTIVE' ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </DialogTitle>
      </DialogHeader>

      {tabs.length > 1 && (
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setError(''); setConfirmDelete(false); }}
              className={cn('flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-md transition-colors',
                tab === t.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
            >
              <t.icon className="h-3.5 w-3.5" />{t.label}
            </button>
          ))}
        </div>
      )}

      {tab === 'overview' && (
        <div className="space-y-4 pt-1">
          <div>
            <div className="rounded-lg border border-border p-3">
              <InfoRow icon={Mail} label="Email" value={member.email} />
              <InfoRow icon={Phone} label="Phone" value={member.phone} />
              <InfoRow icon={Briefcase} label="Job Title" value={member.position} />
              <InfoRow icon={Users} label="Department" value={member.department} />
              <InfoRow icon={MapPin} label="Address" value={member.address} />
              <InfoRow icon={Building2} label="Company" value={member.company?.name} />
              {member.role === 'FREELANCER' ? (
                <>
                  <InfoRow icon={Wallet} label="Payment" value={member.paymentType
                    ? `${PAYMENT_LABEL[member.paymentType] ?? member.paymentType}${isAdmin && member.salary != null ? ` · PKR ${formatCurrency(member.salary)}` : ''}`
                    : null} />
                  {member.project && <InfoRow icon={FolderKanban} label="Engaged on" value={member.project.name} />}
                </>
              ) : (
                isAdmin && <InfoRow icon={Wallet} label="Salary" value={salaryLabel(member.salary)} />
              )}
              <InfoRow icon={CalendarDays} label="Joined" value={format(new Date(member.createdAt), 'dd MMM yyyy')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{member.taskCount}</p>
              <p className="text-xs text-muted-foreground">Assigned Tasks</p>
            </div>
            <div className="rounded-lg border border-border p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{member.teamCount}</p>
              <p className="text-xs text-muted-foreground">Teams</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <FolderKanban className="h-3.5 w-3.5" /> Projects ({member.projects.length})
            </p>
            <div className="space-y-1.5">
              {member.projects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/40 transition-colors">
                  <span className="text-sm text-foreground truncate">{p.name}</span>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">{p.status.replace(/_/g, ' ')}</span>
                </Link>
              ))}
              {member.projects.length === 0 && (
                <p className="text-sm text-muted-foreground italic">No projects assigned yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'settings' && isAdmin && (
        <>
          <MemberForm
            initial={{
              name: member.name, email: member.email, password: '',
              role: member.role as Role, status: member.status as FormState['status'],
              companyId: member.companyId ?? '', salary: member.salary?.toString() ?? '',
              paymentType: member.paymentType ?? 'MONTHLY', projectId: member.projectId ?? '',
              phone: member.phone ?? '', position: member.position ?? '', department: member.department ?? '', address: member.address ?? '',
              avatar: member.avatar ?? '',
            }}
            companies={companies} projects={projects} isLoading={isLoading} error={error}
            withPassword={false} submitLabel="Save Changes"
            onSubmit={handleSave} onCancel={onClose} onCompanyCreated={onCompanyCreated}
          />

          <div className="mt-5 pt-4 border-t border-destructive/20">
            <p className="text-xs font-semibold text-destructive uppercase tracking-wide mb-2">Danger Zone</p>
            {isSelf ? (
              <p className="text-sm text-muted-foreground">You cannot delete your own account.</p>
            ) : !confirmDelete ? (
              <Button variant="outline" className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4" /> Delete Member
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Permanently delete <span className="font-semibold text-foreground">{member.name}</span>? Their tasks will be unassigned. This cannot be undone.
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" disabled={isLoading} onClick={() => setConfirmDelete(false)}>Cancel</Button>
                  <Button variant="destructive" className="flex-1" disabled={isLoading} onClick={handleDelete}>
                    {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" />Deleting…</> : 'Delete Permanently'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'security' && isAdmin && (
        <ResetPasswordForm memberId={member.id} memberName={member.name} />
      )}
    </DialogContent>
  );
}

/* ------------------------------------------------------------------ */
/* Top-level manager                                                   */
/* ------------------------------------------------------------------ */

export function MembersManager({
  initialMembers, companies: initialCompanies, projects, isAdmin, currentUserId,
}: {
  initialMembers: Member[]; companies: CompanyLite[]; projects: ProjectOption[]; isAdmin: boolean; currentUserId: string;
}) {
  const [members, setMembers] = useState(initialMembers);
  const [companies, setCompanies] = useState(initialCompanies);
  const [showAdd, setShowAdd] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const detailMember = members.find((m) => m.id === detailId) ?? null;

  // A company created inline from a member form becomes available everywhere.
  function handleCompanyCreated(c: CompanyLite) {
    setCompanies((prev) => prev.some((x) => x.id === c.id) ? prev : [...prev, c].sort((a, b) => a.name.localeCompare(b.name)));
  }

  // Cohorts: salaried company staff, project-based freelancers, and clients.
  const ROLE_ORDER: Record<string, number> = {
    ADMIN: 1,
    MANAGER: 2,
    EMPLOYEE: 3,
  };
  const employees   = members
    .filter((m) => !['CLIENT', 'FREELANCER'].includes(m.role))
    .sort((a, b) => {
      const rA = ROLE_ORDER[a.role] ?? 99;
      const rB = ROLE_ORDER[b.role] ?? 99;
      if (rA !== rB) return rA - rB;
      return a.name.localeCompare(b.name);
    });
  const freelancers = members.filter((m) => m.role === 'FREELANCER');
  const clients     = members.filter((m) => m.role === 'CLIENT');

  function renderCard(m: Member) {
    const roleCfg = ROLE_CONFIG[m.role as Role];
    return (
      <Card key={m.id} className="group cursor-pointer hover:shadow-md hover:border-primary/30 transition-all" onClick={() => setDetailId(m.id)}>
        <CardContent className="p-5 flex items-center gap-4">
          <Avatar className="h-12 w-12">
            {m.avatar && <AvatarImage src={m.avatar} alt={m.name} className="object-cover h-full w-full" />}
            <AvatarFallback className="text-sm bg-primary/10 text-primary font-semibold h-full w-full flex items-center justify-center">{getInitials(m.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">{m.name}</p>
            <p className="text-xs text-muted-foreground truncate">{m.position ? `${m.position} · ` : ''}{m.company?.name || 'Internal'}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={cn('text-[11px] font-medium px-1.5 py-0.5 rounded-md', roleCfg?.color)}>{roleCfg?.label}</span>
              {m.role !== 'CLIENT' && <span className="text-xs text-muted-foreground">{m.taskCount} task{m.taskCount !== 1 ? 's' : ''}</span>}
              {m.status === 'INACTIVE' && <span className="text-[11px] text-muted-foreground">· Inactive</span>}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  function renderSection(label: string, icon: React.ElementType, list: Member[], emptyHint: string) {
    const Icon = icon;
    return (
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">{label}</h2>
          <span className="text-xs text-muted-foreground">({list.length})</span>
        </div>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground italic px-1">{emptyHint}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {list.map(renderCard)}
          </div>
        )}
      </section>
    );
  }

  async function handleAdd(f: FormState) {
    setIsLoading(true); setError('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: f.name, email: f.email, password: f.password, role: f.role, status: f.status,
          companyId: f.companyId || undefined,
          salary: f.salary === '' ? null : Number(f.salary),
          paymentType: f.role === 'FREELANCER' ? (f.paymentType || null) : null,
          projectId: f.role === 'FREELANCER' ? (f.projectId || null) : null,
          phone: f.phone || undefined, position: f.position || undefined, department: f.department || undefined, address: f.address || undefined,
          avatar: f.avatar || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const created = await res.json();
      const member: Member = {
        ...created, company: created.company ?? null, project: created.project ?? null,
        taskCount: 0, teamCount: 0, projects: [], createdAt: created.createdAt ?? new Date().toISOString(),
      };
      setMembers((prev) => [...prev, member].sort((a, b) => a.name.localeCompare(b.name)));
      setShowAdd(false);
    } catch (e: any) { setError(e.message); }
    finally { setIsLoading(false); }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">{members.length} member{members.length !== 1 ? 's' : ''}</p>
        {isAdmin && (
          <div className="flex items-center gap-2.5">
            <Button 
              size="sm" 
              variant="outline" 
              className="gap-2 border-violet-200/80 hover:bg-violet-50 text-violet-700 dark:border-violet-800/40 dark:hover:bg-violet-950/20" 
              onClick={() => window.dispatchEvent(new CustomEvent('open-add-labour'))}
            >
              <HardHat className="h-4 w-4" /> Add Labour
            </Button>
            <Button size="sm" className="gap-2" onClick={() => { setError(''); setShowAdd(true); }}>
              <UserPlus className="h-4 w-4" /> Add Member
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-8">
        {renderSection('Company Employees', Building2, employees, 'No company employees yet.')}
        {renderSection('Freelancers (Project Based)', Briefcase, freelancers, 'No freelancers yet.')}
        {renderSection('Clients', CircleUserRound, clients, 'No clients yet.')}
      </div>

      {/* Add member modal */}
      <Dialog open={showAdd} onOpenChange={(v) => { setShowAdd(v); setError(''); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-primary" />Add Team Member</DialogTitle></DialogHeader>
          <MemberForm initial={emptyForm()} companies={companies} projects={projects} isLoading={isLoading} error={error} withPassword submitLabel="Create Member" onSubmit={handleAdd} onCancel={() => setShowAdd(false)} onCompanyCreated={handleCompanyCreated} />
        </DialogContent>
      </Dialog>

      {/* Detail modal */}
      <Dialog open={!!detailMember} onOpenChange={(v) => { if (!v) setDetailId(null); }}>
        {detailMember && (
          <MemberDetail
            member={detailMember}
            companies={companies}
            projects={projects}
            isAdmin={isAdmin}
            isSelf={detailMember.id === currentUserId}
            onSaved={(updated) => setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)).sort((a, b) => a.name.localeCompare(b.name)))}
            onDeleted={(id) => { setMembers((prev) => prev.filter((m) => m.id !== id)); setDetailId(null); }}
            onClose={() => setDetailId(null)}
            onCompanyCreated={handleCompanyCreated}
          />
        )}
      </Dialog>
    </>
  );
}
