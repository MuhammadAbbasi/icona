'use client';

import React from 'react';
import { ShieldAlert, ShieldCheck, Clock, UserCheck, Lock } from 'lucide-react';

export interface AuditEntry {
  id: string;
  timestamp: string;
  adminEmail: string;
  ipAddress: string;
  action: string;
  targetClient: string;
  status: 'SUCCESS' | 'WARNING' | 'ALERT';
}

export function AdminAuditLogTable() {
  const sampleLogs: AuditEntry[] = [
    {
      id: 'log-1',
      timestamp: '2026-07-20 12:45:10',
      adminEmail: 'admin@icona.pk',
      ipAddress: '192.168.1.1',
      action: 'LLM_ENGINE_SWITCH',
      targetClient: 'Global Infrastructure (Ollama -> Gemini)',
      status: 'SUCCESS',
    },
    {
      id: 'log-2',
      timestamp: '2026-07-20 11:20:04',
      adminEmail: 'admin@icona.pk',
      ipAddress: '192.168.1.1',
      action: 'CLIENT_STATUS_UPDATE',
      targetClient: 'Apex Builders Ltd (Activated)',
      status: 'SUCCESS',
    },
    {
      id: 'log-3',
      timestamp: '2026-07-20 09:14:55',
      adminEmail: 'system-monitor',
      ipAddress: '127.0.0.1',
      action: 'CROSS_TENANT_IDOR_CHECK',
      targetClient: 'All Scoped Prisma Models',
      status: 'SUCCESS',
    },
    {
      id: 'log-4',
      timestamp: '2026-07-19 18:30:12',
      adminEmail: 'admin@icona.pk',
      ipAddress: '192.168.1.1',
      action: 'PROJECT_LIMIT_OVERRIDE',
      targetClient: 'Al-Rehman Construction (Max 5)',
      status: 'WARNING',
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" /> Immutable Super Admin Audit Log
        </h3>
        <span className="text-xs text-slate-500">Real-time action security stream</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
            <tr>
              <th className="py-2.5 px-3">Timestamp</th>
              <th className="py-2.5 px-3">Administrator</th>
              <th className="py-2.5 px-3">IP Address</th>
              <th className="py-2.5 px-3">Action Event</th>
              <th className="py-2.5 px-3">Target Resource</th>
              <th className="py-2.5 px-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
            {sampleLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">{log.timestamp}</td>
                <td className="py-3 px-3 font-semibold text-slate-900">{log.adminEmail}</td>
                <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">{log.ipAddress}</td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-100 text-slate-800 font-bold border border-slate-200">
                    {log.action}
                  </span>
                </td>
                <td className="py-3 px-3 text-slate-700">{log.targetClient}</td>
                <td className="py-3 px-3">
                  {log.status === 'SUCCESS' ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                      SUCCESS
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                      WARNING
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
