import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PriorityBadges from './PriorityBadges';

const priorityWeight = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function formatStatus(status) {
  switch (status) {
    case 'amount_mismatch':
    case 'mismatch':
      return { label: 'Amount Mismatch', badge: 'bg-amber-950/50 text-amber-400 border-amber-800/80' };
    case 'missing_settlement':
      return { label: 'Missing Settlement', badge: 'bg-rose-950/50 text-rose-400 border-rose-800/80' };
    case 'unknown_credit':
      return { label: 'Unknown Credit', badge: 'bg-purple-950/50 text-purple-400 border-purple-800/80' };
    case 'settlement_delay':
    case 'delay':
      return { label: 'Settlement Delay', badge: 'bg-orange-950/50 text-orange-400 border-orange-800/80' };
    case 'duplicate':
      return { label: 'Duplicate', badge: 'bg-pink-950/50 text-pink-400 border-pink-800/80' };
    case 'likely_match':
      return { label: 'Likely Match', badge: 'bg-cyan-950/50 text-cyan-400 border-cyan-800/80' };
    case 'matched':
      return { label: 'Matched', badge: 'bg-emerald-950/50 text-emerald-400 border-emerald-800/80' };
    default:
      return { label: status, badge: 'bg-slate-800 text-slate-300 border-slate-700' };
  }
}

export default function ExceptionTable({ exceptions = [] }) {
  const navigate = useNavigate();
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' (critical first) or 'asc' (low first)
  const [filterType, setFilterType] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const filteredAndSorted = useMemo(() => {
    let list = [...exceptions];

    // Priority filter
    if (priorityFilter !== 'all') {
      list = list.filter((item) => String(item.priority).toLowerCase() === priorityFilter);
    }

    // Status category filter
    if (filterType !== 'all') {
      list = list.filter((item) => {
        if (filterType === 'mismatch') return item.status === 'amount_mismatch' || item.status === 'mismatch';
        if (filterType === 'delay') return item.status === 'settlement_delay' || item.status === 'delay';
        return item.status === filterType;
      });
    }

    // Sort by priority weight
    list.sort((a, b) => {
      const weightA = priorityWeight[String(a.priority).toLowerCase()] || 0;
      const weightB = priorityWeight[String(b.priority).toLowerCase()] || 0;

      if (weightA !== weightB) {
        return sortOrder === 'desc' ? weightB - weightA : weightA - weightB;
      }

      // Tiebreaker: highest amount
      const amtA = Math.max(a.paymentAmount || 0, a.bankAmount || 0, a.orderAmount || 0);
      const amtB = Math.max(b.paymentAmount || 0, b.bankAmount || 0, b.orderAmount || 0);
      return amtB - amtA;
    });

    return list;
  }, [exceptions, sortOrder, filterType, priorityFilter]);

  const toggleSort = () => {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  };

  const handleRowClick = (item) => {
    const id = item._id || item.txnRef;
    navigate(`/exceptions/${id}`);
  };

  const priorityTabs = [
    { id: 'all', label: 'All Priorities', color: 'bg-cyan-500 text-slate-950' },
    { id: 'critical', label: 'Critical', color: 'bg-rose-600 text-white' },
    { id: 'high', label: 'High', color: 'bg-orange-600 text-white' },
    { id: 'medium', label: 'Medium', color: 'bg-amber-600 text-white' },
    { id: 'low', label: 'Low', color: 'bg-emerald-600 text-white' },
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md">
      {/* Priority Filter Bar */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-slate-400 mr-1 uppercase tracking-wider font-mono">
            Filter Priority:
          </span>
          {priorityTabs.map((tab) => {
            const isActive = priorityFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setPriorityFilter(tab.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all duration-150 ${
                  isActive
                    ? `${tab.color} shadow-md scale-[1.02]`
                    : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Status Type Select */}
        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs border border-slate-700 rounded-xl px-3 py-1.5 bg-slate-900 text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-400"
          >
            <option value="all">All Anomaly Types ({exceptions.length})</option>
            <option value="amount_mismatch">Amount Mismatches</option>
            <option value="missing_settlement">Missing Settlements</option>
            <option value="unknown_credit">Unknown Credits</option>
            <option value="settlement_delay">Settlement Delays</option>
            <option value="duplicate">Duplicates</option>
            <option value="likely_match">Likely Matches (Fuzzy)</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-950/90 border-b border-slate-800 text-slate-400 font-mono font-bold uppercase tracking-wider text-[11px]">
              <th className="py-3.5 px-4">Transaction ID</th>
              <th className="py-3.5 px-4">Exposure Amount</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Confidence</th>
              <th
                className="py-3.5 px-4 cursor-pointer select-none hover:bg-slate-800/60 transition-colors"
                onClick={toggleSort}
                title="Click to toggle priority sorting"
              >
                <div className="flex items-center gap-1.5">
                  <span>Priority</span>
                  <span className="text-cyan-400 font-mono text-[10px]">
                    {sortOrder === 'desc' ? '▼ (High)' : '▲ (Low)'}
                  </span>
                </div>
              </th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-12 text-center text-slate-400">
                  <span className="block text-sm font-semibold text-slate-300">No breaks match the selected filter</span>
                  <span className="text-xs text-slate-500 mt-1 block">
                    Change priority or category filters above.
                  </span>
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((item) => {
                const statusInfo = formatStatus(item.status);
                const maxAmt = Math.max(
                  item.paymentAmount || 0,
                  item.bankAmount || 0,
                  item.orderAmount || 0
                );
                const confPercent = Math.round((item.confidence || 0.9) * 100);

                return (
                  <tr
                    key={item._id || item.txnRef}
                    onClick={() => handleRowClick(item)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-100 group-hover:text-cyan-400 transition-colors">
                      {item.txnRef || item._id}
                    </td>
                    <td className="py-3.5 px-4 font-black text-white">
                      ₹{maxAmt.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider border ${statusInfo.badge}`}
                      >
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-1.5 rounded-full"
                            style={{ width: `${confPercent}%` }}
                          ></div>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {confPercent}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <PriorityBadges priority={item.priority} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-cyan-400 font-bold text-xs group-hover:underline flex items-center justify-end gap-1">
                        Review AI →
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {filteredAndSorted.length > 0 && (
        <div className="p-3 bg-slate-950/60 border-t border-slate-800 text-[11px] text-slate-400 text-right px-4 font-mono">
          Displaying {filteredAndSorted.length} of {exceptions.length} exception records
        </div>
      )}
    </div>
  );
}
