'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, ShieldAlert, ShieldCheck } from 'lucide-react';
import { validatePasswordStrength } from '@/lib/password';

interface Props {
  password?: string;
}

export function PasswordStrengthMeter({ password = '' }: Props) {
  if (!password) return null;

  const result = validatePasswordStrength(password);
  const len = password.length;

  let widthPercent = Math.min(100, (len / 16) * 100);
  let barColor = 'bg-rose-500';
  let badgeColor = 'bg-rose-100 text-rose-700 border-rose-200';
  let label = 'Weak';

  if (result.score === 'STRONG') {
    barColor = 'bg-emerald-500';
    badgeColor = 'bg-emerald-100 text-emerald-700 border-emerald-200';
    label = 'Strong';
  } else if (result.score === 'GOOD') {
    barColor = 'bg-amber-500';
    badgeColor = 'bg-amber-100 text-amber-700 border-amber-200';
    label = 'Good';
  }

  return (
    <div className="mt-2 space-y-2 text-xs">
      <div className="flex items-center justify-between">
        <span className="text-slate-500 font-medium flex items-center gap-1">
          <span>Security Strength:</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
            {label}
          </span>
        </span>
        <span className="text-[11px] font-mono text-slate-400">{len} / 12+ chars</span>
      </div>

      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${barColor}`}
          style={{ width: `${widthPercent}%` }}
        />
      </div>

      {result.reasons.length > 0 && (
        <div className="text-[11px] text-rose-600 space-y-1 font-medium pt-0.5">
          {result.reasons.map((reason, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
              <span>{reason}</span>
            </div>
          ))}
        </div>
      )}

      {result.valid && (
        <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1.5 pt-0.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>Complies with NIST 12+ character security standard.</span>
        </div>
      )}
    </div>
  );
}
