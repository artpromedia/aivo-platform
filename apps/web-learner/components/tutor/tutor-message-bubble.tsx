'use client';

import type { TutorMessage } from '../../lib/hooks/use-tutor-session';
import { AnimatedTutorAvatar } from './animated-tutor-avatar';

interface TutorMessageBubbleProps {
  message: TutorMessage;
  personaSlug: string;
  personaName: string;
}

export function TutorMessageBubble({ message, personaSlug, personaName }: TutorMessageBubbleProps) {
  const isUser = message.role === 'USER';

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
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
        <div
          className={`mt-1 text-xs ${isUser ? 'text-indigo-200' : 'text-gray-400'}`}
        >
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}
