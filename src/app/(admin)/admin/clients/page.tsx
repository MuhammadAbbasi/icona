'use client';

import React, { useEffect, useState } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { ClientTable, ClientData } from '@/components/admin/ClientTable';
import { ClientDetailDrawer } from '@/components/admin/ClientDetailDrawer';
import { Building2, Plus, Filter, Download, RefreshCw } from 'lucide-react';

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [filterTier, setFilterTier] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const fetchClients = () => {
    setLoading(true);
    fetch('/api/admin/clients')
      .then((res) => res.json())
      .then((data) => {
        if (data.clients) setClients(data.clients);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleUpdateStatus = (clientId: string, newStatus: string) => {
    setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, status: newStatus } : c)));
  };

  const filteredClients = clients.filter((c) => {
    if (filterTier !== 'all' && c.planTier !== filterTier) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <AdminHeader
        title="Client & Tenant Directory"
        subtitle="Manage onboarded construction companies, built project limits, and user allocations"
      />

      <main className="p-6 space-y-6 flex-1">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <Filter className="w-4 h-4 text-slate-400" />
              <span>Plan Tier:</span>
              <select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg py-1 px-2 text-xs font-medium text-slate-800 focus:outline-none"
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
                className="bg-slate-50 border border-slate-200 rounded-lg py-1 px-2 text-xs font-medium text-slate-800 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="TRIAL">Trial</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchClients}
              className="p-2 text-slate-500 hover:text-slate-700 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>

            <button className="px-3 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors">
              <Plus className="w-4 h-4" /> Provision New Client
            </button>
          </div>
        </div>

        {/* Client Directory Table */}
        {loading ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400 text-sm">
            Loading client directory...
          </div>
        ) : (
          <ClientTable
            clients={filteredClients}
            onSelectClient={(client) => setSelectedClient(client)}
            onUpdateStatus={handleUpdateStatus}
          />
        )}
      </main>

      {/* Detail Drawer */}
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
