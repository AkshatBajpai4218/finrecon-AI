import React, { useState, useEffect } from 'react';
import FileUpload from '../components/FileUpload';
import StatsCards from '../components/StatsCards';
import ReconciliationChart from '../components/ReconciliationChart';
import ExceptionTable from '../components/ExceptionTable';
import { PrioritySummaryBadges } from '../components/PriorityBadges';
import { getReconciliation, getExceptions } from '../lib/api';

export default function DashboardPage() {
  const [activeBatchId, setActiveBatchId] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    matched: 0,
    exceptions: 0,
    matchRate: '0.0',
    highPriorityCount: 0,
    chart: [],
  });
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load existing / latest batch reconciliation data on mount
  useEffect(() => {
    async function loadLatestData() {
      try {
        setLoading(true);
        const reconData = await getReconciliation();
        if (reconData && reconData.batchId) {
          setActiveBatchId(reconData.batchId);
          setStats({
            total: reconData.total ?? 0,
            matched: reconData.matched ?? 0,
            exceptions: reconData.exceptions ?? 0,
            matchRate: reconData.matchRate ?? '0.0',
            highPriorityCount: reconData.highPriorityCount ?? 0,
            chart: reconData.chart || [],
          });

          const exData = await getExceptions(reconData.batchId);
          setExceptions(exData.exceptions || []);
        } else {
          // Fallback to general exceptions if any exist
          const exData = await getExceptions();
          if (exData.exceptions?.length > 0) {
            setExceptions(exData.exceptions);
          }
        }
      } catch (err) {
        console.warn('Reconciliation data fetch:', err.message);
      } finally {
        setLoading(false);
      }
    }

    loadLatestData();
  }, []);

  // Callback triggered after successful file upload and reconciliation
  const handleReconciled = async (batchId, reconcileResponse) => {
    setActiveBatchId(batchId);
    setStats({
      total: reconcileResponse.total ?? 0,
      matched: reconcileResponse.matched ?? 0,
      exceptions: reconcileResponse.exceptions ?? 0,
      matchRate: reconcileResponse.matchRate ?? '0.0',
      highPriorityCount: reconcileResponse.highPriorityCount ?? 0,
      chart: reconcileResponse.chart || [],
    });

    try {
      const exData = await getExceptions(batchId);
      setExceptions(exData.exceptions || []);
    } catch (err) {
      console.error('Failed to load exceptions for batch:', err);
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-5 gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-white tracking-tight">
              Reconciliation Dashboard
            </h1>
            <span className="px-3 py-0.5 rounded-full text-[11px] font-bold bg-cyan-950/80 text-cyan-400 border border-cyan-800/80 uppercase tracking-widest font-mono">
              Live Controller
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Autonomous 3-way multi-system matching across Gateway, Bank, and Orders data.
          </p>
        </div>

        {activeBatchId ? (
          <div className="text-left sm:text-right bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 block uppercase tracking-wider font-semibold">
              Active Batch ID
            </span>
            <span className="text-xs font-mono font-black text-cyan-400">
              {activeBatchId}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-500 font-mono italic">
            Demo Batch Ready
          </span>
        )}
      </div>

      {/* 1. File Upload Form */}
      <FileUpload onReconciled={handleReconciled} />

      {loading ? (
        <div className="py-20 text-center bg-slate-900/60 rounded-2xl border border-slate-800 backdrop-blur-md">
          <div className="animate-spin h-8 w-8 border-3 border-cyan-400 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-xs text-slate-400 font-medium">Synchronizing reconciliation ledger...</p>
        </div>
      ) : (
        <>
          {/* 2. Key Operational Metrics (5 Cards) */}
          <StatsCards stats={stats} />

          {/* 3. Horizontal Bar Chart for Exception Distribution */}
          <ReconciliationChart data={stats.chart} />

          {/* Priority Summary Overview */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <PrioritySummaryBadges exceptions={exceptions} />
            <span className="text-xs text-slate-400 font-mono">
              Automated multi-system priority triage
            </span>
          </div>

          {/* 4. Priority-Sorted Exception Table with Filters */}
          <ExceptionTable exceptions={exceptions} />
        </>
      )}
    </div>
  );
}
