'use client';

import React, { useEffect, useState } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { LLMUsageChart } from '@/components/admin/LLMUsageChart';
import { TenantLLMTable, TenantLLMUsage } from '@/components/admin/TenantLLMTable';
import { Cpu, Zap, RefreshCw, Server, CheckCircle2, ShieldCheck, DollarSign } from 'lucide-react';

interface LLMData {
  activeEngine: {
    provider: string;
    model: string;
    baseUrl: string;
    vramUsagePercent: number;
    requestQueueDepth: number;
    status: string;
  };
  telemetry: {
    totalQueriesToday: number;
    totalQueriesMonth: number;
    inputTokensMonth: number;
    outputTokensMonth: number;
    totalTokensMonth: number;
    estCostUsd: number;
    estCostPkr: number;
    avgTtftMs: number;
    avgLatencyMs: number;
    errorRatePercent: number;
  };
  tenants: TenantLLMUsage[];
}

export default function AdminLLMPage() {
  const [data, setData] = useState<LLMData | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  const fetchLLMData = () => {
    setLoading(true);
    fetch('/api/admin/llm')
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLLMData();
  }, []);

  const handleSwitchProvider = async (provider: 'ollama' | 'gemini') => {
    setSwitching(true);
    try {
      await fetch('/api/admin/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      fetchLLMData();
    } catch (e) {
      console.error(e);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <AdminHeader
        title="LLM AI Copilot Telemetry & Infrastructure"
        subtitle="Monitor token usage, model latency, API costs, and switch between Local GPU and Cloud engines"
      />

      <main className="p-6 space-y-6 flex-1">
        {/* Engine Switcher Banner */}
        <div className="bg-[#1A365D] text-white p-6 rounded-2xl shadow-md border border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#38BDF8] flex items-center justify-center shadow-lg">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Active LLM Engine:</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {data?.activeEngine.provider} ({data?.activeEngine.model})
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Base URL: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sky-300">{data?.activeEngine.baseUrl}</code>
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSwitchProvider('ollama')}
              disabled={switching || data?.activeEngine.provider === 'ollama'}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all border ${
                data?.activeEngine.provider === 'ollama'
                  ? 'bg-[#2563EB] text-white border-blue-400 shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              Self-Hosted Ollama (Qwen 2.5)
            </button>

            <button
              onClick={() => handleSwitchProvider('gemini')}
              disabled={switching || data?.activeEngine.provider === 'gemini'}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all border ${
                data?.activeEngine.provider === 'gemini'
                  ? 'bg-[#2563EB] text-white border-blue-400 shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              Cloud Gemini 1.5 Flash
            </button>
          </div>
        </div>

        {/* Telemetry Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-medium uppercase">Total Tokens (Month)</span>
            <span className="text-2xl font-bold text-[#0F172A] block mt-1">
              {loading ? '...' : '6.20M'}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">4.92M Prompt • 1.28M Completion</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-medium uppercase">Est. Monthly Cost</span>
            <span className="text-2xl font-bold text-emerald-600 block mt-1">
              ${loading ? '...' : data?.telemetry.estCostUsd} USD
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">≈ PKR {data?.telemetry.estCostPkr}</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-medium uppercase">Average Latency</span>
            <span className="text-2xl font-bold text-sky-600 block mt-1">
              {loading ? '...' : data?.telemetry.avgLatencyMs} ms
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">First-Token: {data?.telemetry.avgTtftMs}ms</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-medium uppercase">VRAM / Queue</span>
            <span className="text-2xl font-bold text-indigo-600 block mt-1">
              {loading ? '...' : `${data?.activeEngine.vramUsagePercent}% VRAM`}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">Queue Depth: 0 requests</span>
          </div>
        </div>

        {/* Chart Section */}
        <LLMUsageChart />

        {/* Per-Tenant LLM Data Grid */}
        <TenantLLMTable tenants={data?.tenants || []} />
      </main>
    </div>
  );
}
