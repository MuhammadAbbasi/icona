'use client';

import { useState } from 'react';
import { Eye, EyeOff, Loader2, ArrowRight, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [slug, setSlug] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false); // signup succeeded, verification email sent

  // Auto-generate slug from firm name
  const handleOrgNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setOrgName(val);
    // Convert to lowercase, replace spaces and special characters with hyphens
    const computedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // remove special chars
      .replace(/\s+/g, '-')         // replace spaces with hyphens
      .replace(/-+/g, '-');         // remove duplicate hyphens
    setSlug(computedSlug);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !password || !orgName || !slug) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
          orgName,
          slug,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        setIsLoading(false);
      } else {
        // The verification email link resumes the flow at /onboarding
        setSent(true);
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError('Connection failed. Please check your internet connection.');
      setIsLoading(false);
    }
  }

  function cleanEmail(e: string) {
    return e.toLowerCase().trim();
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[48%] relative bg-slate-950 overflow-hidden flex-col justify-between p-12">
        {/* Decorative background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-blue-600/20 blur-3xl" />
          <div className="absolute -bottom-40 -right-20 w-[500px] h-[500px] rounded-full bg-sky-600/15 blur-3xl" />
          <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] rounded-full bg-blue-500/10 blur-3xl" />
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl overflow-hidden shadow-lg bg-white p-0.5 flex-shrink-0">
              <img src="/logo-icon.png" alt="ICONA logo" className="h-full w-full object-contain" />
            </div>
            <div>
              <div className="text-white font-bold text-lg leading-none tracking-tight">ICONA</div>
              <div className="text-sky-500 text-xs font-semibold tracking-widest uppercase mt-0.5">SaaS ERP</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          {/* Main headline */}
          <div className="space-y-4">
            <h1 className="text-4xl font-extrabold text-white leading-[1.15] tracking-tight">
              Create your unified<br />
              <span className="text-sky-400">construction workspace</span>
            </h1>
            <p className="text-slate-400 text-base leading-relaxed max-w-sm">
              Provision a complete construction ERP and CRM suite for your projects, financials, labor, and subcontractors in under 60 seconds.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2">
            {['PKR Ledger', 'Subcontractors', 'Site Attendance', 'BOQ Revisions', 'Mobile App Sync'].map((tag) => (
              <span key={tag} className="text-xs font-medium px-3 py-1.5 rounded-full bg-white/5 text-slate-300 border border-white/10 shadow-sm">
                {tag}
              </span>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-2">
            {[
              { value: '1', label: 'Single Ledger' },
              { value: '7', label: 'Integrated Modules' },
              { value: 'PKR', label: 'Local Invoicing' },
            ].map((stat) => (
              <div key={stat.label} className="space-y-1">
                <div className="text-xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-slate-600">
          © 2026 ICONA. Built for small and medium construction firms in Pakistan.
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
          {sent ? (
            <div className="text-center py-6">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
                <MailCheck className="h-7 w-7 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Check your email</h2>
              <p className="mt-3 text-sm text-slate-500 leading-relaxed">
                We sent a verification link to <span className="font-semibold text-slate-900">{cleanEmail(email)}</span>.
                Click it to activate your workspace and continue with onboarding.
              </p>
              <p className="mt-4 text-xs text-slate-400">
                The link is valid for 24 hours. No email? Check your spam folder, or try signing in;
                we will send you a fresh link.
              </p>
            </div>
          ) : (
          <>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Get started with ICONA</h2>
            <p className="mt-1.5 text-sm text-slate-500">
              Sign up and configure your construction portal. Already have an account? <a href="/login" className="text-blue-600 hover:underline font-semibold">Sign in</a>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="orgName">Construction Firm / Company Name</Label>
              <Input
                id="orgName"
                type="text"
                placeholder="e.g. BuildCorp Pakistan"
                value={orgName}
                onChange={handleOrgNameChange}
                disabled={isLoading}
                required
                className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="slug">Workspace Subdomain Slug</Label>
              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-0 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500">
                <input
                  id="slug"
                  type="text"
                  placeholder="buildcorp"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  disabled={isLoading}
                  required
                  className="h-11 w-full bg-transparent pr-2 outline-none text-slate-900 placeholder-slate-400 text-sm font-mono"
                />
                <span className="text-slate-400 text-sm font-mono flex-shrink-0">.icona.app</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Your unique workspace ID (used for your firm&apos;s address later). Lowercase letters, numbers, and hyphens only.
              </p>
            </div>

            <div className="border-t border-slate-100 my-4 pt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Your Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Ahmad Raza"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  required
                  className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Work Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@buildcorp.pk"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Create Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    className="h-11 pr-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/10 text-sm font-semibold transition-all mt-2" disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating Workspace…</>
              ) : (
                <><span className="flex items-center gap-1 justify-center w-full">Start Onboarding <ArrowRight className="h-4 w-4" /></span></>
              )}
            </Button>
          </form>
          </>
          )}
        </div>
      </div>
    </div>
  );
}
