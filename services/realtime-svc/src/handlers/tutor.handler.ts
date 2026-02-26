/**
 * Tutor Session WebSocket Handler
 *
 * Handles real-time tutoring via Socket.IO, implementing the
 * stream-then-synthesize pattern:
 *
 *   1. Receive student message
 *   2. Send "thinking" indicator
 *   3. Stream LLM response chunks to client (text appears immediately)
 *   4. After full response: Piper TTS synthesizes audio + visemes
 *   5. Send final message with audio URL + viseme data
 *   6. Client plays audio with lip-sync animation
 *
 * Piper TTS requires full text before synthesis (no streaming TTS),
 * so text streams first, then audio arrives for playback.
 */

import type { Socket } from 'socket.io';

import { logger } from '../logger.js';
import {
  TutorEvents,
  type TutorMessageSendPayload,
  type TutorMessageChunkPayload,
  type TutorMessageEndPayload,
  type TutorTypingPayload,
  type TutorAvatarStatePayload,
  type TutorErrorPayload,
} from '../types.js';
import type { SocketData } from '../types.js';

const TUTOR_SVC_URL = process.env.TUTOR_SVC_URL || 'http://tutor-svc:4025';

/**
 * Register tutor event handlers on a Socket.IO socket.
 * Called from websocket.gateway.ts after authentication.
 */
export function registerTutorHandlers(socket: Socket): void {
  // ── Join tutor session room ─────────────────────────────────────
  socket.on(TutorEvents.JOIN_SESSION, async (payload: { sessionId: string }) => {
    const roomId = `tutor:${payload.sessionId}`;
    await socket.join(roomId);

    logger.info({
      socketId: socket.id,
      userId: (socket.data as SocketData).userId,
      sessionId: payload.sessionId,
      room: roomId,
    }, 'User joined tutor session room');
  });

  // ── Leave tutor session room ────────────────────────────────────
  socket.on(TutorEvents.LEAVE_SESSION, async (payload: { sessionId: string }) => {
    const roomId = `tutor:${payload.sessionId}`;
    await socket.leave(roomId);

    logger.info({
      socketId: socket.id,
      sessionId: payload.sessionId,
    }, 'User left tutor session room');
  });

  // ── Handle student message ──────────────────────────────────────
  socket.on(TutorEvents.MESSAGE_SEND, async (payload: TutorMessageSendPayload) => {
    const { sessionId, content } = payload;
    const roomId = `tutor:${sessionId}`;
    const data = socket.data as SocketData;
    const userId = data.userId;
    const tenantId = data.tenantId;

    logger.info({
      sessionId,
      userId,
      contentLength: content.length,
    }, 'Tutor message received');

    try {
      // ── Phase 1: Send "thinking" indicator ──────────────────────
      const typingPayload: TutorTypingPayload = {
        sessionId,
        personaName: '',
        avatarState: 'thinking',
      };
      socket.emit(TutorEvents.TYPING, typingPayload);

      // ── Phase 2: Call tutor-svc streaming endpoint ──────────────
      const response = await fetch(
        `${TUTOR_SVC_URL}/api/v1/tutor/sessions/${sessionId}/messages/stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': tenantId,
            'X-User-ID': userId,
          },
          body: JSON.stringify({ content }),
          signal: AbortSignal.timeout(60_000),
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`tutor-svc returned ${response.status}: ${errorBody}`);
      }

      // ── Phase 2b: Read SSE stream and forward chunks ────────────
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body stream');

      const decoder = new TextDecoder();
      let accumulatedText = '';
      let chunkIndex = 0;
      let finalPayload: TutorMessageEndPayload | null = null;
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Keep the last potentially incomplete line in the buffer
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const dataStr = line.slice(6).trim();
          if (dataStr === '[DONE]') continue;

          try {
            const event = JSON.parse(dataStr);

            switch (event.type) {
              case 'chunk': {
                accumulatedText += event.text;
                chunkIndex++;
                const chunkPayload: TutorMessageChunkPayload = {
                  sessionId,
                  chunkText: event.text,
                  accumulatedText,
                  chunkIndex,
                };
                socket.emit(TutorEvents.MESSAGE_CHUNK, chunkPayload);
                break;
              }

              case 'avatar_state': {
                const statePayload: TutorAvatarStatePayload = {
                  sessionId,
                  avatarState: event.avatarState,
                  emotionTag: event.emotionTag,
                  durationMs: event.durationMs,
                };
                socket.emit(TutorEvents.AVATAR_STATE, statePayload);
                break;
              }

              case 'complete': {
                finalPayload = {
                  sessionId,
                  messageId: event.messageId,
                  content: event.content,
                  audioUrl: event.audioUrl ?? null,
                  visemes: event.visemes ?? [],
                  emotionTag: event.emotionTag ?? 'talking',
                  avatarState: event.avatarState ?? 'talking',
                  voiceInfo: event.voiceInfo ?? null,
                };
                break;
              }

              case 'error': {
                const errorPayload: TutorErrorPayload = {
                  sessionId,
                  code: event.code || 'AI_ERROR',
                  message: event.message || 'An error occurred',
                  recoverable: event.recoverable ?? true,
                };
                socket.emit(TutorEvents.ERROR, errorPayload);
                break;
              }
            }
          } catch (parseErr) {
            logger.warn({ line: dataStr }, 'Failed to parse SSE event');
          }
        }
      }

      // ── Phase 3: Send final message with audio ──────────────────
      if (finalPayload) {
        socket.emit(TutorEvents.MESSAGE_END, finalPayload);

        logger.info({
          sessionId,
          messageId: finalPayload.messageId,
          hasAudio: !!finalPayload.audioUrl,
          visemeCount: finalPayload.visemes.length,
          emotionTag: finalPayload.emotionTag,
        }, 'Tutor response complete');
      }
    } catch (error) {
      logger.error({
        err: error,
        sessionId,
        userId,
      }, 'Tutor message handling failed');

      const errorPayload: TutorErrorPayload = {
        sessionId,
        code: 'PROCESSING_ERROR',
        message: 'Sorry, something went wrong. Please try again.',
        recoverable: true,
      };
      socket.emit(TutorEvents.ERROR, errorPayload);

      // Revert avatar to idle on error
      socket.emit(TutorEvents.AVATAR_STATE, {
        sessionId,
        avatarState: 'idle',
      });
    }
  });

  // ── Audio replay request ────────────────────────────────────────
  socket.on(TutorEvents.AUDIO_REPLAY, (payload: { sessionId: string; messageId: string }) => {
    logger.info({
      sessionId: payload.sessionId,
      messageId: payload.messageId,
      userId: (socket.data as SocketData).userId,
    }, 'Audio replay requested');
  });
}
