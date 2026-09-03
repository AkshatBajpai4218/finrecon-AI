import React, { useState, useRef, useEffect } from 'react';
import api from '../lib/api';

const EXAMPLE_QUESTIONS = [
  "Why is today's reconciliation rate low?",
  "Show me transactions above ₹10,000 that failed reconciliation",
  "What is the biggest exception?",
];

export default function ChatWindow({ batchId }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hello! I am your AI Financial Controller. Ask me anything about your reconciled books, match rates, breaks, or high-exposure exceptions.',
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
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl flex flex-col h-[580px] overflow-hidden backdrop-blur-md">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/80 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-sm font-bold shadow-inner">
            ✨
          </div>
          <div>
            <h3 className="text-sm font-black text-white tracking-tight">Ask Your Books (AI Controller)</h3>
            <p className="text-[11px] text-slate-400 font-mono">Grounded retrieval over verified ledger records via 120B AI</p>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold px-3 py-1 rounded-full bg-cyan-950/60 text-cyan-400 border border-cyan-800/80 uppercase">
          Groq 120B Active
        </span>
      </div>

      {/* Suggested Questions */}
      <div className="p-3.5 bg-slate-950/40 border-b border-slate-800 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 font-mono">
          Suggestions:
        </span>
        {EXAMPLE_QUESTIONS.map((example, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(example)}
            disabled={loading}
            className="text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white px-3 py-1 rounded-lg border border-slate-700 transition-colors text-left"
          >
            "{example}"
          </button>
        ))}
      </div>

      {/* Messages Container */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-950/30">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xl rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-700 text-white rounded-br-none shadow-lg shadow-cyan-950/50'
                  : msg.isError
                  ? 'bg-rose-950/40 border border-rose-800 text-rose-300 rounded-bl-none'
                  : 'bg-slate-850 bg-slate-800/80 border border-slate-750 border-slate-700 text-slate-100 rounded-bl-none shadow-lg'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5 gap-4">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider font-mono ${
                    msg.role === 'user' ? 'text-cyan-200' : 'text-cyan-400'
                  }`}
                >
                  {msg.role === 'user' ? 'You (Merchant)' : 'FinRecon AI Controller'}
                </span>
                {msg.retrievedCount !== undefined && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    Grounded on {msg.retrievedCount} records
                  </span>
                )}
              </div>
              <div className="whitespace-pre-wrap font-medium">{msg.text}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl rounded-bl-none p-4 shadow-lg flex items-center gap-2.5 text-xs text-slate-300">
              <span className="animate-spin h-3.5 w-3.5 border-2 border-cyan-400 border-t-transparent rounded-full"></span>
              Querying live ledger database & reasoning with Groq 120B...
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
        className="p-3.5 bg-slate-950/80 border-t border-slate-800 flex gap-2.5"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about match rates, settlement delays, or high-exposure exceptions..."
          disabled={loading}
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400 text-slate-100 placeholder:text-slate-500"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md ${
            loading || !input.trim()
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950'
          }`}
        >
          Ask AI →
        </button>
      </form>
    </div>
  );
}
