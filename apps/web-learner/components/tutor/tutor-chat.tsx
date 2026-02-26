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
}

export function TutorChat({ messages, personaSlug, personaName, isSending }: TutorChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.map((message) => (
        <TutorMessageBubble
          key={message.id}
          message={message}
          personaSlug={personaSlug}
          personaName={personaName}
        />
      ))}

      {isSending && <TutorTypingIndicator personaName={personaName} />}

      <div ref={messagesEndRef} />
    </div>
  );
}
