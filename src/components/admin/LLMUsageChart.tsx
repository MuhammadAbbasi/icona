'use client';

import React from 'react';

export function LLMUsageChart() {
  const days = [
    { day: 'Mon', prompt: 420, completion: 110 },
    { day: 'Tue', prompt: 580, completion: 150 },
    { day: 'Wed', prompt: 610, completion: 180 },
    { day: 'Thu', prompt: 790, completion: 210 },
    { day: 'Fri', prompt: 840, completion: 240 },
    { day: 'Sat', prompt: 390, completion: 95 },
    { day: 'Sun', prompt: 290, completion: 80 },
  ];

  const maxVal = 1100;

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#0F172A]">Weekly Token Consumption (K Tokens)</h3>
          <p className="text-xs text-slate-500">Prompt vs Completion Tokens for the last 7 days</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-blue-600">
            <span className="w-3 h-3 rounded-xs bg-[#2563EB]" /> Prompt Tokens
          </span>
          <span className="flex items-center gap-1.5 text-sky-500">
            <span className="w-3 h-3 rounded-xs bg-sky-400" /> Completion Tokens
          </span>
        </div>
      </div>

      {/* SVG Bar Chart */}
      <div className="h-44 w-full flex items-end justify-between gap-3 pt-6 pb-2 border-b border-slate-100">
        {days.map((item) => {
          const promptHeight = (item.prompt / maxVal) * 100;
          const compHeight = (item.completion / maxVal) * 100;

          return (
            <div key={item.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
              <div className="w-full max-w-[36px] flex flex-col gap-0.5 items-center">
                {/* Completion Bar */}
                <div
                  className="w-full bg-sky-400 rounded-t transition-all group-hover:bg-sky-500"
                  style={{ height: `${compHeight}%` }}
                  title={`${item.day} Completion: ${item.completion}k`}
                />
                {/* Prompt Bar */}
                <div
                  className="w-full bg-[#2563EB] rounded-b transition-all group-hover:bg-blue-700"
                  style={{ height: `${promptHeight}%` }}
                  title={`${item.day} Prompt: ${item.prompt}k`}
                />
              </div>
              <span className="text-[11px] font-semibold text-slate-500">{item.day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
