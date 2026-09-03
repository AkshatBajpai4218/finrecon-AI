import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from 'recharts';

const TYPE_COLORS = {
  amount_mismatch: '#f59e0b', // amber
  missing_settlement: '#ef4444', // red
  unknown_credit: '#8b5cf6', // purple
  settlement_delay: '#f97316', // orange (delay=orange per Prompt 4.3)
  duplicate: '#ec4899', // pink
};

const DEFAULT_TYPES = [
  { type: 'amount_mismatch', label: 'Amount Mismatch', count: 0 },
  { type: 'missing_settlement', label: 'Missing Settlement', count: 0 },
  { type: 'unknown_credit', label: 'Unknown Credit', count: 0 },
  { type: 'settlement_delay', label: 'Settlement Delay', count: 0 },
  { type: 'duplicate', label: 'Duplicate', count: 0 },
];

export default function ReconciliationChart({ data = [] }) {
  // Ensure all 5 standard types appear in the chart
  const chartData = DEFAULT_TYPES.map((def) => {
    const existing = data.find(
      (d) =>
        d.type === def.type ||
        (def.type === 'amount_mismatch' && d.type === 'mismatch') ||
        (def.type === 'settlement_delay' && d.type === 'delay')
    );
    return {
      type: def.type,
      label: def.label,
      count: existing ? existing.count : 0,
    };
  });

  const totalExceptions = chartData.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 mb-4 gap-2">
        <div>
          <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
            <span className="p-1 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs">
              📊
            </span>
            Discrepancy Distribution by Category
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated multi-system breakdown across active reconciliation batch
          </p>
        </div>
        <span className="text-xs font-bold font-mono px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-cyan-400 self-start sm:self-auto">
          {totalExceptions} Breaks Flagged
        </span>
      </div>

      <div className="h-64 w-full">
        {totalExceptions === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
            <span className="text-sm font-semibold text-slate-300">✓ No discrepancies detected</span>
            <span className="text-xs mt-1 text-slate-500">All transactions are fully matched across sources</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={{ stroke: '#334155' }}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={140}
                tick={{ fill: '#e2e8f0', fontSize: 12, fontWeight: 600 }}
                axisLine={{ stroke: '#334155' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-950 text-white text-xs rounded-xl p-3 shadow-2xl border border-slate-700 backdrop-blur-md">
                        <p className="font-bold text-slate-100">{d.label}</p>
                        <p className="text-cyan-400 font-mono font-bold mt-1">
                          Count: {d.count} transaction{d.count === 1 ? '' : 's'}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {chartData.map((entry) => (
                  <Cell key={`cell-${entry.type}`} fill={TYPE_COLORS[entry.type] || '#0ea5e9'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
