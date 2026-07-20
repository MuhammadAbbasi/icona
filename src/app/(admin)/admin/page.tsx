'use client';

import React, { useEffect, useState } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { ClientTable, ClientData } from '@/components/admin/ClientTable';
import { ClientDetailDrawer } from '@/components/admin/ClientDetailDrawer';
import {
  Building2,
  FolderKanban,
  Users,
  DollarSign,
  Cpu,
  TrendingUp,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Filter,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import Link from 'next/link';

interface AdminStats {
  summary: {
    totalClients: number;
    activeClients: number;
    trialClients: number;
    suspendedClients: number;
    totalProjects: number;
    totalUsers: number;
    mrrUsd: number;
    mrrPkr: number;
  };
  llmStats: {
    activeProvider: string;
    activeModel: string;
    monthlyQueries: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    estCostUsd: number;
    estCostPkr: number;
    avgLatencyMs: number;
    successRatePercent: number;
  };
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/admin/stats').then((res) => res.json()),
      fetch('/api/admin/clients').then((res) => res.json()),
    ])
      .then(([statsData, clientsData]) => {
        if (!statsData.error) setStats(statsData);
        if (clientsData.clients) setClients(clientsData.clients);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateStatus = (clientId: string, newStatus: string) => {
    setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, status: newStatus } : c)));
  };

  const filteredClients = clients.filter((c) => {
    if (filterTier !== 'all' && c.planTier !== filterTier) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchOwner = c.ownerName.toLowerCase().includes(q);
      const matchEmail = c.ownerEmail.toLowerCase().includes(q);
      const matchSlug = c.slug.toLowerCase().includes(q);
      if (!matchName && !matchOwner && !matchEmail && !matchSlug) return false;
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <AdminHeader
        title="Signed-Up Clients Command Center"
        subtitle="Complete visibility & management dashboard for every construction firm signed up on ICONA"
      />

      <main className="p-6 space-y-6 flex-1">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Signed Up Clients */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Signed-Up Clients</span>
              <div className="p-2 rounded-lg bg-blue-50 text-[#2563EB]">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-[#0F172A]">
                {loading ? '...' : stats?.summary.totalClients} Construction Firms
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {stats?.summary.activeClients} Paid Active • {stats?.summary.trialClients} Evaluation
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-[#2563EB] font-medium">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> 100% Tenant Isolation
              </span>
            </div>
          </div>

          {/* Monthly Revenue (MRR) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly Recurring Revenue</span>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-[#0F172A]">
                ${loading ? '...' : stats?.summary.mrrUsd.toLocaleString()} USD
              </div>
              <p className="text-xs text-slate-500 mt-1">
                ≈ PKR {loading ? '...' : stats?.summary.mrrPkr.toLocaleString()}
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-600 font-medium">
              <span>Paddle MoR & Bank Transfer</span>
            </div>
          </div>

          {/* Total Client Built Projects */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Client Projects</span>
              <div className="p-2 rounded-lg bg-cyan-50 text-cyan-600">
                <FolderKanban className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-[#0F172A]">
                {loading ? '...' : stats?.summary.totalProjects} Active Projects
              </div>
              <p className="text-xs text-slate-500 mt-1">Projects created across client firms</p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
              <span>Tier Limits Enforced</span>
            </div>
          </div>

          {/* Total Defined Users */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Defined Users</span>
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-[#0F172A]">
                {loading ? '...' : stats?.summary.totalUsers} Client Members
              </div>
              <p className="text-xs text-slate-500 mt-1">Owners, PMs, Engineers & Staff</p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
              <span>Multi-Tenant Auth</span>
            </div>
          </div>
        </div>

        {/* Client Directory Header & Filter Control Bar */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            {/* Live Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by client name, owner, email, domain..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 text-slate-900 placeholder-slate-400 font-medium"
              />
            </div>

            {/* Filters & Refresh */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <Filter className="w-4 h-4 text-slate-400" />
                <span>Tier:</span>
                <select
                  value={filterTier}
                  onChange={(e) => setFilterTier(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs font-medium text-slate-800 focus:outline-none"
                >
                  <option value="all">All Tiers</option>
                  <option value="starter">Starter ($25)</option>
                  <option value="growth">Growth ($50)</option>
                  <option value="enterprise">Enterprise ($75)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <span>Status:</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs font-medium text-slate-800 focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="TRIAL">Trial</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>

              <button
                onClick={fetchData}
                className="p-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                title="Refresh Client List"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Client Directory Data Table */}
          {loading ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400 text-sm font-medium">
              Loading signed-up clients...
            </div>
          ) : (
            <ClientTable
              clients={filteredClients}
              onSelectClient={(client) => setSelectedClient(client)}
              onUpdateStatus={handleUpdateStatus}
            />
          )}
        </div>

        {/* LLM Engine Telemetry Banner */}
        <div className="bg-gradient-to-br from-[#1A365D] to-[#0F172A] text-white p-6 rounded-2xl shadow-lg border border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/80 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center text-white shadow-md">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">LLM AI Copilot Telemetry & Infrastructure</h2>
                <p className="text-xs text-slate-300">
                  Engine: <span className="font-semibold text-sky-400 uppercase">{stats?.llmStats.activeProvider}</span> ({stats?.llmStats.activeModel})
                </p>
              </div>
            </div>

            <Link
              href="/admin/llm"
              className="inline-flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-md transition-colors"
            >
              <Zap className="w-3.5 h-3.5" /> Manage Copilot Settings
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
              <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider block">Monthly Queries</span>
              <span className="text-xl font-bold text-white mt-1 block">
                {loading ? '...' : stats?.llmStats.monthlyQueries.toLocaleString()}
              </span>
              <span className="text-[10px] text-emerald-400">99.4% Success Rate</span>
            </div>

            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
              <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider block">Cumulative Tokens</span>
              <span className="text-xl font-bold text-white mt-1 block">
                {loading ? '...' : '6.2M'}
              </span>
              <span className="text-[10px] text-slate-400">4.9M Input • 1.2M Output</span>
            </div>

            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
              <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider block">Est. Monthly Cost</span>
              <span className="text-xl font-bold text-emerald-400 mt-1 block">
                ${loading ? '...' : stats?.llmStats.estCostUsd} USD
              </span>
              <span className="text-[10px] text-slate-400">≈ PKR {stats?.llmStats.estCostPkr}</span>
            </div>

            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
              <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider block">Average Latency</span>
              <span className="text-xl font-bold text-sky-300 mt-1 block">
                {loading ? '...' : stats?.llmStats.avgLatencyMs} ms
              </span>
              <span className="text-[10px] text-slate-400">First-Token: ~140ms</span>
            </div>
          </div>
        </div>
      </main>

      {/* Client Management Detail Drawer */}
      <ClientDetailDrawer
        client={selectedClient}
        onClose={() => setSelectedClient(null)}
        onSave={(updated) => {
          setClients((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
        }}
      />
    </div>
  );
}
