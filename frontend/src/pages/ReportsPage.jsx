import React, { useState, useEffect } from 'react';
import api from '../lib/api';

export default function ReportsPage() {
  const [batchId, setBatchId] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [error, setError] = useState(null);

  // Load latest batch summary on mount
  useEffect(() => {
    async function loadLatest() {
      try {
        const res = await api.get('/reconcile');
        if (res.data?.batchId) {
          setBatchId(res.data.batchId);
          fetchAuditTrail(res.data.batchId);
        }
      } catch (err) {
        console.warn('Could not load latest batch:', err.message);
      }
    }
    loadLatest();
  }, []);

  const handleGenerateSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = batchId ? `/reports/${batchId}` : '/reports';
      const res = await api.get(url);
      setReportData(res.data);
      if (res.data?.stats?.batchId) {
        setBatchId(res.data.stats.batchId);
        fetchAuditTrail(res.data.stats.batchId);
      }
    } catch (err) {
      console.error('Failed to generate summary:', err);
      setError(err.response?.data?.error || err.message || 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditTrail = async (id) => {
    try {
      setLoadingAudit(true);
      const res = await api.get(`/reports/${id}/audit`);
      setAuditLogs(res.data.auditLogs || []);
    } catch (err) {
      console.warn('Failed to load audit logs:', err.message);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleDownload = (format) => {
    const id = batchId || reportData?.stats?.batchId;
    if (!id) {
      alert('Please generate or select a reconciliation batch first.');
      return;
    }
    const downloadUrl = `http://localhost:4000/api/reports/${id}?format=${format}`;
    window.open(downloadUrl, '_blank');
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Financial Audit & Executive Reporting
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Autonomous multi-agent narrative synthesis, verifiable audit trails, and PDF/CSV compliance exports.
          </p>
        </div>

        <button
          onClick={handleGenerateSummary}
          disabled={loading}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 ${loading
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-500/20 active:scale-[0.98]'
            }`}
        >
          {loading ? (
            <>
              <span className="animate-spin h-3.5 w-3.5 border-2 border-slate-950 border-t-transparent rounded-full"></span>
              Synthesizing Report...
            </>
          ) : (
            <>
              <span>✨</span>
              Generate Finance Summary
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800 rounded-xl text-rose-300 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Generated Report Narrative & Metrics */}
      {reportData && (
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-2xl p-6 space-y-6 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 font-mono">
                Batch: {reportData.stats?.batchId}
              </span>
              <h2 className="text-lg font-black text-white">
                Daily Reconciliation Summary
              </h2>
            </div>

            {/* Download Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDownload('pdf')}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-900/40 flex items-center gap-2"
              >
                <span>📄</span> Download PDF
              </button>
              <button
                onClick={() => handleDownload('csv')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-900/40 flex items-center gap-2"
              >
                <span>📊</span> Export CSV
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block font-mono">Total Volume</span>
              <span className="text-xl font-black text-white">{reportData.stats?.total} txns</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block font-mono">Match Rate</span>
              <span className="text-xl font-black text-emerald-400">{reportData.stats?.matchRate}%</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block font-mono">Financial Exposure</span>
              <span className="text-xl font-black text-rose-400">₹{Number(reportData.stats?.totalExposure || 0).toLocaleString('en-IN')}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block font-mono">Breaks Flagged</span>
              <span className="text-xl font-black text-amber-400">{reportData.stats?.exceptions}</span>
            </div>
          </div>

          {/* Executive Narrative */}
          <div className="bg-slate-950/80 text-white p-5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 font-mono">
                AI Controller Synthesis (Groq 120B)
              </span>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed text-slate-200 font-medium">
              "{reportData.narrative}"
            </p>
          </div>
        </div>
      )}

      {/* Audit Trail Section */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-2xl p-6 space-y-4 backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-black text-white">
              Chronological Audit Trail
            </h3>
            <p className="text-[11px] text-slate-400">
              Immutable ledger of data uploads, agent actions, and report exports.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-cyan-400 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
            {auditLogs.length} Events Logged
          </span>
        </div>

        {loadingAudit ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Loading audit records...
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No audit logs recorded for this batch yet.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {auditLogs.map((log, idx) => (
              <div
                key={log._id || idx}
                className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0 shadow-sm shadow-cyan-400"></span>
                  <div>
                    <span className="text-xs font-bold font-mono text-slate-100 block">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      By: <strong className="text-slate-300">{log.performedBy}</strong>
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-400 block">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <span className="text-[9px] font-mono text-slate-400">
                      {JSON.stringify(log.details).slice(0, 50)}...
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
