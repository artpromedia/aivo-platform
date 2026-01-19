/**
 * Message List Component
 *
 * Displays a list of conversations with teachers, showing
 * the latest message, unread status, and child information.
 */

'use client';

import { User, Circle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface Conversation {
  id: string;
  teacher: {
    id: string;
    name: string;
    avatar?: string;
    subject?: string;
  };
  child: {
    id: string;
    name: string;
  };
  lastMessage: {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
    isRead: boolean;
  };
  unreadCount: number;
  updatedAt: string;
}

interface MessageListProps {
  conversations: Conversation[];
  selected: Conversation | null;
  onSelect: (conversation: Conversation) => void;
  isLoading?: boolean;
}

export function MessageList({
  conversations,
  selected,
  onSelect,
  isLoading,
}: MessageListProps) {
  if (isLoading) {
    return (
      <div className="divide-y divide-gray-100">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-200" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-3/4 mb-1" />
                <div className="h-3 bg-gray-200 rounded w-1/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <User className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          No conversations yet
        </h3>
        <p className="text-sm text-gray-500 max-w-xs">
          Start a conversation with your child&apos;s teacher using the &quot;New Message&quot; button.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100 overflow-y-auto">
      {conversations.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          conversation={conversation}
          isSelected={selected?.id === conversation.id}
          onClick={() => onSelect(conversation)}
        />
      ))}
    </div>
  );
}

function ConversationItem({
  conversation,
  isSelected,
  onClick,
}: {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}) {
  const hasUnread = conversation.unreadCount > 0;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-violet-500 ${
        isSelected
          ? 'bg-violet-50 border-l-4 border-violet-500'
          : hasUnread
            ? 'bg-violet-50/50 hover:bg-violet-50'
            : 'hover:bg-gray-50'
      }`}
      aria-selected={isSelected}
    >
      <div className="flex items-start gap-3">
        {/* Teacher Avatar */}
        <div className="relative flex-shrink-0">
          {conversation.teacher.avatar ? (
            <img
              src={conversation.teacher.avatar}
              alt={`${conversation.teacher.name}'s avatar`}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center">
              <span className="text-white font-semibold text-lg">
                {conversation.teacher.name.charAt(0)}
              </span>
            </div>
          )}
          {hasUnread && (
            <Circle className="absolute -top-1 -right-1 w-4 h-4 fill-violet-500 text-violet-500" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span
              className={`text-sm truncate ${
                hasUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
              }`}
            >
              {conversation.teacher.name}
            </span>
            <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
              {formatDistanceToNow(new Date(conversation.updatedAt), {
                addSuffix: true,
              })}
            </span>
          </div>

          {/* Child Badge */}
          <div className="mb-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
              {conversation.child.name}
            </span>
            {conversation.teacher.subject && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-violet-100 text-violet-700 ml-1">
                {conversation.teacher.subject}
              </span>
            )}
          </div>

          {/* Message Preview */}
          <p
            className={`text-sm truncate ${
              hasUnread ? 'text-gray-800' : 'text-gray-500'
            }`}
          >
            {conversation.lastMessage.content}
          </p>

          {/* Unread Count */}
          {hasUnread && (
            <div className="mt-2">
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-500 text-white">
                {conversation.unreadCount} new
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

export default MessageList;
