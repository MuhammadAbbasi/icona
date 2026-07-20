'use client';

import React from 'react';

interface FeatureFlagToggleProps {
  flagKey: string;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (key: string, newValue: boolean) => void;
}

export function FeatureFlagToggle({ flagKey, title, description, enabled, onToggle }: FeatureFlagToggleProps) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
      <div>
        <h4 className="font-bold text-slate-900 text-sm">{title}</h4>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        <span className="inline-block mt-2 font-mono text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
          key: {flagKey}
        </span>
      </div>

      <button
        onClick={() => onToggle(flagKey, !enabled)}
        className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
          enabled ? 'bg-[#2563EB] justify-end' : 'bg-slate-300 justify-start'
        }`}
      >
        <span className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform" />
      </button>
    </div>
  );
}
