'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

// =============================================================================
// Constants
// =============================================================================

const TutorEvents = {
  MESSAGE_SEND: 'tutor:message:send',
  TYPING: 'tutor:typing',
  MESSAGE_CHUNK: 'tutor:message:chunk',
  MESSAGE_END: 'tutor:message:end',
  AVATAR_STATE: 'tutor:avatar:state',
  ERROR: 'tutor:error',
  JOIN_SESSION: 'tutor:session:join',
  LEAVE_SESSION: 'tutor:session:leave',
  SESSION_STATE: 'tutor:session:state',
} as const;

// =============================================================================
// Types
// =============================================================================

export interface TutorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string | null;
  visemes?: Array<{ offsetMs: number; mouthOpen: number; durationMs: number }>;
  emotionTag?: string;
  avatarState?: string;
  createdAt: Date;
}

export type AvatarState =
  | 'idle'
  | 'thinking'
  | 'talking'
  | 'celebrating'
  | 'encouraging'
  | 'listening';

export interface UseTutorWebSocketOptions {
  sessionId: string;
  authToken: string;
  realtimeUrl?: string;
  onAudioReady?: (audioUrl: string, visemes: Array<{ offsetMs: number; mouthOpen: number; durationMs: number }>) => void;
}

export interface UseTutorWebSocketReturn {
  messages: TutorMessage[];
  streamingText: string;
  isAiTyping: boolean;
  avatarState: AvatarState;
  isConnected: boolean;
  useHttpFallback: boolean;
  error: string | null;
  sendMessage: (content: string) => void;
  addInitialMessages: (msgs: TutorMessage[]) => void;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Tutor WebSocket hook for real-time communication via Socket.IO.
 *
 * Implements the stream-then-synthesize pattern:
 *   1. Send student message
 *   2. Receive text chunks (displayed immediately while AI "thinks")
 *   3. Receive final message with audio + visemes
 *   4. Trigger lip-sync playback via onAudioReady callback
 *
 * Falls back to HTTP POST after 3 failed WebSocket connection attempts.
 */
export function useTutorWebSocket({
  sessionId,
  authToken,
  realtimeUrl = process.env.NEXT_PUBLIC_REALTIME_URL || 'http://localhost:4010',
  onAudioReady,
}: UseTutorWebSocketOptions): UseTutorWebSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const connectionAttemptsRef = useRef(0);
  const onAudioReadyRef = useRef(onAudioReady);
  onAudioReadyRef.current = onAudioReady;

  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const [isConnected, setIsConnected] = useState(false);
  const [useHttpFallback, setUseHttpFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Socket.IO connection ──────────────────────────────────────────
  useEffect(() => {
    if (useHttpFallback) return;

    const socket = io(realtimeUrl, {
      path: '/socket.io',
      transports: ['websocket'],
      auth: { token: authToken },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setError(null);
      connectionAttemptsRef.current = 0;
      socket.emit(TutorEvents.JOIN_SESSION, { sessionId });
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        setError('Session disconnected by server');
      }
    });

    socket.on('connect_error', () => {
      connectionAttemptsRef.current++;
      setIsConnected(false);

      if (connectionAttemptsRef.current >= 3) {
        setUseHttpFallback(true);
        socket.disconnect();
        console.warn('WebSocket unavailable, falling back to HTTP mode');
      }
    });

    // ── Tutor events ──────────────────────────────────────────────

    socket.on(TutorEvents.TYPING, () => {
      setIsAiTyping(true);
      setAvatarState('thinking');
      setStreamingText('');
    });

    socket.on(
      TutorEvents.MESSAGE_CHUNK,
      (payload: { chunkText: string; accumulatedText: string }) => {
        setStreamingText(payload.accumulatedText);
      },
    );

    socket.on(
      TutorEvents.AVATAR_STATE,
      (payload: { avatarState: string; durationMs?: number }) => {
        setAvatarState(payload.avatarState as AvatarState);

        if (payload.durationMs) {
          const state = payload.avatarState;
          setTimeout(() => {
            setAvatarState((current) =>
              current === (state as AvatarState) ? 'idle' : current,
            );
          }, payload.durationMs);
        }
      },
    );

    socket.on(
      TutorEvents.MESSAGE_END,
      (payload: {
        messageId: string;
        content: string;
        audioUrl: string | null;
        visemes: Array<{ offsetMs: number; mouthOpen: number; durationMs: number }>;
        emotionTag: string;
        avatarState: string;
      }) => {
        setIsAiTyping(false);
        setStreamingText('');

        const newMessage: TutorMessage = {
          id: payload.messageId,
          role: 'assistant',
          content: payload.content,
          audioUrl: payload.audioUrl,
          visemes: payload.visemes,
          emotionTag: payload.emotionTag,
          avatarState: payload.avatarState,
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, newMessage]);

        // Stream-then-synthesize: play audio AFTER text is complete
        if (payload.audioUrl && payload.visemes?.length > 0) {
          const emotionState =
            payload.emotionTag === 'celebrating' ? 'celebrating' : 'encouraging';
          setAvatarState(emotionState as AvatarState);

          setTimeout(() => {
            setAvatarState('talking');
            onAudioReadyRef.current?.(payload.audioUrl!, payload.visemes);
          }, 800);
        } else {
          const emotionState =
            payload.emotionTag === 'celebrating' ? 'celebrating' : 'encouraging';
          setAvatarState(emotionState as AvatarState);
          setTimeout(() => setAvatarState('idle'), 2000);
        }
      },
    );

    socket.on(
      TutorEvents.ERROR,
      (payload: { code: string; message: string; recoverable: boolean }) => {
        setIsAiTyping(false);
        setStreamingText('');
        setAvatarState('idle');
        setError(payload.message);

        if (payload.recoverable) {
          setTimeout(() => setError(null), 5000);
        }
      },
    );

    socket.on(
      TutorEvents.SESSION_STATE,
      (payload: { status: string; reason?: string }) => {
        if (payload.status === 'COMPLETED' || payload.status === 'EXPIRED') {
          setError(payload.reason || 'Session ended');
        }
      },
    );

    return () => {
      socket.emit(TutorEvents.LEAVE_SESSION, { sessionId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionId, authToken, realtimeUrl, useHttpFallback]);

  // ── Send message ──────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      // Add user message optimistically
      const userMessage: TutorMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: content.trim(),
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // ── HTTP fallback mode ──────────────────────────────────────
      if (useHttpFallback) {
        setIsAiTyping(true);
        setAvatarState('thinking');

        try {
          const tutorSvcUrl =
            process.env.NEXT_PUBLIC_TUTOR_SVC_URL || '/api/tutor';
          const response = await fetch(
            `${tutorSvcUrl}/sessions/${sessionId}/messages`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${authToken}`,
              },
              body: JSON.stringify({ content: content.trim(), voiceEnabled: true }),
            },
          );

          const data = await response.json();
          setIsAiTyping(false);

          const aiMsg: TutorMessage = {
            id: data.aiMessage.id,
            role: 'assistant',
            content: data.aiMessage.content,
            audioUrl: data.aiMessage.audioUrl,
            visemes: data.aiMessage.visemes,
            emotionTag: data.aiMessage.emotionTag,
            createdAt: new Date(data.aiMessage.createdAt),
          };
          setMessages((prev) => [...prev, aiMsg]);

          if (aiMsg.audioUrl && aiMsg.visemes?.length) {
            setAvatarState('talking');
            onAudioReadyRef.current?.(aiMsg.audioUrl, aiMsg.visemes);
          } else {
            setAvatarState('idle');
          }
        } catch {
          setIsAiTyping(false);
          setAvatarState('idle');
          setError('Failed to send message. Please try again.');
          setTimeout(() => setError(null), 5000);
        }

        return;
      }

      // ── WebSocket mode ──────────────────────────────────────────
      if (socketRef.current?.connected) {
        socketRef.current.emit(TutorEvents.MESSAGE_SEND, {
          sessionId,
          content: content.trim(),
        });
      }
    },
    [sessionId, authToken, useHttpFallback],
  );

  // ── Load initial messages ─────────────────────────────────────────
  const addInitialMessages = useCallback((msgs: TutorMessage[]) => {
    setMessages(msgs);
  }, []);

  return {
    messages,
    streamingText,
    isAiTyping,
    avatarState,
    isConnected,
    useHttpFallback,
    error,
    sendMessage,
    addInitialMessages,
  };
}
