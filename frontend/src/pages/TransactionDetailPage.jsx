import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getTransactionById } from '../lib/api';
import PriorityBadges from '../components/PriorityBadges';

export default function TransactionDetailPage() {
  const { txnId, id } = useParams();
  const activeId = txnId || id;
  const navigate = useNavigate();

  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDetails() {
      if (!activeId) return;
      try {
        setLoading(true);
        setError(null);
        const data = await getTransactionById(activeId);
        setTransaction(data);
      } catch (err) {
        console.error('Failed to load transaction detail:', err);
        setError(err.response?.data?.error || err.message || 'Transaction not found.');
      } finally {
        setLoading(false);
      }
    }

    fetchDetails();
  }, [activeId]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <div className="animate-spin h-8 w-8 border-4 border-cyan-400 border-t-transparent rounded-full mb-3"></div>
        <p className="text-xs font-semibold">Retrieving multi-source forensics...</p>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="py-20 text-center bg-slate-900/60 rounded-2xl border border-slate-800 p-8 max-w-lg mx-auto">
        <div className="inline-block p-4 rounded-full bg-rose-950/60 border border-rose-800 text-rose-400 mb-3 text-2xl">⚠️</div>
        <h2 className="text-lg font-bold text-white">Transaction Record Not Found</h2>
        <p className="text-xs text-slate-400 mt-1 mb-6">{error || `Unable to locate ID: ${activeId}`}</p>
        <button
          onClick={() => navigate(-1)}
          className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors"
        >
          ← Return to Previous Screen
        </button>
      </div>
    );
  }

  const hasPayment = transaction.paymentAmount !== null && transaction.paymentAmount !== undefined;
  const hasBank = transaction.bankAmount !== null && transaction.bankAmount !== undefined;
  const hasOrder = transaction.orderAmount !== null && transaction.orderAmount !== undefined;

  const confPercent = Math.round((transaction.confidence || 0.9) * 100);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <Link
          to="/dashboard"
          className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors"
        >
          ← Back to Reconciliation Dashboard
        </Link>
        <span className="text-[11px] text-slate-400 font-mono">
          System ObjectId: {transaction._id}
        </span>
      </div>

      {/* Main Header Banner */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
              {transaction.txnRef}
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-slate-800 text-cyan-300 border border-slate-700">
              {transaction.status.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1.5 font-mono">
            Recorded timestamp: {transaction.createdAt ? new Date(transaction.createdAt).toLocaleString() : 'N/A'}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-left sm:text-right">
            <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider font-mono">Priority Tier</span>
            <PriorityBadges priority={transaction.priority} />
          </div>
        </div>
      </div>

      {/* 3 Side-by-Side Source Cards: PAYMENT / BANK / ORDER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Payment Gateway Card */}
        <div className={`rounded-2xl border p-5 shadow-xl transition-all ${
          hasPayment
            ? 'bg-slate-900/90 border-slate-800 hover:border-cyan-500/60'
            : 'bg-rose-950/20 border-rose-900/40'
        }`}>
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400"></span>
              Payment Gateway
            </span>
            {hasPayment ? (
              <span className="w-6 h-6 rounded-full bg-emerald-950/80 border border-emerald-700 text-emerald-400 flex items-center justify-center text-xs font-bold">
                ✓
              </span>
            ) : (
              <span className="w-6 h-6 rounded-full bg-rose-950/80 border border-rose-700 text-rose-400 flex items-center justify-center text-xs font-bold">
                ✕
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Settled Value</span>
              <div className="text-xl font-black text-white">
                {hasPayment ? `₹${Number(transaction.paymentAmount).toLocaleString('en-IN')}` : <span className="text-rose-400 text-sm font-semibold">Missing Entry</span>}
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Timestamp</span>
              <span className="text-xs font-mono text-slate-300">
                {transaction.paymentTime ? new Date(transaction.paymentTime).toLocaleString() : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Bank Statement Card */}
        <div className={`rounded-2xl border p-5 shadow-xl transition-all ${
          hasBank
            ? 'bg-slate-900/90 border-slate-800 hover:border-indigo-500/60'
            : 'bg-rose-950/20 border-rose-900/40'
        }`}>
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-sm shadow-indigo-400"></span>
              Bank Statement
            </span>
            {hasBank ? (
              <span className="w-6 h-6 rounded-full bg-emerald-950/80 border border-emerald-700 text-emerald-400 flex items-center justify-center text-xs font-bold">
                ✓
              </span>
            ) : (
              <span className="w-6 h-6 rounded-full bg-rose-950/80 border border-rose-700 text-rose-400 flex items-center justify-center text-xs font-bold">
                ✕
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Bank Credit</span>
              <div className="text-xl font-black text-white">
                {hasBank ? `₹${Number(transaction.bankAmount).toLocaleString('en-IN')}` : <span className="text-rose-400 text-sm font-semibold">Missing Entry</span>}
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Value Date</span>
              <span className="text-xs font-mono text-slate-300">
                {transaction.bankTime ? new Date(transaction.bankTime).toLocaleString() : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Orders Database Card */}
        <div className={`rounded-2xl border p-5 shadow-xl transition-all ${
          hasOrder
            ? 'bg-slate-900/90 border-slate-800 hover:border-purple-500/60'
            : 'bg-rose-950/20 border-rose-900/40'
        }`}>
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400 shadow-sm shadow-purple-400"></span>
              Orders Database
            </span>
            {hasOrder ? (
              <span className="w-6 h-6 rounded-full bg-emerald-950/80 border border-emerald-700 text-emerald-400 flex items-center justify-center text-xs font-bold">
                ✓
              </span>
            ) : (
              <span className="w-6 h-6 rounded-full bg-rose-950/80 border border-rose-700 text-rose-400 flex items-center justify-center text-xs font-bold">
                ✕
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Order Amount</span>
              <div className="text-xl font-black text-white">
                {hasOrder ? `₹${Number(transaction.orderAmount).toLocaleString('en-IN')}` : <span className="text-rose-400 text-sm font-semibold">Missing Entry</span>}
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Created Timestamp</span>
              <span className="text-xs font-mono text-slate-300">
                {transaction.orderTime ? new Date(transaction.orderTime).toLocaleString() : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* AI ANALYSIS Panel */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white rounded-2xl p-6 shadow-2xl border border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-base font-bold shadow-inner">
              ✨
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight">AI Exception Diagnostics</h2>
              <p className="text-[11px] text-slate-400 font-mono">Autonomous Root Cause Analysis via 120B AI Controller</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-mono">Confidence:</span>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-950/80 text-cyan-400 border border-cyan-800/80">
              {confPercent}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Root Cause Explanation */}
          <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300 mb-2 flex items-center gap-2 font-mono">
              <span>🔍</span> Root Cause Explanation
            </h3>
            <p className="text-xs leading-relaxed text-slate-300 font-medium">
              {transaction.explanation || (
                <span className="text-slate-500 italic">
                  AI analysis unavailable — please review manually.
                </span>
              )}
            </p>
          </div>

          {/* Recommended Action */}
          <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-2 font-mono">
              <span>⚡</span> Recommended Action
            </h3>
            <p className="text-xs leading-relaxed text-slate-200 font-bold">
              {transaction.recommendedAction || 'Manual review required.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
