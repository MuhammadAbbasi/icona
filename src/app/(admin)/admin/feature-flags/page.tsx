'use client';

import React, { useEffect, useState } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { FeatureFlagToggle } from '@/components/admin/FeatureFlagToggle';
import { ToggleRight, Sparkles, AlertTriangle, MessageSquare, ShieldAlert, Building2, BellRing } from 'lucide-react';

export default function AdminFeatureFlagsPage() {
  const [flags, setFlags] = useState<Record<string, boolean>>({
    ENABLE_AI_COPILOT: true,
    ENABLE_ROMAN_URDU_PARSER: true,
    ENABLE_WHATSAPP_ALERTS: true,
    ENABLE_TELEGRAM_BOT: true,
    ENABLE_ODOO_SYNC: true,
    ENABLE_SLACK_ALERTS: true,
    ENABLE_NOTION_SYNC: true,
    ENABLE_PREFILLED_MODALS: true,
    ENABLE_PADDLE_CHECKOUT: true,
    ENABLE_PKR_TAX_INVOICES: true,
    ENABLE_ADMIN_SIGNUP_ALERTS: true,
    ENABLE_ADMIN_SECURITY_ALERTS: true,
    ENABLE_ADMIN_LLM_COST_ALERTS: true,
    ENABLE_ADMIN_BILLING_ALERTS: true,
    MAINTENANCE_MODE: false,
  });

  useEffect(() => {
    fetch('/api/admin/feature-flags')
      .then((res) => res.json())
      .then((data) => {
        if (data.flags) setFlags(data.flags);
      })
      .catch((e) => console.error(e));
  }, []);

  const handleToggle = async (key: string, newValue: boolean) => {
    setFlags((prev) => ({ ...prev, [key]: newValue }));
    try {
      await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: newValue }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const clientFeatures = [
    {
      key: 'ENABLE_AI_COPILOT',
      title: 'LLM AI Copilot Assistant',
      description: 'Master toggle to enable or disable the AI Copilot chat widget across all client workspaces.',
    },
    {
      key: 'ENABLE_ROMAN_URDU_PARSER',
      title: 'Roman Urdu & Urdu Natural Language Understanding',
      description: 'Enables South Asian numeric parsing (Lakhs/Crores) and Roman Urdu prompt translation.',
    },
    {
      key: 'ENABLE_WHATSAPP_ALERTS',
      title: 'WhatsApp Daily Site Summaries',
      description: 'Send daily labour attendance & project progress digests directly to site directors on WhatsApp.',
    },
    {
      key: 'ENABLE_TELEGRAM_BOT',
      title: 'Telegram Field Supervisor Bot',
      description: 'Allows site engineers to log attendance, photo receipts, and voice notes via company Telegram bot.',
    },
    {
      key: 'ENABLE_ODOO_SYNC',
      title: 'Odoo ERP Financial Ledger Sync',
      description: 'Automated journal entry, sub-contractor payout, and vendor invoice synchronization with Odoo ERP.',
    },
    {
      key: 'ENABLE_SLACK_ALERTS',
      title: 'Slack Milestone & Blockage Alerts',
      description: 'Dispatches critical site blockage alerts and budget warnings to company Slack channels.',
    },
    {
      key: 'ENABLE_NOTION_SYNC',
      title: 'Notion Inspection Report Archiver',
      description: 'Syncs completed architectural specs and site quality inspection reports to client Notion databases.',
    },
    {
      key: 'ENABLE_PREFILLED_MODALS',
      title: 'Modal 1-Click Pre-Filling Engine',
      description: 'Allows AI Copilot to trigger action events that automatically open pre-filled creation dialogs.',
    },
    {
      key: 'ENABLE_PADDLE_CHECKOUT',
      title: 'Paddle Online Credit Card Checkout',
      description: 'Enables credit card subscription upgrades and international payments via Paddle MoR.',
    },
    {
      key: 'ENABLE_PKR_TAX_INVOICES',
      title: 'PKR FBR Tax Invoice Generator',
      description: 'Generates Pakistan FBR-compliant tax invoices with PRA/SRB tax breakdowns.',
    },
  ];

  const adminCommunicationAlerts = [
    {
      key: 'ENABLE_ADMIN_SIGNUP_ALERTS',
      title: 'Super Admin Instant Signup Alerts',
      description: 'Sends instant Telegram & WhatsApp alerts to Super Admin whenever a new construction firm registers.',
    },
    {
      key: 'ENABLE_ADMIN_SECURITY_ALERTS',
      title: 'Super Admin Security & Isolation Monitor',
      description: 'Real-time alert to Super Admin on cross-tenant access violations or brute-force authentication events.',
    },
    {
      key: 'ENABLE_ADMIN_LLM_COST_ALERTS',
      title: 'LLM Token Consumption & Cost Warnings',
      description: 'Triggers alert to Super Admin when any tenant exceeds monthly LLM token volume or cost thresholds.',
    },
    {
      key: 'ENABLE_ADMIN_BILLING_ALERTS',
      title: 'Subscription Renewal & Churn Notifications',
      description: 'Notifies Super Admin of upcoming client renewals, failed subscription payments, or cancellations.',
    },
    {
      key: 'MAINTENANCE_MODE',
      title: 'Platform Read-Only Maintenance Mode',
      description: 'Puts the web application into maintenance mode. All client write operations are temporarily paused.',
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <AdminHeader
        title="Global Feature Flags & Control Matrix"
        subtitle="Manage client-facing ERP features and Super Admin system communication alerts in real-time"
      />

      <main className="p-6 space-y-8 flex-1 max-w-4xl">
        <div className="bg-[#1A365D] text-white p-5 rounded-2xl shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ToggleRight className="w-8 h-8 text-[#38BDF8]" />
            <div>
              <h3 className="font-bold text-base">Real-Time Feature & Notification Matrix</h3>
              <p className="text-xs text-slate-300">Changes apply immediately across all client tenant sessions without redeploys.</p>
            </div>
          </div>
        </div>

        {/* Section 1: Client Tenant Features */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <Building2 className="w-5 h-5 text-[#2563EB]" />
            <h3 className="font-bold text-slate-900 text-sm">Client Tenant ERP Capabilities (Available to Signed-Up Firms)</h3>
          </div>
          <div className="space-y-3">
            {clientFeatures.map((f) => (
              <FeatureFlagToggle
                key={f.key}
                flagKey={f.key}
                title={f.title}
                description={f.description}
                enabled={!!flags[f.key]}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </div>

        {/* Section 2: Super Admin Platform Communications & Controls */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <BellRing className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-slate-900 text-sm">Super Admin System Communications & Platform Alerts</h3>
          </div>
          <div className="space-y-3">
            {adminCommunicationAlerts.map((f) => (
              <FeatureFlagToggle
                key={f.key}
                flagKey={f.key}
                title={f.title}
                description={f.description}
                enabled={!!flags[f.key]}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
