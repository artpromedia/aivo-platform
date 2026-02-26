'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, MessageSquare, Brain } from 'lucide-react';

interface SessionMessage {
  id: string;
  role: string;
  content: string;
  emotion: string;
  createdAt: string;
}

interface TutorSessionReportProps {
  sessionId: string;
  onBack: () => void;
}

const API_BASE = process.env.NEXT_PUBLIC_TUTOR_API_URL ?? '/api/tutor';

export function TutorSessionReport({ sessionId, onBack }: TutorSessionReportProps) {
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadMessages() {
      try {
        const res = await fetch(`${API_BASE}/sessions/${sessionId}/messages`);
        if (res.ok) {
          const data = (await res.json()) as { messages: SessionMessage[] };
          setMessages(data.messages);
        }
      } catch {
        // Use demo data
        setMessages([
          { id: '1', role: 'ASSISTANT', content: "Hi! I'm Nova, your math tutor. What would you like to work on today?", emotion: 'HAPPY', createdAt: new Date(Date.now() - 3600000).toISOString() },
          { id: '2', role: 'USER', content: 'Can you help me with fractions?', emotion: 'NEUTRAL', createdAt: new Date(Date.now() - 3500000).toISOString() },
          { id: '3', role: 'ASSISTANT', content: "Fractions are like slicing a pizza! What do you already know about fractions?", emotion: 'ENCOURAGING', createdAt: new Date(Date.now() - 3400000).toISOString() },
        ]);
      } finally {
        setIsLoading(false);
      }
    }
    loadMessages();
  }, [sessionId]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Sessions
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-full bg-indigo-100 p-2">
          <Brain className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Session Transcript</h1>
          <p className="text-sm text-gray-500">
            {messages.length} messages
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-xl p-4 ${
                msg.role === 'USER'
                  ? 'bg-indigo-50 border border-indigo-100 ml-8'
                  : 'bg-gray-50 border border-gray-100 mr-8'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-gray-500">
                  {msg.role === 'USER' ? 'Your child' : 'AI Tutor'}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
