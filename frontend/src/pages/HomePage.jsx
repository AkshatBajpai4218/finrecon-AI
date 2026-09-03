import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FileUpload from '../components/FileUpload';

export default function HomePage() {
  const navigate = useNavigate();

  const handleReconciled = (batchId) => {
    navigate('/dashboard');
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-[#0b1324] text-white rounded-3xl p-8 sm:p-10 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-8 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-2xl space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/80 text-cyan-400 text-xs font-bold uppercase tracking-wider font-mono">
            <span>✨</span> Autonomous Financial Controller
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Don't just close the books. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500">
              Understand them.
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
            Autonomous multi-agent reconciliation across Payment Gateways, Bank Statements, and Order Ledgers. Identifies anomalies, diagnoses root causes via 120B AI, and produces auditable executive certificates.
          </p>
          <div className="pt-3 flex flex-wrap items-center gap-3">
            <Link
              to="/dashboard"
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20"
            >
              Open Live Dashboard →
            </Link>
            <Link
              to="/chat"
              className="px-5 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-colors border border-slate-700"
            >
              Ask Your Books (AI)
            </Link>
            <Link
              to="/reports"
              className="px-5 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-colors border border-slate-700"
            >
              Executive Reports
            </Link>
          </div>
        </div>
      </div>

      {/* Main Upload Form */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-black text-white tracking-tight">
            Multi-Source Ingestion & Pipeline Trigger
          </h2>
          <p className="text-xs text-slate-400">
            Upload the 3 financial sources (Payment Gateway, Bank Statement, Orders Database) to trigger autonomous reconciliation.
          </p>
        </div>

        <FileUpload onReconciled={handleReconciled} />
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-2 backdrop-blur-md">
          <div className="w-8 h-8 rounded-xl bg-emerald-950/60 border border-emerald-700 text-emerald-400 flex items-center justify-center font-bold text-sm">
            ✓
          </div>
          <h3 className="text-sm font-bold text-white">Deterministic Arithmetic</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Every rupee calculation, threshold, and classification is computed deterministically in code. Zero arithmetic hallucinations.
          </p>
        </div>

        <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-2 backdrop-blur-md">
          <div className="w-8 h-8 rounded-xl bg-cyan-950/60 border border-cyan-700 text-cyan-400 flex items-center justify-center font-bold text-sm">
            ⚡
          </div>
          <h3 className="text-sm font-bold text-white">Groq 120B Intelligence</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            AI handles schema inference, fuzzy reference resolution, plain-language root causes, and conversational Q&A.
          </p>
        </div>

        <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-2 backdrop-blur-md">
          <div className="w-8 h-8 rounded-xl bg-indigo-950/60 border border-indigo-700 text-indigo-400 flex items-center justify-center font-bold text-sm">
            📜
          </div>
          <h3 className="text-sm font-bold text-white">Auditable & Compliant</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Every upload, pipeline run, exception diagnostic, and export is immutably recorded in a chronological audit log.
          </p>
        </div>
      </div>
    </div>
  );
}
