/**
 * Messages Preview Component
 *
 * Shows a preview of recent teacher messages on the dashboard
 * with unread indicators and quick access to the full messaging interface.
 */

'use client';

import { MessageSquare, Circle, ArrowRight, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  id: string;
  teacherName: string;
  teacherAvatar?: string;
  subject: string;
  preview: string;
  unread: boolean;
  timestamp: string;
}

interface MessagesPreviewProps {
  messages: Message[];
  onViewAll?: () => void;
  onMessageClick?: (messageId: string) => void;
}

export function MessagesPreview({ messages, onViewAll, onMessageClick }: MessagesPreviewProps) {
  const unreadCount = messages.filter(m => m.unread).length;
  const displayMessages = messages.slice(0, 3);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-500" />
          Messages
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
              {unreadCount} new
            </span>
          )}
        </h2>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1"
          >
            View All
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {displayMessages.length === 0 ? (
        <div className="text-center py-6">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No messages yet</p>
          <p className="text-gray-400 text-xs mt-1">
            Messages from teachers will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {displayMessages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              onClick={() => onMessageClick?.(message.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MessageItem({
  message,
  onClick,
}: {
  message: Message;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg transition-colors ${
        message.unread
          ? 'bg-indigo-50 hover:bg-indigo-100'
          : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {message.teacherAvatar ? (
            <img
              src={message.teacherAvatar}
              alt={`${message.teacherName}'s avatar`}
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="w-5 h-5 text-gray-500" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {message.unread && (
              <Circle className="w-2 h-2 fill-indigo-500 text-indigo-500 flex-shrink-0" />
            )}
            <span className={`text-sm truncate ${message.unread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
              {message.teacherName}
            </span>
            <span className="text-xs text-gray-400 flex-shrink-0">
              {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
            </span>
          </div>
          <p className={`text-sm truncate ${message.unread ? 'text-gray-800' : 'text-gray-600'}`}>
            {message.subject}
          </p>
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {message.preview}
          </p>
        </div>
      </div>
    </button>
  );
}

export default MessagesPreview;
