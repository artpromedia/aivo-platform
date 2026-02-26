'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

export interface WSMessage {
  type: string;
  payload: Record<string, unknown>;
}

export function useTutorWebSocket(sessionId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8080';

  useEffect(() => {
    if (!sessionId) return;

    const ws = new WebSocket(`${wsUrl}/ws/tutor/${sessionId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // Join tutor session room
      ws.send(
        JSON.stringify({
          type: 'tutor:join',
          payload: { sessionId },
        }),
      );
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WSMessage;
        setLastMessage(data);
      } catch {
        // Invalid message format
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [sessionId, wsUrl]);

  const sendMessage = useCallback((type: string, payload: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  return {
    isConnected,
    lastMessage,
    sendMessage,
  };
}
