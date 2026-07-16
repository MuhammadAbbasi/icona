'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowLeft, Mail, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to request reset code.');
        setIsLoading(false);
        return;
      }

      setSuccess('Verification code successfully requested!');
      setTimeout(() => {
        router.push(`/reset-password?email=${encodeURIComponent(email.toLowerCase())}`);
      }, 1500);
    } catch {
      setError('A network error occurred. Please try again.');
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[100px]" />
      </div>

      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 relative z-10 shadow-2xl">
        <div className="mb-6">
          <Link href="/login" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
          </Link>
        </div>

        <div className="mb-8">
          <div className="h-10 w-10 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4">
            <Mail className="text-white h-5 w-5" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Forgot Password</h2>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            Enter the email address associated with your account. A 6-digit verification code will be sent to the system-configured administrator/support inbox to reset your password.
          </p>
        </div>

        {error && (
          <div className="mb-5 flex items-center gap-2 text-xs text-rose-400 bg-rose-950/20 border border-rose-900/30 rounded-lg px-3 py-2.5">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 rounded-lg px-3 py-2.5">
            {success} Redirecting to reset page…
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="forgot-email" className="text-slate-300 text-xs font-medium">Email address</Label>
            <Input
              id="forgot-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading || !!success}
              required
              className="h-10 bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
            />
          </div>

          <Button type="submit" disabled={isLoading || !!success} className="w-full h-10 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-md shadow-indigo-600/10">
            {isLoading ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Requesting Code…</>
            ) : (
              'Send Verification Code'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
