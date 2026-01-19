/**
 * Message Thread Component
 *
 * Displays a conversation thread with a teacher, including
 * message history, real-time updates, and reply functionality.
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, User, Check, CheckCheck, ArrowLeft } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import type { Conversation } from './message-list';

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  senderId: string;
  senderType: 'parent' | 'teacher';
  senderName: string;
  createdAt: string;
  isRead: boolean;
  attachments?: {
    id: string;
    name: string;
    url: string;
    type: string;
  }[];
}

interface MessageThreadProps {
  conversation: Conversation;
  messages: Message[];
  currentUserId: string;
  onSendMessage: (content: string, attachments?: File[]) => Promise<void>;
  onMarkAsRead: (messageIds: string[]) => void;
  onBack?: () => void;
  isLoading?: boolean;
  isSending?: boolean;
}

export function MessageThread({
  conversation,
  messages,
  currentUserId,
  onSendMessage,
  onMarkAsRead,
  onBack,
  isLoading,
  isSending,
}: MessageThreadProps) {
  const [newMessage, setNewMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark unread messages as read
  useEffect(() => {
    const unreadIds = messages
      .filter((m) => !m.isRead && m.senderId !== currentUserId)
      .map((m) => m.id);

    if (unreadIds.length > 0) {
      onMarkAsRead(unreadIds);
    }
  }, [messages, currentUserId, onMarkAsRead]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [newMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && attachments.length === 0) return;

    try {
      await onSendMessage(newMessage.trim(), attachments);
      setNewMessage('');
      setAttachments([]);
    } catch {
      // Error is handled by parent
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  // Group messages by date
  const groupedMessages = messages.reduce<{ date: string; messages: Message[] }[]>(
    (groups, message) => {
      const date = formatMessageDate(message.createdAt);
      const lastGroup = groups[groups.length - 1];

      if (lastGroup && lastGroup.date === date) {
        lastGroup.messages.push(message);
      } else {
        groups.push({ date, messages: [message] });
      }

      return groups;
    },
    []
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-gray-200 bg-white">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors md:hidden"
            aria-label="Back to conversations"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
        )}
        <div className="flex items-center gap-3 flex-1">
          {conversation.teacher.avatar ? (
            <img
              src={conversation.teacher.avatar}
              alt={`${conversation.teacher.name}'s avatar`}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center">
              <span className="text-white font-semibold">
                {conversation.teacher.name.charAt(0)}
              </span>
            </div>
          )}
          <div>
            <h2 className="font-semibold text-gray-900">
              {conversation.teacher.name}
            </h2>
            <p className="text-sm text-gray-500">
              {conversation.teacher.subject && `${conversation.teacher.subject} - `}
              {conversation.child.name}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : ''}`}>
                <div className={`animate-pulse ${i % 2 === 0 ? 'items-end' : ''}`}>
                  <div className={`h-16 bg-gray-200 rounded-2xl w-48 ${i % 2 === 0 ? 'rounded-br-sm' : 'rounded-bl-sm'}`} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          groupedMessages.map((group, groupIndex) => (
            <div key={groupIndex}>
              {/* Date Separator */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-xs text-gray-500 font-medium">
                  {group.date}
                </span>
                <div className="flex-1 border-t border-gray-200" />
              </div>

              {/* Messages */}
              <div className="space-y-3">
                {group.messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwn={message.senderId === currentUserId}
                  />
                ))}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-200">
        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg"
              >
                <Paperclip className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700 truncate max-w-[150px]">
                  {file.name}
                </span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label={`Remove ${file.name}`}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx"
          />

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              disabled={isSending}
            />
          </div>

          <button
            type="submit"
            disabled={(!newMessage.trim() && attachments.length === 0) || isSending}
            className="p-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex items-end gap-2 max-w-[75%] ${isOwn ? 'flex-row-reverse' : ''}`}>
        {/* Avatar (only for received messages) */}
        {!isOwn && (
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center">
              <span className="text-white text-xs font-medium">
                {message.senderName.charAt(0)}
              </span>
            </div>
          </div>
        )}

        <div className={`${isOwn ? 'items-end' : 'items-start'}`}>
          {/* Sender Name (only for received messages) */}
          {!isOwn && (
            <span className="text-xs text-gray-500 mb-1 block ml-1">
              {message.senderName}
            </span>
          )}

          {/* Message Bubble */}
          <div
            className={`px-4 py-2.5 rounded-2xl ${
              isOwn
                ? 'bg-violet-600 text-white rounded-br-sm'
                : 'bg-white text-gray-900 border border-gray-100 rounded-bl-sm shadow-sm'
            }`}
          >
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {message.attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 text-sm ${
                      isOwn ? 'text-violet-200 hover:text-white' : 'text-violet-600 hover:text-violet-700'
                    }`}
                  >
                    <Paperclip className="w-3 h-3" />
                    {attachment.name}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Timestamp & Read Status */}
          <div
            className={`flex items-center gap-1 mt-1 ${
              isOwn ? 'justify-end mr-1' : 'ml-1'
            }`}
          >
            <span className="text-xs text-gray-400">
              {format(new Date(message.createdAt), 'h:mm a')}
            </span>
            {isOwn && (
              message.isRead ? (
                <CheckCheck className="w-3.5 h-3.5 text-violet-500" />
              ) : (
                <Check className="w-3.5 h-3.5 text-gray-400" />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MessageThread;
