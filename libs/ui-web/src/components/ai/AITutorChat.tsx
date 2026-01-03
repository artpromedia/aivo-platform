'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ReactNode, FormEvent } from 'react';

import { cn } from '../../utils/cn';
import { Button } from '../button';
import { Card } from '../card';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface AITutorChatProps {
  /** API endpoint for chat */
  apiEndpoint?: string;
  /** Student information for personalization */
  studentProfile?: StudentProfile;
  /** Initial subject/topic context */
  context?: ChatContext;
  /** Callback when help is needed */
  onEscalate?: (message: string) => void;
  /** Additional class names */
  className?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Welcome message */
  welcomeMessage?: string;
}

interface StudentProfile {
  gradeLevel: string;
  learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  name?: string;
}

interface ChatContext {
  subject: string;
  topic?: string;
  lessonId?: string;
  questionId?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    suggestions?: string[];
    relatedTopics?: string[];
    difficulty?: number;
  };
}

interface QuickAction {
  id: string;
  label: string;
  prompt: string;
  icon: ReactNode;
}

// ────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ────────────────────────────────────────────────────────────────────────────

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'explain',
    label: 'Explain this',
    prompt: 'Can you explain this concept in simpler terms?',
    icon: <LightbulbIcon className="h-4 w-4" />,
  },
  {
    id: 'example',
    label: 'Give me an example',
    prompt: 'Can you give me an example to help me understand?',
    icon: <ExampleIcon className="h-4 w-4" />,
  },
  {
    id: 'steps',
    label: 'Step-by-step',
    prompt: 'Can you break this down step by step?',
    icon: <StepsIcon className="h-4 w-4" />,
  },
  {
    id: 'quiz',
    label: 'Quiz me',
    prompt: 'Can you quiz me on this topic?',
    icon: <QuizIcon className="h-4 w-4" />,
  },
];

// ────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export function AITutorChat({
  apiEndpoint = '/api/ai/tutor/chat',
  studentProfile,
  context,
  onEscalate,
  className,
  placeholder = "Ask me anything about your lesson...",
  welcomeMessage,
}: AITutorChatProps) {
  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ──────────────────────────────────────────────────────────────────────────
  // EFFECTS
  // ──────────────────────────────────────────────────────────────────────────

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcome =
        welcomeMessage ??
        `Hi${studentProfile?.name ? ` ${studentProfile.name}` : ''}! 👋 I'm your AI tutor. I'm here to help you understand ${context?.topic ?? 'your lesson'}. Feel free to ask me any questions!`;

      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: welcome,
          timestamp: new Date(),
          metadata: {
            suggestions: [
              'Explain the main concept',
              'Give me a practice problem',
              'What should I know first?',
            ],
          },
        },
      ]);
    }
  }, [messages.length, studentProfile?.name, context?.topic, welcomeMessage]);

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputValue('');
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: content,
            context,
            studentProfile,
            conversationHistory: messages.slice(-10).map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get response');
        }

        const data = await response.json();

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.message ?? data.response ?? 'I apologize, but I encountered an issue. Please try again.',
          timestamp: new Date(),
          metadata: {
            suggestions: data.suggestions,
            relatedTopics: data.relatedTopics,
          },
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        setError('Sorry, I had trouble responding. Please try again.');
        console.error('Chat error:', err);
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [apiEndpoint, context, studentProfile, messages]
  );

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      void sendMessage(inputValue);
    },
    [inputValue, sendMessage]
  );

  const handleQuickAction = useCallback(
    (action: QuickAction) => {
      void sendMessage(action.prompt);
    },
    [sendMessage]
  );

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      void sendMessage(suggestion);
    },
    [sendMessage]
  );

  const handleEscalate = useCallback(() => {
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop();
    onEscalate?.(lastUserMessage?.content ?? 'Student needs help');
  }, [messages, onEscalate]);

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className={cn(
          'fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center',
          'rounded-full bg-primary text-on-accent shadow-lg transition-transform hover:scale-110',
          className
        )}
        aria-label="Open AI Tutor"
      >
        <ChatIcon className="h-6 w-6" />
      </button>
    );
  }

  return (
    <Card
      className={cn('flex h-[500px] w-full max-w-md flex-col', className)}
      title={
        <div className="flex items-center gap-2">
          <TutorAvatar />
          <div>
            <div className="font-semibold">AI Tutor</div>
            <div className="text-xs text-muted">
              {context?.topic ?? 'Ready to help'}
            </div>
          </div>
        </div>
      }
      action={
        <div className="flex gap-1">
          {onEscalate && (
            <Button variant="ghost" size="icon" onClick={handleEscalate} title="Get human help">
              <HandIcon className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMinimized(true)}
            title="Minimize"
          >
            <MinimizeIcon className="h-4 w-4" />
          </Button>
        </div>
      }
    >
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 p-1">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onSuggestionClick={handleSuggestionClick}
          />
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <TypingIndicator />
            <span>Thinking...</span>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length <= 2 && (
        <div className="border-t border-border p-3">
          <div className="mb-2 text-xs text-muted">Quick actions:</div>
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action)}
                className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs transition-colors hover:border-primary hover:bg-primary/5"
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-border p-3">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
          <Button
            type="submit"
            variant="primary"
            size="icon"
            disabled={!inputValue.trim() || isLoading}
          >
            <SendIcon className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ────────────────────────────────────────────────────────────────────────────

function MessageBubble({
  message,
  onSuggestionClick,
}: {
  message: ChatMessage;
  onSuggestionClick: (suggestion: string) => void;
}) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[85%] space-y-2')}>
        {!isUser && (
          <div className="flex items-center gap-2">
            <TutorAvatar small />
            <span className="text-xs text-muted">AI Tutor</span>
          </div>
        )}

        <div
          className={cn(
            'rounded-lg px-3 py-2 text-sm',
            isUser
              ? 'bg-primary text-on-accent'
              : 'bg-surface-muted text-text'
          )}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>

        {/* Suggestions */}
        {message.metadata?.suggestions && message.metadata.suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {message.metadata.suggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => onSuggestionClick(suggestion)}
                className="rounded-full border border-border px-2 py-0.5 text-xs text-muted transition-colors hover:border-primary hover:text-primary"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TutorAvatar({ small }: { small?: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-primary/10 text-primary',
        small ? 'h-6 w-6' : 'h-8 w-8'
      )}
    >
      <BotIcon className={small ? 'h-3 w-3' : 'h-4 w-4'} />
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-1">
      <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// ICONS
// ────────────────────────────────────────────────────────────────────────────

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

function BotIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-7.536 5.879a1 1 0 001.415 0A3 3 0 0110 13a3 3 0 011.536.879 1 1 0 001.414-1.415A5 5 0 0010 11a5 5 0 00-2.535 1.05 1 1 0 00-.001 1.829z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
      />
    </svg>
  );
}

function MinimizeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function HandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"
      />
    </svg>
  );
}

function LightbulbIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  );
}

function ExampleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    </svg>
  );
}

function StepsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  );
}

function QuizIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
