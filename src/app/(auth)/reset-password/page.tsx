'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowLeft, KeyRound, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function ResetPasswordFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Extract email from query parameter on load
  useEffect(() => {
    const qEmail = searchParams.get('email');
    if (qEmail) {
      setEmail(qEmail);
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !code || !newPassword || !confirmPassword) return;

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase(),
          code: code.trim(),
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to reset password.');
        setIsLoading(false);
        return;
      }

      setSuccess('Password reset successfully!');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch {
      setError('A network error occurred. Please try again.');
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 relative z-10 shadow-2xl">
      <div className="mb-6">
        <Link href="/forgot-password" className="inline-flex items-center gap-1 text-xs font-semibold text-highlight hover:text-highlight/80 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Verification Email
        </Link>
      </div>

      <div className="mb-6">
        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 mb-4">
          <KeyRound className="text-white h-5 w-5" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Reset Password</h2>
        <p className="mt-2 text-xs text-slate-400 leading-relaxed">
          Provide your account email, the 6-digit code received by the administrator, and choose a new secure password.
        </p>
      </div>

      {error && (
        <div className="mb-5 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-5 flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 rounded-lg px-3 py-2.5">
          <ShieldCheck className="h-4 w-4 flex-shrink-0 text-emerald-400" />
          {success} Redirecting to login page…
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="reset-email" className="text-slate-300 text-xs font-medium">Account Email Address</Label>
          <Input
            id="reset-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading || !!success}
            required
            className="h-10 bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500 focus-visible:ring-primary focus-visible:border-primary"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reset-code" className="text-slate-300 text-xs font-medium">6-Digit Verification Code</Label>
          <Input
            id="reset-code"
            type="text"
            maxLength={6}
            placeholder="e.g. 123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            disabled={isLoading || !!success}
            required
            className="h-10 bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500 text-center tracking-[10px] font-bold focus-visible:ring-primary focus-visible:border-primary"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="new-pw" className="text-slate-300 text-xs font-medium">New Password</Label>
          <div className="relative">
            <Input
              id="new-pw"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isLoading || !!success}
              required
              className="h-10 bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500 focus-visible:ring-primary focus-visible:border-primary pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm-pw" className="text-slate-300 text-xs font-medium">Confirm New Password</Label>
          <div className="relative">
            <Input
              id="confirm-pw"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading || !!success}
              required
              className="h-10 bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500 focus-visible:ring-primary focus-visible:border-primary pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" disabled={isLoading || !!success} className="w-full h-10 mt-2 bg-primary hover:bg-primary/90 text-white font-medium text-sm transition-all shadow-md shadow-primary/10">
          {isLoading ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Resetting Password…</>
          ) : (
            'Reset Password'
          )}
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary-dark/20 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[100px]" />
      </div>

      <Suspense fallback={
        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 relative z-10 flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <span className="text-sm text-slate-400">Loading form parameters…</span>
        </div>
      }>
        <ResetPasswordFormContent />
      </Suspense>
    </div>
  );
}
