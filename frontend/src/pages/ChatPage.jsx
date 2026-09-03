import React from 'react';
import ChatWindow from '../components/ChatWindow';

export default function ChatPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-navy-900 tracking-tight">
          Ask Your Books
        </h1>
        <p className="text-xs text-navy-500 mt-1">
          Query your multi-source reconciliation data using plain English. Grounded directly in live transaction records.
        </p>
      </div>

      <ChatWindow />
    </div>
  );
}
