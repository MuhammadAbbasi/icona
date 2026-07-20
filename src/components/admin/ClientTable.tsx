'use client';

import React from 'react';
import { Building2, Mail, Phone, ExternalLink, ShieldAlert, CheckCircle2, Clock, MoreHorizontal } from 'lucide-react';

export interface ClientData {
  id: string;
  name: string;
  slug: string;
  status: string;
  billingStatus: string;
  planTier: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  projectsCount: number;
  projectsMax: number | string;
  usersCount: number;
  usersMax: number | string;
  monthlyQueries: number;
  createdAt: string;
}

interface ClientTableProps {
  clients: ClientData[];
  onSelectClient: (client: ClientData) => void;
  onUpdateStatus: (clientId: string, newStatus: string) => void;
}

export function ClientTable({ clients, onSelectClient, onUpdateStatus }: ClientTableProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
            <tr>
              <th className="py-3 px-4">Construction Firm / Client</th>
              <th className="py-3 px-4">Owner & Contact</th>
              <th className="py-3 px-4">Plan & Status</th>
              <th className="py-3 px-4">Projects Built</th>
              <th className="py-3 px-4">Users Defined</th>
              <th className="py-3 px-4">LLM Queries</th>
              <th className="py-3 px-4">Signup Date</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[#0F172A]">
            {clients.map((client) => {
              const isTrial = client.billingStatus === 'TRIAL';
              const isSuspended = client.status === 'SUSPENDED';

              return (
                <tr key={client.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Firm Name */}
                  <td className="py-3.5 px-4 font-semibold">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold text-xs">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-semibold text-[#0F172A]">{client.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">slug: {client.slug}</span>
                      </div>
                    </div>
                  </td>

                  {/* Owner Contact */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-0.5">
                      <span className="block font-medium text-slate-800">{client.ownerName}</span>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{client.ownerEmail}</span>
                      </div>
                    </div>
                  </td>

                  {/* Plan & Status */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col items-start gap-1">
                      <span className="capitalize font-semibold text-xs px-2 py-0.5 rounded bg-blue-50 text-[#2563EB] border border-blue-100">
                        {client.planTier}
                      </span>
                      {isSuspended ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600">
                          <ShieldAlert className="w-3 h-3" /> Suspended
                        </span>
                      ) : isTrial ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600">
                          <Clock className="w-3 h-3" /> Trial Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Projects Built vs Limit */}
                  <td className="py-3.5 px-4 font-medium">
                    <div className="space-y-1">
                      <span className="text-slate-900 font-semibold">
                        {client.projectsCount} / {client.projectsMax}
                      </span>
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#2563EB]"
                          style={{
                            width:
                              typeof client.projectsMax === 'number'
                                ? `${Math.min(100, (client.projectsCount / client.projectsMax) * 100)}%`
                                : '30%',
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Users Defined vs Limit */}
                  <td className="py-3.5 px-4 font-medium">
                    <div className="space-y-1">
                      <span className="text-slate-900 font-semibold">
                        {client.usersCount} / {client.usersMax}
                      </span>
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-500"
                          style={{
                            width:
                              typeof client.usersMax === 'number'
                                ? `${Math.min(100, (client.usersCount / client.usersMax) * 100)}%`
                                : '25%',
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Monthly LLM Queries */}
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-slate-800">{client.monthlyQueries}</span>
                    <span className="text-[10px] text-slate-400 block">queries / mo</span>
                  </td>

                  {/* Signup Date */}
                  <td className="py-3.5 px-4 text-slate-500">
                    {new Date(client.createdAt).toLocaleDateString()}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onSelectClient(client)}
                      className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-[#2563EB] hover:text-white text-slate-700 rounded-lg transition-colors inline-flex items-center gap-1"
                    >
                      <span>Manage</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
