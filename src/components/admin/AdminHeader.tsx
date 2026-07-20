'use client';

import React from 'react';
import { Search, Bell, ShieldCheck, Plus, RefreshCw } from 'lucide-react';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
}

export function AdminHeader({ title, subtitle }: AdminHeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20 shadow-sm">
      {/* Title & Section Context */}
      <div>
        <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Universal Search */}
        <div className="relative w-64 md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search clients, projects, emails..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] text-slate-800 placeholder-slate-400"
          />
        </div>

        {/* Quick Refresh */}
        <button
          onClick={() => window.location.reload()}
          className="p-2 text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
          title="Refresh Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Notification indicator */}
        <div className="relative">
          <button className="p-2 text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors">
            <Bell className="w-4 h-4" />
          </button>
          <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1.5 right-1.5 ring-2 ring-white" />
        </div>

        {/* Admin Badge */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-[#1A365D] text-white flex items-center justify-center font-bold text-xs shadow-sm">
            SA
          </div>
          <div className="hidden lg:block text-left">
            <span className="block text-xs font-semibold text-[#0F172A] leading-tight">System Administrator</span>
            <span className="text-[10px] font-medium text-blue-600 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Full Access
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
