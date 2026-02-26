'use client';

import { useRef, useEffect } from 'react';

import type { TutorMessage } from '../../lib/hooks/use-tutor-session';
import { TutorMessageBubble } from './tutor-message-bubble';
import { TutorTypingIndicator } from './tutor-typing-indicator';

interface TutorChatProps {
  messages: TutorMessage[];
  personaSlug: string;
  personaName: string;
  isSending: boolean;
  /** Real-time streaming text from WebSocket (shown while AI is typing). */
  streamingText?: string;
  /** Callback to play audio for a specific message. */
  onPlayAudio?: (message: TutorMessage) => void;
  /** ID of the message whose audio is currently playing. */
  playingMessageId?: string | null;
  /** Whether the current locale is RTL. */
  isRTL?: boolean;
}

export function TutorChat({
  messages,
  personaSlug,
  personaName,
  isSending,
  streamingText,
  onPlayAudio,
  playingMessageId,
  isRTL = false,
}: TutorChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending, streamingText]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.map((message) => (
        <TutorMessageBubble
          key={message.id}
          message={message}
          personaSlug={personaSlug}
          personaName={personaName}
          onPlayAudio={
            message.role === 'ASSISTANT' && onPlayAudio
              ? () => onPlayAudio(message)
              : undefined
          }
          isPlayingAudio={playingMessageId === message.id}
          isRTL={isRTL}
        />
      ))}

      {/* Streaming text while AI is generating */}
      {streamingText && (
        <div className="flex items-start gap-3" dir={isRTL ? 'rtl' : undefined}>
          <div className="max-w-[75%] rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3">
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900">
              {streamingText}
              <span className={`inline-block w-1.5 h-4 bg-indigo-400 animate-pulse rounded-sm ${isRTL ? 'mr-0.5' : 'ml-0.5'}`} />
            </div>
          </div>
        </div>
      )}

      {isSending && !streamingText && <TutorTypingIndicator personaName={personaName} />}

      <div ref={messagesEndRef} />
    </div>
  );
}
