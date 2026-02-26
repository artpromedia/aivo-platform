'use client';

import { Volume2 } from 'lucide-react';

import type { TutorMessage } from '../../lib/hooks/use-tutor-session';
import { AnimatedTutorAvatar } from './animated-tutor-avatar';

interface TutorMessageBubbleProps {
  message: TutorMessage;
  personaSlug: string;
  personaName: string;
  /** Callback to replay TTS audio for this message. */
  onPlayAudio?: () => void;
  /** Whether this message's audio is currently playing. */
  isPlayingAudio?: boolean;
  /** Whether the current locale is RTL. */
  isRTL?: boolean;
}

export function TutorMessageBubble({
  message,
  personaSlug,
  personaName,
  onPlayAudio,
  isPlayingAudio,
  isRTL = false,
}: TutorMessageBubbleProps) {
  const isUser = message.role === 'USER';

  return (
    <div
      className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
      dir={isRTL ? 'rtl' : undefined}
    >
      {!isUser && (
        <AnimatedTutorAvatar
          personaSlug={personaSlug}
          personaName={personaName}
          emotion={message.emotion}
          size="sm"
          isAnimating={false}
        />
      )}

      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-indigo-600 text-white'
            : 'bg-gray-50 text-gray-900 border border-gray-100'
        }`}
      >
        <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>

        <div className="mt-1 flex items-center gap-2">
          <span
            className={`text-xs ${isUser ? 'text-indigo-200' : 'text-gray-400'}`}
          >
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>

          {!isUser && onPlayAudio && (
            <button
              onClick={onPlayAudio}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition ${
                isPlayingAudio
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'
              }`}
              aria-label="Play audio"
            >
              <Volume2 className="h-3 w-3" />
              {isPlayingAudio ? 'Playing' : 'Listen'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
