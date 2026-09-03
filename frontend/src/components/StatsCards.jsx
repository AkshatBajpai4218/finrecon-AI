import React from 'react';

export default function StatsCards({ stats = {} }) {
  const total = stats.total ?? (stats.matched ?? 0) + (stats.exceptions ?? 0);
  const matched = stats.matched ?? 0;
  const exceptions = stats.exceptions ?? 0;
  const matchRate = stats.matchRate ?? (total > 0 ? ((matched / total) * 100).toFixed(1) : '0.0');
  const highPriority = stats.highPriorityCount ?? 0;

  const cards = [
    {
      title: 'Total Ingested',
      value: total.toLocaleString(),
      subtitle: 'Across Gateway, Bank, Orders',
      badge: 'Batch Scope',
      badgeClass: 'bg-slate-800 text-slate-300 border border-slate-700',
      borderGlow: 'border-l-4 border-l-slate-400',
      valueClass: 'text-white',
    },
    {
      title: 'Matched Settlements',
      value: matched.toLocaleString(),
      subtitle: '100% verified within SLA',
      badge: 'Reconciled',
      badgeClass: 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/80',
      borderGlow: 'border-l-4 border-l-emerald-500',
      valueClass: 'text-emerald-400',
    },
    {
      title: 'Discrepancies',
      value: exceptions.toLocaleString(),
      subtitle: 'Flagged for review',
      badge: 'Breaks',
      badgeClass: 'bg-amber-950/60 text-amber-400 border border-amber-800/80',
      borderGlow: 'border-l-4 border-l-amber-500',
      valueClass: 'text-amber-400',
    },
    {
      title: 'Auto Match Rate',
      value: `${matchRate}%`,
      subtitle: 'Algorithmic accuracy',
      badge: Number(matchRate) >= 80 ? 'Optimal' : 'Needs Review',
      badgeClass: Number(matchRate) >= 80 ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-800/80' : 'bg-rose-950/60 text-rose-400 border border-rose-800/80',
      borderGlow: 'border-l-4 border-l-cyan-500',
      valueClass: 'text-cyan-400',
    },
    {
      title: 'High / Critical Risk',
      value: highPriority.toLocaleString(),
      subtitle: 'Immediate resolution priority',
      badge: highPriority > 0 ? 'Urgent' : 'Clear',
      badgeClass: highPriority > 0 ? 'bg-rose-950/60 text-rose-300 border border-rose-800/80' : 'bg-slate-800 text-slate-400 border border-slate-700',
      borderGlow: 'border-l-4 border-l-rose-500',
      valueClass: highPriority > 0 ? 'text-rose-400' : 'text-slate-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className={`bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-700 ${card.borderGlow}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              {card.title}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${card.badgeClass}`}>
              {card.badge}
            </span>
          </div>
          <div className={`text-2xl font-black tracking-tight ${card.valueClass}`}>
            {card.value}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            {card.subtitle}
          </p>
        </div>
      ))}
    </div>
  );
}
