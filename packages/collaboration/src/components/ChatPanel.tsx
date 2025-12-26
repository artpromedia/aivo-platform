/**
 * ChatPanel Component
 *
 * Real-time chat interface with:
 * - Message list
 * - Typing indicators
 * - Reactions
 * - Threaded replies
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  CSSProperties,
} from 'react';
import type { ChatMessage, ChatReaction, TypingUser } from '../types';
import { TypingIndicator } from './TypingIndicator';

interface ChatPanelProps {
  messages: ChatMessage[];
  typingUsers: TypingUser[];
  currentUserId: string;
  isLoading: boolean;
  hasMore: boolean;
  onSendMessage: (content: string) => void;
  onLoadMore: () => void;
  onReaction: (messageId: string, emoji: string) => void;
  onTyping: (isTyping: boolean) => void;
  placeholder?: string;
  emptyMessage?: string;
}

interface MessageProps {
  message: ChatMessage;
  currentUserId: string;
  onReaction: (emoji: string) => void;
  showAvatar: boolean;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

function formatMessageTime(date: Date): string {
  return new Date(date).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Individual message component
const Message: React.FC<MessageProps> = ({
  message,
  currentUserId,
  onReaction,
  showAvatar,
}) => {
  const [showReactions, setShowReactions] = useState(false);
  const isOwn = message.userId === currentUserId;

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: isOwn ? 'row-reverse' : 'row',
    gap: 8,
    marginBottom: 4,
    padding: '2px 16px',
    alignItems: 'flex-end',
  };

  const avatarStyle: CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: '50%',
    backgroundColor: '#E5E7EB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 600,
    color: '#6B7280',
    flexShrink: 0,
    overflow: 'hidden',
    visibility: showAvatar ? 'visible' : 'hidden',
  };

  const bubbleStyle: CSSProperties = {
    maxWidth: '70%',
    padding: '8px 12px',
    borderRadius: 16,
    backgroundColor: isOwn ? '#3B82F6' : '#F3F4F6',
    color: isOwn ? 'white' : '#1F2937',
    fontSize: 14,
    lineHeight: 1.4,
    position: 'relative',
    ...(isOwn
      ? { borderBottomRightRadius: 4 }
      : { borderBottomLeftRadius: 4 }),
  };

  const deletedStyle: CSSProperties = {
    ...bubbleStyle,
    fontStyle: 'italic',
    color: '#9CA3AF',
    backgroundColor: '#F9FAFB',
  };

  const nameStyle: CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: '#6B7280',
    marginBottom: 2,
  };

  const timeStyle: CSSProperties = {
    fontSize: 10,
    color: isOwn ? 'rgba(255,255,255,0.7)' : '#9CA3AF',
    marginTop: 2,
  };

  const reactionsContainerStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  };

  const reactionStyle = (hasReacted: boolean): CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 6px',
    borderRadius: 12,
    fontSize: 12,
    backgroundColor: hasReacted ? '#DBEAFE' : '#F3F4F6',
    border: hasReacted ? '1px solid #3B82F6' : '1px solid transparent',
    cursor: 'pointer',
    transition: 'all 150ms ease',
  });

  const reactionPickerStyle: CSSProperties = {
    position: 'absolute',
    bottom: '100%',
    [isOwn ? 'right' : 'left']: 0,
    display: 'flex',
    gap: 4,
    padding: 8,
    backgroundColor: 'white',
    borderRadius: 24,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    marginBottom: 4,
    zIndex: 100,
  };

  if (message.deleted) {
    return (
      <div style={containerStyle}>
        <div style={avatarStyle} />
        <div style={deletedStyle}>This message was deleted</div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={avatarStyle}>
        {message.avatarUrl ? (
          <img
            src={message.avatarUrl}
            alt={message.displayName}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          getInitials(message.displayName)
        )}
      </div>
      <div>
        {!isOwn && showAvatar && (
          <div style={nameStyle}>{message.displayName}</div>
        )}
        <div
          style={bubbleStyle}
          onMouseEnter={() => setShowReactions(true)}
          onMouseLeave={() => setShowReactions(false)}
        >
          {message.content}
          <div style={timeStyle}>
            {formatMessageTime(new Date(message.createdAt))}
            {message.edited && ' (edited)'}
          </div>

          {showReactions && (
            <div style={reactionPickerStyle}>
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => onReaction(emoji)}
                  style={{
                    fontSize: 16,
                    padding: 4,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: 4,
                    transition: 'background-color 150ms ease',
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {message.reactions.length > 0 && (
          <div style={reactionsContainerStyle}>
            {message.reactions.map((reaction) => (
              <button
                key={reaction.emoji}
                style={reactionStyle(reaction.userIds.includes(currentUserId))}
                onClick={() => onReaction(reaction.emoji)}
              >
                <span>{reaction.emoji}</span>
                <span>{reaction.userIds.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  typingUsers,
  currentUserId,
  isLoading,
  hasMore,
  onSendMessage,
  onLoadMore,
  onReaction,
  onTyping,
  placeholder = 'Type a message...',
  emptyMessage = 'No messages yet. Start the conversation!',
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isAtBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAtBottom]);

  // Handle scroll to detect if at bottom
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsAtBottom(atBottom);

    // Load more when scrolled to top
    if (scrollTop < 50 && hasMore && !isLoading) {
      onLoadMore();
    }
  }, [hasMore, isLoading, onLoadMore]);

  // Handle input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value);
      onTyping(value.length > 0);
    },
    [onTyping]
  );

  // Handle send
  const handleSend = useCallback(() => {
    const content = inputValue.trim();
    if (!content) return;

    onSendMessage(content);
    setInputValue('');
    onTyping(false);
    inputRef.current?.focus();
  }, [inputValue, onSendMessage, onTyping]);

  // Handle key press
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Determine if we should show avatar for a message
  const shouldShowAvatar = useCallback(
    (index: number): boolean => {
      if (index === messages.length - 1) return true;
      const current = messages[index];
      const next = messages[index + 1];
      return current.userId !== next.userId;
    },
    [messages]
  );

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 8,
    border: '1px solid #E5E7EB',
    overflow: 'hidden',
  };

  const messagesStyle: CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 0',
  };

  const emptyStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    padding: 32,
  };

  const inputContainerStyle: CSSProperties = {
    display: 'flex',
    gap: 8,
    padding: 16,
    borderTop: '1px solid #E5E7EB',
    backgroundColor: '#F9FAFB',
  };

  const inputStyle: CSSProperties = {
    flex: 1,
    padding: '10px 16px',
    borderRadius: 24,
    border: '1px solid #E5E7EB',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 150ms ease',
  };

  const sendButtonStyle: CSSProperties = {
    width: 40,
    height: 40,
    borderRadius: '50%',
    backgroundColor: inputValue.trim() ? '#3B82F6' : '#E5E7EB',
    color: inputValue.trim() ? 'white' : '#9CA3AF',
    border: 'none',
    cursor: inputValue.trim() ? 'pointer' : 'default',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    transition: 'all 150ms ease',
  };

  const loadingStyle: CSSProperties = {
    textAlign: 'center',
    padding: 12,
    color: '#6B7280',
    fontSize: 13,
  };

  return (
    <div style={containerStyle}>
      <div
        ref={messagesContainerRef}
        style={messagesStyle}
        onScroll={handleScroll}
      >
        {isLoading && <div style={loadingStyle}>Loading messages...</div>}

        {messages.length === 0 && !isLoading ? (
          <div style={emptyStyle}>{emptyMessage}</div>
        ) : (
          <>
            {messages.map((message, index) => (
              <Message
                key={message.id}
                message={message}
                currentUserId={currentUserId}
                onReaction={(emoji) => onReaction(message.id, emoji)}
                showAvatar={shouldShowAvatar(index)}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}

        {typingUsers.length > 0 && (
          <div style={{ padding: '8px 16px' }}>
            <TypingIndicator users={typingUsers} />
          </div>
        )}
      </div>

      <div style={inputContainerStyle}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          style={inputStyle}
        />
        <button
          onClick={handleSend}
          disabled={!inputValue.trim()}
          style={sendButtonStyle}
          aria-label="Send message"
        >
          ➤
        </button>
      </div>
    </div>
  );
};
