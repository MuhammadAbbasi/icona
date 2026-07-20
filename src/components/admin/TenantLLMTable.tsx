'use client';

import React from 'react';
import { Cpu, DollarSign, Activity, CheckCircle2 } from 'lucide-react';

export interface TenantLLMUsage {
  id: string;
  name: string;
  plan: string;
  queries: number;
  queryCap: number;
  inputTokens: number;
  outputTokens: number;
  estCostUsd: number;
  copilotState: string;
}

interface TenantLLMTableProps {
  tenants: TenantLLMUsage[];
}

export function TenantLLMTable({ tenants }: TenantLLMTableProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[#2563EB]" /> Per-Tenant LLM AI Copilot Telemetry
        </h3>
        <span className="text-xs text-slate-500 font-medium">Sorted by query volume</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
            <tr>
              <th className="py-2.5 px-3">Client Firm</th>
              <th className="py-2.5 px-3">Tier</th>
              <th className="py-2.5 px-3">Monthly Queries</th>
              <th className="py-2.5 px-3">Input Tokens</th>
              <th className="py-2.5 px-3">Output Tokens</th>
              <th className="py-2.5 px-3">Total Tokens</th>
              <th className="py-2.5 px-3">Est Cost (USD)</th>
              <th className="py-2.5 px-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
            {tenants.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-3 font-semibold text-[#0F172A]">{t.name}</td>
                <td className="py-3 px-3 capitalize">
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-100">
                    {t.plan}
                  </span>
                </td>
                <td className="py-3 px-3 font-bold text-slate-900">
                  {t.queries.toLocaleString()} / {t.queryCap.toLocaleString()}
                </td>
                <td className="py-3 px-3 text-slate-600">{(t.inputTokens / 1000000).toFixed(2)}M</td>
                <td className="py-3 px-3 text-slate-600">{(t.outputTokens / 1000000).toFixed(2)}M</td>
                <td className="py-3 px-3 font-semibold text-slate-900">
                  {((t.inputTokens + t.outputTokens) / 1000000).toFixed(2)}M
                </td>
                <td className="py-3 px-3 font-bold text-emerald-600">${t.estCostUsd.toFixed(2)}</td>
                <td className="py-3 px-3">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {t.copilotState}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
