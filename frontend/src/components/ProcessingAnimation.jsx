import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const DEFAULT_STEPS = [
  { id: 'payment', label: 'Payment gateway schema detected & verified' },
  { id: 'bank', label: 'Bank statement schema & transactions mapped' },
  { id: 'orders', label: 'Orders database schema & line items parsed' },
  { id: 'reconciling', label: 'Executing exact & fuzzy multi-way matching engine...' },
  { id: 'ai', label: 'AI Exception Agent diagnosing root causes & actions...' },
  { id: 'done', label: 'Reconciliation pipeline complete!' },
];

export default function ProcessingAnimation({ batchId, onComplete }) {
  const navigate = useNavigate();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Initiating multi-agent pipeline...');
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (!batchId) return;

    // Simulation of rapid step progress combined with polling
    const stepInterval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < DEFAULT_STEPS.length - 2) {
          return prev + 1;
        }
        return prev;
      });
    }, 1200);

    // Actual polling of backend status every 1.5s
    const pollInterval = setInterval(async () => {
      try {
        const res = await api.get(`/reconcile/${batchId}/status`);
        const { status, progress } = res.data;

        if (progress?.message) {
          setStatusMessage(progress.message);
        }

        if (status === 'completed' || status === 'needs_manual_review' || progress?.step === 'completed') {
          setCurrentStepIndex(DEFAULT_STEPS.length - 1);
          setIsFinished(true);
          clearInterval(pollInterval);
          clearInterval(stepInterval);

          setTimeout(() => {
            if (onComplete) {
              onComplete();
            } else {
              navigate('/dashboard');
            }
          }, 1500);
        }
      } catch (err) {
        console.warn('Status polling error:', err.message);
      }
    }, 1500);

    return () => {
      clearInterval(stepInterval);
      clearInterval(pollInterval);
    };
  }, [batchId, navigate, onComplete]);

  return (
    <div className="bg-navy-900 text-white rounded-xl p-8 border border-navy-800 shadow-xl max-w-xl mx-auto my-6">
      <div className="text-center mb-6">
        <div className="inline-flex p-3 rounded-full bg-accent/20 text-accent mb-3 animate-pulse">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold tracking-tight">FinRecon AI Controller Pipeline</h2>
        <p className="text-xs text-navy-400 mt-1 font-mono">
          Batch: {batchId || 'Initializing...'}
        </p>
      </div>

      <div className="space-y-3">
        {DEFAULT_STEPS.map((step, idx) => {
          const isDone = idx < currentStepIndex || isFinished;
          const isCurrent = idx === currentStepIndex && !isFinished;
          const isPending = idx > currentStepIndex;

          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-300 ${
                isDone
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 translate-x-1'
                  : isCurrent
                  ? 'bg-navy-800 border-accent/60 text-accent-200 shadow-sm'
                  : 'bg-navy-950/40 border-navy-800/40 text-navy-600 opacity-60'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isDone
                    ? 'bg-emerald-500 text-white'
                    : isCurrent
                    ? 'bg-accent text-navy-950 animate-spin'
                    : 'bg-navy-800 text-navy-500'
                }`}
              >
                {isDone ? '✓' : isCurrent ? '⟳' : idx + 1}
              </span>

              <span className={`text-xs font-medium flex-1 ${isCurrent ? 'font-bold text-white' : ''}`}>
                {step.label}
              </span>

              {isDone && (
                <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-wider">
                  Success
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-navy-800 text-center">
        <p className="text-xs text-navy-400 font-mono animate-pulse">
          {statusMessage}
        </p>
      </div>
    </div>
  );
}
