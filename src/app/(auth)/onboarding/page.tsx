'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { 
  Check, 
  Loader2, 
  ArrowLeft, 
  ArrowRight, 
  CreditCard, 
  Building, 
  Users, 
  FileSpreadsheet, 
  Globe, 
  LayoutGrid,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// useSearchParams needs a Suspense boundary for prerender (Next 14 requirement).
export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingWizard />
    </Suspense>
  );
}

function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = searchParams.get('orgId') || '';
  const email = searchParams.get('email') || '';
  // Minted when the verification link was clicked; proves account ownership so
  // step 5 can sign in without asking the user to blindly retype their
  // signup password. Missing/expired (e.g. wizard resumed a day later) falls
  // back to the password field further down.
  const onboardingToken = searchParams.get('ob') || '';

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Step 1: Localization
  const [currency, setCurrency] = useState('PKR');
  const [timezone, setTimezone] = useState('Asia/Karachi');
  const [taxRate, setTaxRate] = useState(15);
  const [address, setAddress] = useState('');

  // Step 2: Terminology
  const [level1, setLevel1] = useState('Domain');
  const [level2, setLevel2] = useState('Task');
  const [level3, setLevel3] = useState('Subtask');
  const [inviteEmails, setInviteEmails] = useState('');

  // Step 3: Subscription (14-day free trial, no card collected)
  const [selectedPlan, setSelectedPlan] = useState('growth'); // starter | growth | enterprise
  const [billingPeriod, setBillingPeriod] = useState('monthly'); // monthly | annual

  // Step 4: BOQ Template
  const [boqFile, setBoqFile] = useState<File | null>(null);
  const [importNote, setImportNote] = useState('');

  // Step 5: Final Login
  const [loginPassword, setLoginPassword] = useState('');
  // True once a token-based sign-in attempt has failed (expired/used), so the
  // form reveals the password fallback instead of dead-ending the wizard.
  const [tokenFailed, setTokenFailed] = useState(false);
  const needsPassword = !onboardingToken || tokenFailed;

  // Plan Details
  const plans = {
    starter: { name: 'Starter Plan', monthlyPrice: 25, annualPrice: 250, projects: 5, members: 3 },
    growth: { name: 'Growth Plan', monthlyPrice: 50, annualPrice: 500, projects: 25, members: 15 },
    enterprise: { name: 'Enterprise Plan', monthlyPrice: 75, annualPrice: 750, projects: 'Unlimited', members: 'Unlimited' }
  };

  const getPlanPrice = (planKey: 'starter' | 'growth' | 'enterprise') => {
    const plan = plans[planKey];
    return billingPeriod === 'monthly' ? `$${plan.monthlyPrice}/mo` : `$${plan.annualPrice}/yr`;
  };

  const handleNextStep = () => {
    setError('');
    setStep(step + 1);
  };

  const handlePrevStep = () => {
    setError('');
    setStep(step - 1);
  };

  async function handleFinalSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) {
      setError('Invalid organization setup context.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 1. Save configurations to backend
      const configRes = await fetch('/api/settings/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orgId,
          currency,
          timezone,
          taxRate,
          address,
          terminology: { Domain: level1, Task: level2, Subtask: level3 },
          planId: `${selectedPlan}_${billingPeriod}`,
          inviteEmails: inviteEmails.split(',').map(e => e.trim()).filter(Boolean)
        })
      });

      const configData = await configRes.json();

      if (!configRes.ok) {
        setError(configData.error || 'Failed to apply onboarding configuration.');
        setIsLoading(false);
        return;
      }

      // 2. Sign in. Prefer the one-time onboarding token minted when the
      // verification link was clicked (no password re-entry); fall back to
      // the typed password if the token is absent or has expired.
      if (!needsPassword) {
        const loginRes = await signIn('credentials', { email, onboardingToken, redirect: false });
        if (loginRes?.error) {
          setTokenFailed(true);
          setError('Your setup session has expired. Please enter your account password below to continue.');
          setIsLoading(false);
          return;
        }
      } else {
        if (!loginPassword) {
          setError('Please enter your password.');
          setIsLoading(false);
          return;
        }
        const loginRes = await signIn('credentials', { email, password: loginPassword, redirect: false });
        if (loginRes?.error) {
          setError('Incorrect password. Please try again, or reset it from the sign-in page.');
          setIsLoading(false);
          return;
        }
      }

      // 3. If a BOQ file was chosen in step 4, create the first project and
      // import it now that we have an authenticated session.
      let firstProjectId = '';
      if (boqFile && configData.companyId) {
        try {
          const projRes = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: boqFile.name.replace(/\.(xlsx|csv)$/i, ''),
              companyId: configData.companyId,
            }),
          });
          const project = await projRes.json();
          if (!projRes.ok) throw new Error(project.error || 'Project creation failed');

          const fd = new FormData();
          fd.append('file', boqFile);
          const impRes = await fetch(`/api/projects/${project.id}/import-boq`, { method: 'POST', body: fd });
          if (!impRes.ok) throw new Error((await impRes.json().catch(() => ({})))?.error || 'BOQ import failed');
          firstProjectId = project.id;
        } catch (impErr: any) {
          console.error('Onboarding BOQ import failed:', impErr);
          setImportNote(`BOQ import did not finish (${impErr.message}). You can import it from the Projects page.`);
        }
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(firstProjectId ? `/projects/${firstProjectId}` : '/board?onboarding=true');
        router.refresh();
      }, 1500);
    } catch (err) {
      console.error(err);
      setError('An unexpected network error occurred.');
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Header Progress Bar */}
        <div className="bg-slate-900 px-8 py-6 text-white relative">
          <div className="absolute -top-10 -left-10 w-[200px] h-[200px] rounded-full bg-orange-500/10 blur-2xl" />
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <span className="text-orange-500 font-bold text-xs uppercase tracking-wider">Setup Wizard</span>
              <h1 className="text-xl font-bold tracking-tight">Configure Your Construction Portal</h1>
            </div>
            <div className="text-sm font-semibold text-slate-400">
              Step {step} of 5
            </div>
          </div>
          
          {/* Progress Indicators */}
          <div className="mt-6 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-orange-500 transition-all duration-300 ease-out" 
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 flex items-start gap-2.5 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {/* STEP 1: Localization & Company Details */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <Globe className="h-5 w-5 text-orange-500" />
                <h2 className="text-lg font-bold text-slate-900">Step 1: Regional & Profile Settings</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="currency">Base Currency</Label>
                  <select 
                    id="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full h-11 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                  >
                    <option value="PKR">PKR (Pakistani Rupee)</option>
                    <option value="USD">USD (US Dollar)</option>
                    <option value="AED">AED (UAE Dirham)</option>
                    <option value="SAR">SAR (Saudi Riyal)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="taxRate">Default Sales Tax Rate (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="h-11 border-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="timezone">Timezone</Label>
                <select 
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full h-11 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                >
                  <option value="Asia/Karachi">Asia/Karachi (GMT+5:00)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GMT+4:00)</option>
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address">Main Office Address</Label>
                <textarea
                  id="address"
                  rows={3}
                  placeholder="e.g. 45-B, Sector Z, Phase 3, DHA, Lahore, Pakistan"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:border-orange-500 focus:ring-orange-500 outline-none"
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleNextStep} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-11 px-6 text-sm font-semibold transition-all">
                  Next Step <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Hierarchy & Terminology */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <LayoutGrid className="h-5 w-5 text-orange-500" />
                <h2 className="text-lg font-bold text-slate-900">Step 2: WBS Hierarchy & Team Invites</h2>
              </div>
              
              <p className="text-sm text-slate-500 leading-relaxed">
                ICONA organizes project estimates (BOQs) into a hierarchical tree. Customize the names of these levels to match your construction firm's terminology.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="space-y-1.5">
                  <Label htmlFor="level1">Level 1 Name</Label>
                  <Input
                    id="level1"
                    type="text"
                    value={level1}
                    onChange={(e) => setLevel1(e.target.value)}
                    className="h-10 border-slate-200"
                  />
                  <p className="text-[10px] text-slate-400">e.g. Domain, Block, Phase</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="level2">Level 2 Name</Label>
                  <Input
                    id="level2"
                    type="text"
                    value={level2}
                    onChange={(e) => setLevel2(e.target.value)}
                    className="h-10 border-slate-200"
                  />
                  <p className="text-[10px] text-slate-400">e.g. Task, Element, Group</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="level3">Level 3 Name</Label>
                  <Input
                    id="level3"
                    type="text"
                    value={level3}
                    onChange={(e) => setLevel3(e.target.value)}
                    className="h-10 border-slate-200"
                  />
                  <p className="text-[10px] text-slate-400">e.g. Subtask, Item, Activity</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inviteEmails">Invite Team Members (Optional)</Label>
                <textarea
                  id="inviteEmails"
                  rows={2}
                  placeholder="name@buildcorp.pk, supervisor@buildcorp.pk"
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:border-orange-500 focus:ring-orange-500 outline-none"
                />
                <p className="text-[11px] text-slate-400">Separate email addresses with commas. We will send invitation links to join your firm.</p>
              </div>

              <div className="flex justify-between pt-4">
                <Button onClick={handlePrevStep} variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl h-11 px-6">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Button onClick={handleNextStep} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-11 px-6 text-sm font-semibold transition-all">
                  Next Step <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Plan & Simulated Payment */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <CreditCard className="h-5 w-5 text-orange-500" />
                <h2 className="text-lg font-bold text-slate-900">Step 3: Choose Plan & Simulated Billing</h2>
              </div>

              {/* Monthly/Annual toggle */}
              <div className="flex justify-center mb-4">
                <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setBillingPeriod('monthly')}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${billingPeriod === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Monthly Billing
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingPeriod('annual')}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${billingPeriod === 'annual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Annual Billing <span className="bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">-16% (2 Months Free)</span>
                  </button>
                </div>
              </div>

              {/* Plan selector cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(['starter', 'growth', 'enterprise'] as const).map((key) => {
                  const plan = plans[key];
                  const isSelected = selectedPlan === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedPlan(key)}
                      className={`text-left p-4 rounded-xl border transition-all flex flex-col justify-between ${isSelected ? 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/10' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'}`}
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${key === 'growth' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-700'}`}>
                            {key === 'growth' ? 'Popular' : key}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm mt-2">{plan.name}</h3>
                        <div className="text-xl font-bold text-slate-950 mt-1">
                          {getPlanPrice(key)}
                        </div>
                      </div>
                      
                      <ul className="text-xs text-slate-500 space-y-1.5 mt-4 w-full">
                        <li className="flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                          <span>{plan.projects} Projects limit</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                          <span>{plan.members} Team members</span>
                        </li>
                      </ul>
                    </button>
                  );
                })}
              </div>

              {/* 14-day free trial — no card collected. Card payments arrive with the
                  payment-provider integration (hosted checkout + webhook), never a raw form. */}
              <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-200/60 mt-4 space-y-3">
                <h3 className="font-bold text-emerald-900 text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> 14-day free trial — no card required
                </h3>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Your workspace starts on a full-featured trial of the plan you pick. When the
                  trial ends, pay by bank transfer (PKR invoicing available) or card — we&apos;ll
                  remind you inside the portal. Nothing is charged today.
                </p>
                <p className="text-[10px] text-emerald-700/70">
                  You can switch plans at any time; limits apply per plan from day one.
                </p>
              </div>

              <div className="flex justify-between pt-4">
                <Button onClick={handlePrevStep} variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl h-11 px-6">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Button onClick={handleNextStep} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-11 px-6 text-sm font-semibold transition-all">
                  Start Free Trial <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: First BOQ Import */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <FileSpreadsheet className="h-5 w-5 text-orange-500" />
                <h2 className="text-lg font-bold text-slate-900">Step 4: Seed First Project & BOQ</h2>
              </div>

              <p className="text-sm text-slate-500 leading-relaxed">
                You can import your first project and its Bill of Quantities (BOQ) directly from an Excel sheet. Don't have one ready? Download our template or skip this step to setup inside the portal later.
              </p>

              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col items-center">
                <FileSpreadsheet className="h-12 w-12 text-slate-400 mb-3" />
                <span className="text-sm font-semibold text-slate-700">Drag & Drop BOQ spreadsheet here</span>
                <span className="text-xs text-slate-400 mt-1">Accepts .xlsx and .csv files up to 5MB</span>
                
                <input 
                  type="file" 
                  id="boqUpload" 
                  className="hidden" 
                  onChange={(e) => setBoqFile(e.target.files?.[0] || null)}
                  accept=".xlsx,.csv"
                />
                
                <Button 
                  onClick={() => document.getElementById('boqUpload')?.click()}
                  variant="outline" 
                  className="border-slate-200 text-slate-700 hover:bg-white rounded-lg h-9 px-4 text-xs font-semibold mt-4 shadow-sm"
                >
                  Choose File
                </Button>

                {boqFile && (
                  <div className="mt-3 text-xs text-orange-600 bg-orange-50 border border-orange-100 rounded-lg px-3 py-1.5 font-mono flex items-center gap-1.5">
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    {boqFile.name} ({(boqFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>

              <div className="flex justify-center">
                <a
                  href="/api/boq/template"
                  download
                  className="text-xs text-orange-600 font-semibold hover:underline flex items-center gap-1.5"
                >
                  Download Sample BOQ Template
                </a>
              </div>

              <div className="flex justify-between pt-4">
                <Button onClick={handlePrevStep} variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl h-11 px-6">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Button onClick={handleNextStep} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-11 px-6 text-sm font-semibold transition-all">
                  {boqFile ? 'Continue with Import' : 'Skip for Now'} <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 5: Final Confirmation & Login */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <CheckCircle2 className="h-5 w-5 text-orange-500" />
                <h2 className="text-lg font-bold text-slate-900">Step 5: Confirm & Launch Portal</h2>
              </div>

              {success ? (
                <div className="text-center py-8 space-y-4">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 shadow-md">
                    <Check className="h-8 w-8 stroke-[3]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Workspace Configured!</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {boqFile && !importNote ? 'First project imported. Redirecting you to it...' : 'Redirecting you to the project board...'}
                    </p>
                    {importNote && (
                      <p className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">{importNote}</p>
                    )}
                  </div>
                  <Loader2 className="h-6 w-6 animate-spin text-orange-500 mx-auto mt-4" />
                </div>
              ) : (
                <form onSubmit={handleFinalSubmit} className="space-y-5">
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {needsPassword
                      ? "You're almost there! Please confirm the password you created at signup to deploy and log into your dashboard."
                      : "You're almost there! All settings are ready — confirm below to deploy your workspace and open your dashboard."}
                  </p>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-slate-600">
                      <span>Administrator Account:</span>
                      <span className="text-slate-900 font-mono">{email}</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold text-slate-600">
                      <span>Selected Tier:</span>
                      <span className="text-slate-900 uppercase font-bold">{selectedPlan} Plan ({billingPeriod})</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold text-slate-600">
                      <span>Base Currency:</span>
                      <span className="text-slate-900">{currency}</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold text-slate-600">
                      <span>WBS Hierarchy:</span>
                      <span className="text-slate-900">{level1} ➔ {level2} ➔ {level3}</span>
                    </div>
                  </div>

                  {needsPassword && (
                    <div className="space-y-1.5">
                      <Label htmlFor="loginPassword">Confirm Password</Label>
                      <Input
                        id="loginPassword"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        disabled={isLoading}
                        required
                        className="h-11 border-slate-200 focus:border-orange-500 focus:ring-orange-500"
                      />
                      <p className="text-xs text-slate-400">
                        Forgot it? <a href="/forgot-password" className="text-orange-600 hover:underline font-medium">Reset your password</a> — your setup progress is saved.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between pt-4 border-t border-slate-100">
                    <Button type="button" onClick={handlePrevStep} variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl h-11 px-6" disabled={isLoading}>
                      <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>
                    <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl h-11 px-6 text-sm font-semibold transition-all" disabled={isLoading}>
                      {isLoading ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-2" />Deploying ERP…</>
                      ) : (
                        <><Check className="h-4 w-4 mr-2" /> Save & Launch</>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
