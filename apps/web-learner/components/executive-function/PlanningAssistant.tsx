'use client';

import React, { useState, useRef, useEffect } from 'react';

import { sendPlanningMessage } from '../../lib/executive-function-api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface PlanningAssistantProps {
  learnerId: string;
  onTaskCreate?: (title: string, description?: string) => void;
  onScheduleCreate?: () => void;
}

const QUICK_PROMPTS = [
  { label: '📝 Plan homework', prompt: 'How do I plan my homework for tonight?' },
  { label: '📚 Study for test', prompt: 'How do I study for a big test?' },
  { label: '📖 Book report', prompt: 'How do I plan writing a book report?' },
  { label: '🎨 Project', prompt: 'How do I plan a school project?' },
  { label: '🏠 Morning routine', prompt: 'How do I plan my morning routine?' },
  { label: '📅 Busy week', prompt: 'How do I plan a busy week?' },
];

/**
 * PlanningAssistant Component
 *
 * An AI-powered chat interface that helps learners plan tasks,
 * study sessions, and organize their time effectively
 */
export function PlanningAssistant({
  learnerId,
  onTaskCreate,
  onScheduleCreate,
}: Readonly<PlanningAssistantProps>) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hi there! 👋 I'm your Planning Assistant. I can help you figure out how to plan and organize your tasks, homework, and activities. What would you like help planning today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(messageText?: string) {
    const text = messageText || input.trim();
    if (!text || loading) return;

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await sendPlanningMessage(learnerId, text, sessionId || undefined);

      if (!sessionId) {
        setSessionId(response.sessionId);
      }

      // Add assistant response
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        suggestions: response.suggestions,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content:
          "I'm having trouble connecting right now. Let me try to help you with some general tips instead!\n\n**Here's how to plan any task:**\n1. Write down what you need to do\n2. Break it into smaller steps\n3. Decide how long each step might take\n4. Put the steps in order\n5. Start with the first step!",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleQuickPrompt(prompt: string) {
    handleSend(prompt);
  }

  function handleSuggestionClick(suggestion: string) {
    handleSend(suggestion);
  }

  function formatMessage(content: string): React.ReactNode {
    // Simple markdown-like formatting
    const lines = content.split('\n');
    return lines.map((line, index) => {
      // Bold text
      const boldRegex = /\*\*(.*?)\*\*/g;
      const formattedLine = line.replace(boldRegex, '<strong>$1</strong>');

      // Numbered lists
      const listMatch = line.match(/^(\d+)\.\s(.+)/);
      if (listMatch) {
        return (
          <div key={`line-${index}`} className="flex gap-2">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
              {listMatch[1]}
            </span>
            <span dangerouslySetInnerHTML={{ __html: formattedLine.replace(/^\d+\.\s/, '') }} />
          </div>
        );
      }

      // Bullet points
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return (
          <div key={`line-${index}`} className="flex gap-2">
            <span className="text-blue-500">•</span>
            <span dangerouslySetInnerHTML={{ __html: formattedLine.replace(/^[-•]\s/, '') }} />
          </div>
        );
      }

      // Regular text
      if (line.trim()) {
        return (
          <p
            key={`line-${index}`}
            className="mb-2"
            dangerouslySetInnerHTML={{ __html: formattedLine }}
          />
        );
      }

      return <br key={`line-${index}`} />;
    });
  }

  function clearChat() {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content:
          "Hi there! 👋 I'm your Planning Assistant. I can help you figure out how to plan and organize your tasks, homework, and activities. What would you like help planning today?",
        timestamp: new Date(),
      },
    ]);
    setSessionId(null);
  }

  return (
    <div className="flex h-[600px] flex-col rounded-xl bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-xl">
            🤖
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Planning Assistant</h3>
            <p className="text-sm text-slate-500">Ask me how to plan anything!</p>
          </div>
        </div>
        <button
          onClick={clearChat}
          className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
        >
          New Chat
        </button>
      </div>

      {/* Quick prompts */}
      {messages.length <= 1 && (
        <div className="border-b border-slate-100 px-6 py-4">
          <p className="mb-3 text-sm font-medium text-slate-700">Quick questions:</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((item) => (
              <button
                key={item.label}
                onClick={() => handleQuickPrompt(item.prompt)}
                className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-900'
                }`}
              >
                <div className="space-y-2 text-sm leading-relaxed">
                  {formatMessage(message.content)}
                </div>

                {/* Suggestions */}
                {message.suggestions && message.suggestions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.suggestions.map((suggestion, index) => (
                      <button
                        key={`suggestion-${index}`}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}

                <div
                  className={`mt-2 text-xs ${
                    message.role === 'user' ? 'text-blue-200' : 'text-slate-400'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-slate-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                    <div
                      className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
                      style={{ animationDelay: '0.1s' }}
                    />
                    <div
                      className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
                      style={{ animationDelay: '0.2s' }}
                    />
                  </div>
                  <span className="text-sm text-slate-500">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 px-6 py-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about planning..."
            disabled={loading}
            className="flex-1 rounded-full border-2 border-slate-200 px-6 py-3 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="rounded-full bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>

        {/* Action buttons */}
        <div className="mt-3 flex justify-center gap-2">
          {onTaskCreate && (
            <button
              onClick={() => onTaskCreate('', '')}
              className="rounded-lg bg-purple-100 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-200"
            >
              📝 Create Task
            </button>
          )}
          {onScheduleCreate && (
            <button
              onClick={onScheduleCreate}
              className="rounded-lg bg-green-100 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-200"
            >
              📅 Create Schedule
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
