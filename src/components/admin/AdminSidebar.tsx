'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Cpu,
  CreditCard,
  ShieldAlert,
  ToggleRight,
  Settings,
  Sparkles,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { signOut } from 'next-auth/react';

const NAV_ITEMS = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Clients (Tenants)', href: '/admin/clients', icon: Building2 },
  { label: 'LLM Copilot Usage', href: '/admin/llm', icon: Cpu },
  { label: 'Subscriptions & Billing', href: '/admin/billing', icon: CreditCard },
  { label: 'Security & Audit Logs', href: '/admin/security', icon: ShieldAlert },
  { label: 'Feature Flags', href: '/admin/feature-flags', icon: ToggleRight },
  { label: 'System Settings', href: '/admin/settings', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-[#1A365D] text-white flex flex-col justify-between min-h-screen border-r border-slate-700 shadow-xl">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-700/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#38BDF8] flex items-center justify-center shadow-md shadow-blue-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-white leading-none">ICONA</h1>
            <span className="text-[11px] font-medium text-sky-300 tracking-wide uppercase">Super Admin</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-600/40 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80" />}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info & Sign Out */}
      <div className="p-4 border-t border-slate-700/60 space-y-3">
        {/* LLM Status Badge */}
        <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-300 font-medium">LLM Engine</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Ollama Local
            </span>
          </div>
          <p className="text-[11px] text-slate-400 truncate">Qwen 2.5 7B Instruct</p>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/40 hover:bg-rose-950/40 hover:border-rose-800/50 border border-slate-700 rounded-lg transition-colors"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-400" />
          <span>Exit Admin Portal</span>
        </button>
      </div>
    </aside>
  );
}
