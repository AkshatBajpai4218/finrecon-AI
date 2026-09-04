import React, { useState, useRef, useEffect } from 'react';
import api from '../lib/api';
import ChatMarkdownRenderer from './ChatMarkdownRenderer';

const EXAMPLE_QUESTIONS = [
  "Show me transactions above ₹10,000 that failed reconciliation",
  "Show transactions with amount 7920",
  "What is the biggest exception?",
  "Why is today's reconciliation rate low?",
];

export default function ChatWindow({ batchId }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hello! I am your AI Financial Controller. Ask me anything about your reconciled books, match rates, breaks, or high-exposure exceptions. I can provide detailed diagnostic tables for any queries.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (questionText) => {
    const q = (questionText || input).trim();
    if (!q || loading) return;

    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/chat', {
        question: q,
        batchId: batchId || undefined,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: res.data.answer || 'No answer generated.',
          retrievedCount: res.data.retrievedCount,
        },
      ]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `⚠️ Error processing inquiry: ${err.response?.data?.error || err.message || 'Server connection failed.'}`,
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl flex flex-col h-[640px] overflow-hidden backdrop-blur-md">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/80 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-sm font-bold shadow-inner shadow-cyan-500/20 animate-pulse">
            ✨
          </div>
          <div>
            <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
              <span>Ask Your Books (AI Controller)</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">Grounded retrieval over verified ledger records via 120B AI with Interactive Tables</p>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold px-3 py-1 rounded-full bg-cyan-950/70 text-cyan-400 border border-cyan-800/80 uppercase flex items-center gap-1.5 shadow-sm shadow-cyan-950/50">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          Groq 120B Active
        </span>
      </div>

      {/* Suggested Questions */}
      <div className="p-3.5 bg-slate-950/50 border-b border-slate-800 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 font-mono flex items-center gap-1">
          <span>💡</span>
          <span>Suggestions:</span>
        </span>
        {EXAMPLE_QUESTIONS.map((example, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(example)}
            disabled={loading}
            className="text-xs bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 hover:text-white px-3 py-1.5 rounded-xl border border-slate-700/90 hover:border-cyan-500/60 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-md hover:shadow-cyan-950/40 text-left cursor-pointer flex items-center gap-1.5"
          >
            <span className="text-cyan-400/80 text-[10px]">›</span>
            <span>"{example}"</span>
          </button>
        ))}
      </div>

      {/* Messages Container */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-950/30">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
          >
            <div
              className={`rounded-2xl p-4 text-xs sm:text-sm leading-relaxed transition-all duration-200 hover:shadow-2xl ${
                msg.role === 'user'
                  ? 'max-w-xl bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 text-white rounded-br-none shadow-lg shadow-cyan-950/50'
                  : msg.isError
                  ? 'max-w-xl bg-rose-950/40 border border-rose-800 text-rose-300 rounded-bl-none shadow-rose-950/30 shadow-md'
                  : 'w-full max-w-2xl lg:max-w-3xl bg-slate-850 bg-slate-800/85 border border-slate-700 hover:border-slate-600 text-slate-100 rounded-bl-none shadow-xl backdrop-blur-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-2 gap-4 border-b border-slate-700/60 pb-1.5">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 ${
                    msg.role === 'user' ? 'text-cyan-100' : 'text-cyan-400'
                  }`}
                >
                  <span className="text-xs">{msg.role === 'user' ? '👤' : '🤖'}</span>
                  <span>{msg.role === 'user' ? 'You (Merchant)' : 'FinRecon AI Controller'}</span>
                </span>
                {msg.retrievedCount !== undefined && (
                  <span className="text-[10px] text-slate-400 font-mono bg-slate-900/80 px-2.5 py-0.5 rounded-full border border-slate-750 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                    <span>Grounded on {msg.retrievedCount} records</span>
                  </span>
                )}
              </div>
              <ChatMarkdownRenderer content={msg.text} isUser={msg.role === 'user'} />
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start animate-fade-in-up">
            <div className="w-full max-w-md bg-slate-850 bg-slate-800/90 border border-cyan-500/30 rounded-2xl rounded-bl-none p-4 shadow-xl shadow-cyan-950/20 backdrop-blur-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                  </span>
                  <span>Reasoning with Groq 120B...</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce"></span>
                </div>
              </div>

              {/* Shimmer Progress Scanning Bar */}
              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden relative">
                <div className="h-full w-full animate-shimmer"></div>
              </div>

              <p className="text-[11px] text-slate-400 font-mono animate-pulse">
                Querying live MongoDB ledger database & evaluating multi-source variance...
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3.5 bg-slate-950/90 border-t border-slate-800 flex gap-2.5"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about match rates, settlement delays, or high-exposure exceptions..."
          disabled={loading}
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400 transition-all duration-200 text-slate-100 placeholder:text-slate-500 shadow-inner"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className={`group px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 shadow-md flex items-center gap-2 cursor-pointer ${
            loading || !input.trim()
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 hover:shadow-lg hover:shadow-cyan-500/25 active:scale-95'
          }`}
        >
          <span>Ask AI</span>
          <span className="inline-block transition-transform duration-200 group-hover:translate-x-1 font-mono">→</span>
        </button>
      </form>
    </div>
  );
}
