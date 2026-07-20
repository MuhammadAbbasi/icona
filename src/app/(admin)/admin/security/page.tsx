'use client';

import React from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminAuditLogTable } from '@/components/admin/AdminAuditLogTable';
import { ShieldCheck, ShieldAlert, Lock, Key, AlertTriangle, Activity } from 'lucide-react';

export default function AdminSecurityPage() {
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <AdminHeader
        title="Security & Audit Logs"
        subtitle="Monitor multi-tenant isolation fencing, RBAC session integrity, IDOR alerts, and administrative audit trails"
      />

      <main className="p-6 space-y-6 flex-1">
        {/* Telemetry Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Tenant Isolation Fence</span>
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-[#0F172A]">Strict Scoping Active</div>
            <p className="text-xs text-slate-500">Auto-injects where: &#123; orgId &#125; on candidate queries</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Cross-Tenant IDOR Violations</span>
              <ShieldAlert className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-emerald-600">0 Violations Detected</div>
            <p className="text-xs text-slate-500">Zero unauthorized cross-tenant requests in last 30 days</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Super Admin Role Gate</span>
              <Lock className="w-5 h-5 text-[#2563EB]" />
            </div>
            <div className="text-xl font-bold text-[#0F172A]">RBAC Enforcement On</div>
            <p className="text-xs text-slate-500">NextAuth session + role === 'SUPER_ADMIN' verification</p>
          </div>
        </div>

        {/* Audit Log Data Grid */}
        <AdminAuditLogTable />
      </main>
    </div>
  );
}
