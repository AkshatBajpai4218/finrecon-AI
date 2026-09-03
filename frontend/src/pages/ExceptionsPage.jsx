import React, { useEffect, useState } from 'react';
import { getReconciliation, getExceptions } from '../lib/api';
import ExceptionTable from '../components/ExceptionTable';
import { PrioritySummaryBadges } from '../components/PriorityBadges';

export default function ExceptionsPage() {
  const [exceptions, setExceptions] = useState([]);
  const [batchId, setBatchId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        // 1. Fetch latest batch summary
        const reconRes = await getReconciliation();
        const activeId = reconRes.batchId;
        setBatchId(activeId);

        if (activeId) {
          const exRes = await getExceptions(activeId);
          setExceptions(exRes.exceptions || []);
        } else {
          const exRes = await getExceptions();
          setExceptions(exRes.exceptions || []);
        }
      } catch (err) {
        console.warn('Failed to load exceptions:', err);
        setError(err.response?.data?.error || err.message || 'Unable to load exceptions.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Exception Management & Risk Triage
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Prioritized discrepancy register, AI-diagnosed breaks, and merchant resolution queue.
          </p>
        </div>

        {batchId && (
          <span className="text-xs font-mono font-bold text-cyan-400 bg-slate-900 px-3.5 py-1.5 rounded-xl border border-slate-800 self-start sm:self-auto">
            Batch: {batchId}
          </span>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-24 bg-slate-900/60 rounded-2xl border border-slate-800 text-center backdrop-blur-md">
          <div className="animate-spin h-8 w-8 border-3 border-cyan-400 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-xs font-semibold text-slate-300">Retrieving exceptions from database...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-4 bg-rose-950/40 border border-rose-800 rounded-2xl text-xs text-rose-300 font-medium">
          {error}
        </div>
      )}

      {/* Loaded Content */}
      {!loading && !error && (
        <>
          {exceptions.length === 0 ? (
            /* Empty State */
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-12 text-center shadow-2xl space-y-3 backdrop-blur-md">
              <div className="w-12 h-12 bg-emerald-950/80 border border-emerald-700 text-emerald-400 rounded-full flex items-center justify-center text-xl font-bold mx-auto">
                ✓
              </div>
              <h2 className="text-lg font-bold text-white">Zero Financial Breaks</h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                All transactions across payment gateway, bank statements, and orders have been perfectly reconciled within SLA.
              </p>
            </div>
          ) : (
            <>
              {/* Priority Count Exposure Bar */}
              <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 backdrop-blur-md">
                <PrioritySummaryBadges exceptions={exceptions} />
                <span className="text-xs text-slate-400 font-mono">
                  {exceptions.length} breaks awaiting action
                </span>
              </div>

              {/* Exception Table with Quick Filters */}
              <ExceptionTable exceptions={exceptions} />
            </>
          )}
        </>
      )}
    </div>
  );
}
