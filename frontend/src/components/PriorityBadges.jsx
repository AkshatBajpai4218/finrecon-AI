import React from 'react';

/**
 * Single Priority Badge
 */
export default function PriorityBadges({ priority }) {
  const p = String(priority || 'low').toLowerCase();

  const styles = {
    critical: 'bg-rose-500/15 text-rose-400 border-rose-500/30 shadow-rose-950/40',
    high: 'bg-orange-500/15 text-orange-400 border-orange-500/30 shadow-orange-950/40',
    medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30 shadow-amber-950/40',
    low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-emerald-950/40',
  };

  const badgeStyle = styles[p] || 'bg-slate-800 text-slate-300 border-slate-700';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm ${badgeStyle}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse ${
          p === 'critical'
            ? 'bg-rose-400 shadow-sm shadow-rose-400'
            : p === 'high'
            ? 'bg-orange-400 shadow-sm shadow-orange-400'
            : p === 'medium'
            ? 'bg-amber-400 shadow-sm shadow-amber-400'
            : 'bg-emerald-400 shadow-sm shadow-emerald-400'
        }`}
      ></span>
      {p}
    </span>
  );
}

/**
 * Priority Count Pill Overview for Dashboard
 */
export function PrioritySummaryBadges({ exceptions = [] }) {
  const counts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  exceptions.forEach((item) => {
    const p = String(item.priority || 'low').toLowerCase();
    if (counts[p] !== undefined) {
      counts[p]++;
    }
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 font-mono">
        Risk Exposure:
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-rose-950/40 text-rose-300 border border-rose-800/80 shadow-md">
          <span className="w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500"></span>
          Critical: {counts.critical}
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-orange-950/40 text-orange-300 border border-orange-800/80 shadow-md">
          <span className="w-2 h-2 rounded-full bg-orange-500 shadow-sm shadow-orange-500"></span>
          High: {counts.high}
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-950/40 text-amber-300 border border-amber-800/80 shadow-md">
          <span className="w-2 h-2 rounded-full bg-amber-500 shadow-sm shadow-amber-500"></span>
          Medium: {counts.medium}
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-950/40 text-emerald-300 border border-emerald-800/80 shadow-md">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500"></span>
          Low: {counts.low}
        </span>
      </div>
    </div>
  );
}
