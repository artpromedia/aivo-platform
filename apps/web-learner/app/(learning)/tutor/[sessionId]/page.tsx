'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Send } from 'lucide-react';

import { useTutorSession } from '../../../../lib/hooks/use-tutor-session';
import { useTutorWebSocket } from '../../../../lib/hooks/use-tutor-websocket';
import { TutorSessionHeader } from '../../../../components/tutor/tutor-session-header';
import { TutorChat } from '../../../../components/tutor/tutor-chat';

export default function TutorSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [input, setInput] = useState('');
  const [currentEmotion, setCurrentEmotion] = useState('NEUTRAL');

  const {
    session,
    messages,
    isSending,
    error,
    loadMessages,
    sendMessage,
    endSession,
    setSession,
  } = useTutorSession();

  const { isConnected } = useTutorWebSocket(sessionId);

  // Load session and messages on mount
  useEffect(() => {
    async function loadSession() {
      const API_BASE = process.env.NEXT_PUBLIC_TUTOR_API_URL ?? '/api/tutor';
      try {
        const res = await fetch(`${API_BASE}/sessions/${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          setSession(data);
        }
      } catch {
        // Session load failed
      }

      await loadMessages(sessionId);
    }
    loadSession();
  }, [sessionId, loadMessages, setSession]);

  // Update emotion from latest AI message
  useEffect(() => {
    const lastAiMessage = [...messages].reverse().find((m) => m.role === 'ASSISTANT');
    if (lastAiMessage) {
      setCurrentEmotion(lastAiMessage.emotion);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    const text = input;
    setInput('');
    await sendMessage(sessionId, text);
  };

  const handleEndSession = async () => {
    await endSession(sessionId);
    router.push('/tutor');
  };

  if (!session) {
    return (
      <div className="flex h-[calc(100vh-12rem)] items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading session...</div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col rounded-2xl border border-gray-100 bg-white shadow-sm">
      <TutorSessionHeader
        session={session}
        emotion={currentEmotion}
        isConnected={isConnected}
        onEndSession={handleEndSession}
      />

      <TutorChat
        messages={messages}
        personaSlug={session.persona.slug}
        personaName={session.persona.name}
        isSending={isSending}
      />

      {error && (
        <div className="px-4 py-2 text-sm text-red-500 bg-red-50 border-t border-red-100">
          {error}
        </div>
      )}

      <div className="border-t border-gray-100 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask ${session.persona.name} anything...`}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            disabled={session.status !== 'ACTIVE'}
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending || session.status !== 'ACTIVE'}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            Send <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
