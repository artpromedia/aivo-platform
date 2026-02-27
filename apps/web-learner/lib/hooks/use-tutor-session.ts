'use client';

import { useState, useCallback } from 'react';

export interface TutorPersona {
  id: string;
  slug: string;
  name: string;
  subject: string;
  description: string;
  avatarAssetKey: string;
  personality: Record<string, unknown>;
  sortOrder: number;
}

export interface TutorSession {
  id: string;
  learnerId: string;
  personaId: string;
  status: string;
  subject: string;
  topic: string | null;
  startedAt: string;
  endedAt: string | null;
  persona: Pick<TutorPersona, 'id' | 'slug' | 'name' | 'subject' | 'avatarAssetKey'>;
}

export interface TutorMessage {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  emotion: string;
  createdAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_TUTOR_API_URL ?? '/api/tutor';

export function useTutorSession() {
  const [session, setSession] = useState<TutorSession | null>(null);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSession = useCallback(
    async (personaId: string, subject: string, topic?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personaId, subject, topic }),
        });
        if (!res.ok) throw new Error('Failed to create session');
        const data = await res.json();
        setSession(data as TutorSession);
        return data as TutorSession;
      } catch (err) {
        setError((err as Error).message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const loadMessages = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/messages`);
      if (!res.ok) throw new Error('Failed to load messages');
      const data = (await res.json()) as { messages: TutorMessage[] };
      setMessages(data.messages);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  const sendMessage = useCallback(
    async (sessionId: string, content: string) => {
      setIsSending(true);
      setError(null);

      // Optimistically add user message
      const tempUserMsg: TutorMessage = {
        id: `temp-${Date.now()}`,
        role: 'USER',
        content,
        emotion: 'NEUTRAL',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMsg]);

      try {
        const res = await fetch(`${API_BASE}/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });
        if (!res.ok) throw new Error('Failed to send message');
        const data = (await res.json()) as {
          userMessage: TutorMessage;
          aiMessage: TutorMessage;
        };

        // Replace temp message with real ones
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempUserMsg.id),
          data.userMessage,
          data.aiMessage,
        ]);

        return data;
      } catch (err) {
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
        setError((err as Error).message);
        return null;
      } finally {
        setIsSending(false);
      }
    },
    [],
  );

  const endSession = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/end`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to end session');
      const data = await res.json();
      setSession((prev) => (prev ? { ...prev, status: 'COMPLETED', endedAt: (data as TutorSession).endedAt } : null));
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  return {
    session,
    messages,
    isLoading,
    isSending,
    error,
    createSession,
    loadMessages,
    sendMessage,
    endSession,
    setSession,
  };
}
