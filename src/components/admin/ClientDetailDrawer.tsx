'use client';

import React, { useState } from 'react';
import { X, Building2, Shield, FolderKanban, Users, Cpu, CreditCard, Save, AlertTriangle } from 'lucide-react';
import { ClientData } from './ClientTable';

interface ClientDetailDrawerProps {
  client: ClientData | null;
  onClose: () => void;
  onSave: (updated: Partial<ClientData>) => void;
}

export function ClientDetailDrawer({ client, onClose, onSave }: ClientDetailDrawerProps) {
  if (!client) return null;

  const [activeTab, setActiveTab] = useState<'profile' | 'projects' | 'users' | 'llm' | 'billing'>('profile');
  const [status, setStatus] = useState(client.status);
  const [billingStatus, setBillingStatus] = useState(client.billingStatus);
  const [planTier, setPlanTier] = useState(client.planTier);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/admin/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: client.id,
          status,
          billingStatus,
          planId: planTier,
        }),
      });
      onSave({ id: client.id, status, billingStatus, planTier });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Header */}
        <div className="p-5 bg-[#1A365D] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center font-bold text-white text-base">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">{client.name}</h2>
              <span className="text-xs text-sky-300">Tenant ID: {client.id}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 text-xs font-semibold text-slate-600 overflow-x-auto">
          {[
            { id: 'profile', label: 'Overview', icon: Building2 },
            { id: 'projects', label: 'Projects & Limits', icon: FolderKanban },
            { id: 'users', label: 'Users & Roles', icon: Users },
            { id: 'llm', label: 'LLM Copilot Caps', icon: Cpu },
            { id: 'billing', label: 'Billing & Plan', icon: CreditCard },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3.5 flex items-center gap-2 border-b-2 font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'border-[#2563EB] text-[#2563EB] font-bold bg-white'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block font-medium">Owner Name</span>
                  <span className="font-semibold text-slate-900 text-sm">{client.ownerName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Owner Email</span>
                  <span className="font-semibold text-slate-900 text-sm">{client.ownerEmail}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Phone</span>
                  <span className="font-semibold text-slate-900">{client.ownerPhone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Signup Date</span>
                  <span className="font-semibold text-slate-900">{new Date(client.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Status Controls */}
              <div className="space-y-3 pt-2">
                <h3 className="font-bold text-slate-900 text-sm">Tenant Administrative Status</h3>

                <div className="space-y-2">
                  <label className="block font-medium text-slate-600">Account Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800"
                  >
                    <option value="ACTIVE">ACTIVE (Full access)</option>
                    <option value="SUSPENDED">SUSPENDED (Blocked access)</option>
                    <option value="CANCELLED">CANCELLED (Archived)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block font-medium text-slate-600">Billing Status</label>
                  <select
                    value={billingStatus}
                    onChange={(e) => setBillingStatus(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800"
                  >
                    <option value="ACTIVE">ACTIVE (Paid)</option>
                    <option value="TRIAL">TRIAL (Evaluation)</option>
                    <option value="PAST_DUE">PAST_DUE (Payment failed)</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <h4 className="font-bold text-blue-900">Project Entitlements Gating</h4>
                <p className="text-blue-700 mt-1">
                  Currently built: <strong className="text-blue-950">{client.projectsCount}</strong> project(s). Maximum allowed on{' '}
                  <span className="uppercase font-semibold">{client.planTier}</span> tier is{' '}
                  <strong className="text-blue-950">{client.projectsMax}</strong>.
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                <h4 className="font-bold text-slate-900">Grant Custom Project Limit Override</h4>
                <p className="text-slate-500">Allow this client to build additional projects without upgrading plan tier.</p>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    defaultValue={typeof client.projectsMax === 'number' ? client.projectsMax : 99}
                    className="w-32 p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-900"
                  />
                  <button className="px-3 py-2 bg-[#2563EB] text-white font-semibold rounded-lg hover:bg-blue-700">
                    Apply Override
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="p-4 bg-cyan-50 border border-cyan-100 rounded-xl">
                <h4 className="font-bold text-cyan-900">Defined Users Gating</h4>
                <p className="text-cyan-800 mt-1">
                  Currently active: <strong className="text-cyan-950">{client.usersCount}</strong> user(s). Maximum allowed on{' '}
                  <span className="uppercase font-semibold">{client.planTier}</span> tier is{' '}
                  <strong className="text-cyan-950">{client.usersMax}</strong>.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900">User Role Distribution</h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-medium text-slate-700">Admins & Owners</span>
                    <span className="font-bold text-slate-900">1</span>
                  </div>
                  <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-medium text-slate-700">Project Managers & Engineers</span>
                    <span className="font-bold text-slate-900">{Math.max(1, client.usersCount - 2)}</span>
                  </div>
                  <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-medium text-slate-700">Accountants & Labour Supervisors</span>
                    <span className="font-bold text-slate-900">1</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'llm' && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl space-y-1">
                <h4 className="font-bold text-indigo-900">Tenant LLM Copilot Usage</h4>
                <p className="text-indigo-700">
                  Monthly Queries Used: <strong>{client.monthlyQueries}</strong>
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                <h4 className="font-bold text-slate-900">Force Model Provider for this Tenant</h4>
                <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800">
                  <option value="default">Use Global Default (Ollama Local GPU)</option>
                  <option value="ollama_qwen">Force Local Ollama (Qwen 2.5 7B)</option>
                  <option value="gemini_flash">Force Cloud Gemini (1.5 Flash)</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-4">
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                <h4 className="font-bold text-slate-900">Change Subscription Tier</h4>
                <div className="grid grid-cols-3 gap-2">
                  {['starter', 'growth', 'enterprise'].map((tier) => (
                    <button
                      key={tier}
                      onClick={() => setPlanTier(tier)}
                      className={`p-3 rounded-xl border text-center font-bold capitalize transition-all ${
                        planTier === tier
                          ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-2 shadow-md transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Changes...' : 'Save Tenant Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
