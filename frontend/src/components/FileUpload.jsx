import React, { useState } from 'react';
import { uploadFiles, reconcileBatch } from '../lib/api';
import ProcessingAnimation from './ProcessingAnimation';

export default function FileUpload({ onReconciled }) {
  const [paymentFile, setPaymentFile] = useState(null);
  const [bankFile, setBankFile] = useState(null);
  const [ordersFile, setOrdersFile] = useState(null);

  const [activeBatchId, setActiveBatchId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!paymentFile || !bankFile || !ordersFile) {
      setError('Please select all 3 files: Payment Gateway, Bank Statement, and Orders.');
      return;
    }

    try {
      setError(null);
      // Step 1: Upload files
      const uploadRes = await uploadFiles(paymentFile, bankFile, ordersFile);
      const batchId = uploadRes.batchId;
      setActiveBatchId(batchId);
      setIsProcessing(true);

      // Trigger pipeline asynchronously (polling will track it)
      reconcileBatch(batchId).then((reconcileRes) => {
        window.__latestReconcileRes = reconcileRes;
      }).catch((err) => {
        console.error('Reconciliation error:', err);
      });

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to process files.');
      setIsProcessing(false);
    }
  };

  const handleAnimationComplete = () => {
    setIsProcessing(false);
    if (onReconciled && activeBatchId) {
      onReconciled(activeBatchId, window.__latestReconcileRes || {});
    }
  };

  if (isProcessing && activeBatchId) {
    return <ProcessingAnimation batchId={activeBatchId} onComplete={handleAnimationComplete} />;
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 mb-6 gap-2">
        <div>
          <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs">
              ⚡
            </span>
            Upload Transaction Data Sources
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Provide the 3 disjoint financial records for autonomous 3-way reconciliation
          </p>
        </div>
        <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/60 px-3 py-1 rounded-full font-bold uppercase tracking-wider self-start sm:self-auto">
          CSV / PDF Supported
        </span>
      </div>

      {error && (
        <div className="mb-5 p-3.5 bg-rose-950/40 border border-rose-800/80 rounded-xl text-rose-300 text-xs font-medium flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Payment Gateway Input */}
          <div className="border border-dashed border-slate-700/80 rounded-xl p-4 bg-slate-950/40 hover:border-cyan-500/60 hover:bg-cyan-950/10 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400"></span>
                Payment Gateway
              </label>
              <span className="text-[10px] text-slate-500 uppercase font-mono">CSV</span>
            </div>
            <input
              type="file"
              accept=".csv"
              disabled={isProcessing}
              onChange={(e) => setPaymentFile(e.target.files[0] || null)}
              className="w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-cyan-300 hover:file:bg-slate-700 cursor-pointer"
            />
            {paymentFile && (
              <p className="text-[11px] text-emerald-400 mt-2 truncate font-medium flex items-center gap-1">
                <span>✓</span> {paymentFile.name}
              </p>
            )}
          </div>

          {/* Bank Statement Input */}
          <div className="border border-dashed border-slate-700/80 rounded-xl p-4 bg-slate-950/40 hover:border-indigo-500/60 hover:bg-indigo-950/10 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-sm shadow-indigo-400"></span>
                Bank Statement
              </label>
              <span className="text-[10px] text-slate-500 uppercase font-mono">CSV / PDF</span>
            </div>
            <input
              type="file"
              accept=".csv,.pdf"
              disabled={isProcessing}
              onChange={(e) => setBankFile(e.target.files[0] || null)}
              className="w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-indigo-300 hover:file:bg-slate-700 cursor-pointer"
            />
            {bankFile && (
              <p className="text-[11px] text-emerald-400 mt-2 truncate font-medium flex items-center gap-1">
                <span>✓</span> {bankFile.name}
              </p>
            )}
          </div>

          {/* Orders Database Input */}
          <div className="border border-dashed border-slate-700/80 rounded-xl p-4 bg-slate-950/40 hover:border-purple-500/60 hover:bg-purple-950/10 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400 shadow-sm shadow-purple-400"></span>
                Orders Database
              </label>
              <span className="text-[10px] text-slate-500 uppercase font-mono">CSV</span>
            </div>
            <input
              type="file"
              accept=".csv"
              disabled={isProcessing}
              onChange={(e) => setOrdersFile(e.target.files[0] || null)}
              className="w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-purple-300 hover:file:bg-slate-700 cursor-pointer"
            />
            {ordersFile && (
              <p className="text-[11px] text-emerald-400 mt-2 truncate font-medium flex items-center gap-1">
                <span>✓</span> {ordersFile.name}
              </p>
            )}
          </div>
        </div>

        {/* Submit & Status */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="text-xs text-slate-400">
            {isProcessing ? (
              <span className="flex items-center gap-2 text-cyan-400 font-medium animate-pulse">
                <svg className="animate-spin h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing multi-agent pipeline...
              </span>
            ) : (
              <span className="text-slate-400">Ready for automated multi-way financial reconciliation</span>
            )}
          </div>

          <button
            type="submit"
            disabled={isProcessing || !paymentFile || !bankFile || !ordersFile}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-2 shadow-lg ${
              isProcessing || !paymentFile || !bankFile || !ordersFile
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-500/25 active:scale-[0.98]'
            }`}
          >
            {isProcessing ? 'Reconciling...' : 'Start Reconciliation Pipeline →'}
          </button>
        </div>
      </form>
    </div>
  );
}
