'use client';

import { useState } from 'react';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FieldState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

type ShowState = Record<keyof FieldState, boolean>;

const INITIAL: FieldState = { currentPassword: '', newPassword: '', confirmPassword: '' };
const INITIAL_SHOW: ShowState = { currentPassword: false, newPassword: false, confirmPassword: false };

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const checks = [
    { label: '8+ characters', ok: password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Number', ok: /\d/.test(password) },
    { label: 'Special character', ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const bar = ['bg-rose-500', 'bg-amber-500', 'bg-amber-400', 'bg-emerald-500', 'bg-emerald-600'][score];
  const label = ['', 'Weak', 'Fair', 'Good', 'Strong'][score];

  return (
    <div className="space-y-2 mt-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i < score ? bar : 'bg-border'}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {checks.map((c) => (
            <span key={c.label} className={`text-[11px] ${c.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
              {c.ok ? '✓' : '○'} {c.label}
            </span>
          ))}
        </div>
        {label && <span className={`text-xs font-medium ${bar.replace('bg-', 'text-')}`}>{label}</span>}
      </div>
    </div>
  );
}

function PasswordInput({
  id, label, value, show,
  onChange, onToggle, placeholder,
}: {
  id: string; label: string; value: string; show: boolean;
  onChange: (v: string) => void; onToggle: () => void; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? '••••••••'}
          autoComplete="new-password"
          className="pr-10"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export function ChangePasswordForm() {
  const [fields, setFields] = useState<FieldState>(INITIAL);
  const [show, setShow] = useState<ShowState>(INITIAL_SHOW);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function setField(key: keyof FieldState) {
    return (value: string) => {
      setFields((prev) => ({ ...prev, [key]: value }));
      setError('');
      setSuccess(false);
    };
  }

  function toggleShow(key: keyof ShowState) {
    return () => setShow((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (fields.newPassword !== fields.confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (fields.newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/user/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: fields.currentPassword,
          newPassword: fields.newPassword,
          confirmPassword: fields.confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to update password.'); return; }

      setSuccess(true);
      setFields(INITIAL);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PasswordInput
        id="current-password"
        label="Current Password"
        value={fields.currentPassword}
        show={show.currentPassword}
        onChange={setField('currentPassword')}
        onToggle={toggleShow('currentPassword')}
      />

      <div className="space-y-1.5">
        <PasswordInput
          id="new-password"
          label="New Password"
          value={fields.newPassword}
          show={show.newPassword}
          onChange={setField('newPassword')}
          onToggle={toggleShow('newPassword')}
          placeholder="Minimum 8 characters"
        />
        <PasswordStrength password={fields.newPassword} />
      </div>

      <PasswordInput
        id="confirm-password"
        label="Confirm New Password"
        value={fields.confirmPassword}
        show={show.confirmPassword}
        onChange={setField('confirmPassword')}
        onToggle={toggleShow('confirmPassword')}
      />

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5">
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2.5">
          <ShieldCheck className="h-4 w-4 flex-shrink-0" />
          Password updated successfully. Your new password is now active.
        </div>
      )}

      <Button type="submit" disabled={isLoading || !fields.currentPassword || !fields.newPassword || !fields.confirmPassword} className="gap-2">
        {isLoading
          ? <><Loader2 className="h-4 w-4 animate-spin" />Updating…</>
          : <><ShieldCheck className="h-4 w-4" />Update Password</>}
      </Button>
    </form>
  );
}
