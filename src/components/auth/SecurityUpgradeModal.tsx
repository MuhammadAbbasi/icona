'use client';

import React, { useState } from 'react';
import { ShieldAlert, Key, CheckCircle2, Lock, ArrowRight, X } from 'lucide-react';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { validatePasswordStrength } from '@/lib/password';

interface Props {
  userEmail: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SecurityUpgradeModal({ userEmail, isOpen, onClose }: Props) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpgradePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const pwdVal = validatePasswordStrength(newPassword);
    if (!pwdVal.valid) {
      setError(pwdVal.message || 'Password does not meet 12+ character security requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch('/api/user/security-upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, newPassword }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(json.error || 'Failed to update credentials.');
      }
    } catch {
      setError('Network error updating credentials.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Account Security Upgrade</h3>
            <p className="text-xs text-slate-500">Update password to NIST 12+ character standard</p>
          </div>
        </div>

        {success ? (
          <div className="py-6 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
            <h4 className="font-bold text-slate-900 text-sm">Credentials Upgraded!</h4>
            <p className="text-xs text-slate-500">Your account is now fully secured under NIST SP 800-63B standards.</p>
          </div>
        ) : (
          <form onSubmit={handleUpgradePassword} className="space-y-4 text-xs">
            <p className="text-slate-600 leading-relaxed">
              To protect your ICONA workspace and project data, please update your account password to meet the new 12+ character security requirement.
            </p>

            {error && (
              <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">New Password (Min 12 Chars)</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new 12+ character password..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                  required
                />
              </div>
              <PasswordStrengthMeter password={newPassword} />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Confirm New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={updating}
              className="w-full py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              <span>{updating ? 'Securing Account…' : 'Upgrade Password & Secure Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
