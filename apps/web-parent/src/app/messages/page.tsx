/**
 * Messages Page
 *
 * Parent-teacher messaging interface with real-time updates via WebSocket,
 * compose functionality, and browser notifications.
 *
 * Sprint 1.8: Integrated with messaging-svc
 */

'use client';

import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import {
  Send,
  Plus,
  Archive,
  Search,
  ChevronLeft,
  Check,
  CheckCheck,
  Paperclip,
  User,
  Bell,
  BellOff,
  Circle,
  X,
  Loader2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  useMessaging,
  useChildrenWithTeachers,
  useArchiveConversation,
  type Message,
  type Conversation,
  type ChildWithTeachers,
} from '@/hooks/use-messaging';
import { useMessagingNotifications } from '@/lib/notifications/messaging-notifications';

// Re-export types for ComposeModal
interface Teacher {
  id: string;
  name: string;
  avatar?: string;
  subject?: string;
}

export default function MessagesPage() {
  const { t } = useTranslation('parent');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Notification hook
  const notifications = useMessagingNotifications({
    onlyWhenHidden: true,
    playSound: true,
  });

  // TODO: Replace with actual auth context
  const userId = 'current-user';
  const authToken = 'mock-token';

  // Use the combined messaging hook with WebSocket
  const messaging = useMessaging({
    userId,
    authToken,
    includeArchived: showArchived,
    selectedConversationId,
    onNewMessage: useCallback(
      (message: Message, conversation: Conversation) => {
        // Show browser notification for new messages
        if (notifications.isEnabled && message.senderType !== 'parent') {
          notifications.showMessageNotification(message, conversation, {
            onClick: () => {
              setSelectedConversationId(conversation.id);
            },
          });
        }
      },
      [notifications]
    ),
  });

  // Children data for compose modal
  const { data: childrenData } = useChildrenWithTeachers();

  // Archive mutation
  const archiveConversation = useArchiveConversation();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messaging.messages]);

  // Mark as read when selecting conversation
  useEffect(() => {
    if (selectedConversationId) {
      messaging.selectConversation(selectedConversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [messageInput]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim() && selectedConversationId) {
      messaging.send(messageInput.trim());
      setMessageInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // Filter conversations by search query
  const filteredConversations = useMemo(() => {
    return messaging.conversations.filter((c) => {
      const conv = c as Conversation & {
        teacherName?: string;
        studentName?: string;
        subject?: string;
      };
      const lowerQuery = searchQuery.toLowerCase();
      return (
        (conv.teacherName?.toLowerCase().includes(lowerQuery) ?? false) ||
        (conv.subject?.toLowerCase().includes(lowerQuery) ?? false) ||
        (conv.studentName?.toLowerCase().includes(lowerQuery) ?? false)
      );
    });
  }, [messaging.conversations, searchQuery]);

  // Get typing indicators for current conversation
  const typingIndicator = selectedConversationId
    ? messaging.getTypingIndicator(selectedConversationId)
    : undefined;
  const typingIndicators = typingIndicator ? [typingIndicator] : [];

  const selectedConversationData = messaging.selectedConversation;
  const unreadTotal = messaging.totalUnread;

  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  // Group messages by date
  const groupedMessages = useMemo(() => {
    return messaging.messages.reduce<{ date: string; messages: Message[] }[]>((groups, message) => {
      const date = formatMessageDate(message.sentAt);
      const lastGroup = groups[groups.length - 1];

      if (lastGroup?.date === date) {
        lastGroup.messages.push(message);
      } else {
        groups.push({ date, messages: [message] });
      }

      return groups;
    }, []);
  }, [messaging.messages]);

  return (
    <main id="main-content" className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{t('messages.title', 'Messages')}</h1>
          {unreadTotal > 0 && (
            <span className="px-2.5 py-1 bg-violet-100 text-violet-700 text-sm font-semibold rounded-full">
              {unreadTotal} unread
            </span>
          )}
          {/* WebSocket Connection Indicator */}
          <span
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
              messaging.isConnected ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}
            title={messaging.isConnected ? 'Real-time updates active' : 'Reconnecting...'}
          >
            {messaging.isConnected ? (
              <>
                <Wifi className="w-3 h-3" />
                <span className="hidden sm:inline">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3" />
                <span className="hidden sm:inline">Offline</span>
              </>
            )}
          </span>
        </div>
        <button
          onClick={
            notifications.isEnabled ? undefined : () => void notifications.requestPermission()
          }
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            notifications.isEnabled
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          title={notifications.isEnabled ? 'Notifications enabled' : 'Enable notifications'}
        >
          {notifications.isEnabled ? (
            <>
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifications On</span>
            </>
          ) : (
            <>
              <BellOff className="w-4 h-4" />
              <span className="hidden sm:inline">Enable Notifications</span>
            </>
          )}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex h-[calc(100vh-200px)] min-h-[500px]">
          {/* Conversation List */}
          <div
            className={`w-full md:w-96 border-r border-gray-100 flex flex-col ${
              selectedConversationId ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Search & New Message */}
            <div className="p-4 border-b border-gray-100">
              <button
                onClick={() => {
                  setShowCompose(true);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium mb-3"
              >
                <Plus className="w-4 h-4" />
                {t('messages.newMessage', 'New Message')}
              </button>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                  }}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => {
                    setShowArchived(false);
                  }}
                  className={`flex-1 py-1.5 text-sm rounded-lg transition-colors ${
                    !showArchived
                      ? 'bg-violet-100 text-violet-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Inbox
                </button>
                <button
                  onClick={() => {
                    setShowArchived(true);
                  }}
                  className={`flex-1 py-1.5 text-sm rounded-lg transition-colors ${
                    showArchived
                      ? 'bg-violet-100 text-violet-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Archived
                </button>
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
              {messaging.conversationsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 text-violet-600 animate-spin" />
                </div>
              ) : filteredConversations?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <User className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 mb-4">
                    {searchQuery
                      ? 'No conversations found'
                      : showArchived
                        ? 'No archived conversations'
                        : 'No messages yet'}
                  </p>
                  {!showArchived && !searchQuery && (
                    <button
                      onClick={() => {
                        setShowCompose(true);
                      }}
                      className="text-violet-600 hover:text-violet-700 font-medium"
                    >
                      Start a conversation
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredConversations?.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => {
                        setSelectedConversationId(conversation.id);
                      }}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                        selectedConversationId === conversation.id
                          ? 'bg-violet-50 border-l-4 border-violet-500'
                          : conversation.unreadCount > 0
                            ? 'bg-violet-50/50'
                            : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          {(conversation as Conversation & { teacherAvatar?: string })
                            .teacherAvatar ? (
                            <img
                              src={
                                (conversation as Conversation & { teacherAvatar?: string })
                                  .teacherAvatar
                              }
                              alt={
                                (conversation as Conversation & { teacherName: string }).teacherName
                              }
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center">
                              <span className="text-white font-semibold">
                                {(
                                  conversation as Conversation & { teacherName: string }
                                ).teacherName?.charAt(0)}
                              </span>
                            </div>
                          )}
                          {conversation.unreadCount > 0 && (
                            <Circle className="absolute -top-1 -right-1 w-4 h-4 fill-violet-500 text-violet-500" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p
                              className={`font-medium truncate ${
                                conversation.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'
                              }`}
                            >
                              {(conversation as Conversation & { teacherName: string }).teacherName}
                            </p>
                            {conversation.lastMessageAt && (
                              <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                                {formatDistanceToNow(new Date(conversation.lastMessageAt), {
                                  addSuffix: true,
                                })}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                              {(conversation as Conversation & { studentName: string }).studentName}
                            </span>
                            {(conversation as Conversation & { teacherSubject?: string })
                              .teacherSubject && (
                              <span className="text-xs px-1.5 py-0.5 bg-violet-100 text-violet-600 rounded">
                                {
                                  (conversation as Conversation & { teacherSubject?: string })
                                    .teacherSubject
                                }
                              </span>
                            )}
                          </div>
                          {conversation.lastMessage && (
                            <p
                              className={`text-sm truncate ${
                                conversation.unreadCount > 0 ? 'text-gray-800' : 'text-gray-500'
                              }`}
                            >
                              {conversation.lastMessage}
                            </p>
                          )}
                          {conversation.unreadCount > 0 && (
                            <span className="inline-flex items-center justify-center mt-1 px-2 py-0.5 text-xs font-semibold bg-violet-600 text-white rounded-full">
                              {conversation.unreadCount} new
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Message Thread */}
          <div
            className={`flex-1 flex flex-col bg-gray-50 ${
              !selectedConversationId ? 'hidden md:flex' : 'flex'
            }`}
          >
            {selectedConversationId && selectedConversationData ? (
              <>
                {/* Header */}
                <div className="p-4 border-b border-gray-200 bg-white flex items-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedConversationId(null);
                    }}
                    className="md:hidden p-2 -ml-2 hover:bg-gray-100 rounded-lg"
                    aria-label="Back to conversations"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  {(selectedConversationData as Conversation & { teacherAvatar?: string })
                    .teacherAvatar ? (
                    <img
                      src={
                        (selectedConversationData as Conversation & { teacherAvatar?: string })
                          .teacherAvatar
                      }
                      alt={
                        (selectedConversationData as Conversation & { teacherName: string })
                          .teacherName
                      }
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {(
                          selectedConversationData as Conversation & { teacherName: string }
                        ).teacherName?.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="flex-1">
                    <h2 className="font-semibold text-gray-900">
                      {
                        (selectedConversationData as Conversation & { teacherName: string })
                          .teacherName
                      }
                    </h2>
                    <p className="text-sm text-gray-500">
                      {(selectedConversationData as Conversation & { teacherSubject?: string })
                        .teacherSubject &&
                        `${(selectedConversationData as Conversation & { teacherSubject?: string }).teacherSubject} - `}
                      {
                        (selectedConversationData as Conversation & { studentName: string })
                          .studentName
                      }
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (selectedConversationId) {
                        archiveConversation.mutate(selectedConversationId);
                        setSelectedConversationId(null);
                      }
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                    aria-label="Archive conversation"
                  >
                    <Archive className="w-5 h-5" />
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {messaging.messagesLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-6 h-6 text-violet-600 animate-spin" />
                    </div>
                  ) : (
                    <>
                      {groupedMessages.map((group, groupIndex) => (
                        <div key={groupIndex}>
                          {/* Date Separator */}
                          <div className="flex items-center gap-4 mb-4">
                            <div className="flex-1 border-t border-gray-200" />
                            <span className="text-xs text-gray-500 font-medium">{group.date}</span>
                            <div className="flex-1 border-t border-gray-200" />
                          </div>

                          {/* Messages */}
                          <div className="space-y-3">
                            {group.messages.map((message: Message) => (
                              <div
                                key={message.id}
                                className={`flex ${
                                  message.senderType === 'parent' ? 'justify-end' : 'justify-start'
                                }`}
                              >
                                <div
                                  className={`flex items-end gap-2 max-w-[75%] ${
                                    message.senderType === 'parent' ? 'flex-row-reverse' : ''
                                  }`}
                                >
                                  {/* Avatar (only for received messages) */}
                                  {message.senderType === 'teacher' && (
                                    <div className="flex-shrink-0">
                                      {message.senderAvatar ? (
                                        <img
                                          src={message.senderAvatar}
                                          alt={message.senderName}
                                          className="w-8 h-8 rounded-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center">
                                          <span className="text-white text-xs font-medium">
                                            {message.senderName.charAt(0)}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  <div>
                                    {/* Sender Name (only for received messages) */}
                                    {message.senderType === 'teacher' && (
                                      <span className="text-xs text-gray-500 mb-1 block ml-1">
                                        {message.senderName}
                                      </span>
                                    )}

                                    {/* Message Bubble */}
                                    <div
                                      className={`px-4 py-2.5 rounded-2xl ${
                                        message.senderType === 'parent'
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
                                                message.senderType === 'parent'
                                                  ? 'text-violet-200 hover:text-white'
                                                  : 'text-violet-600 hover:text-violet-700'
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
                                        message.senderType === 'parent'
                                          ? 'justify-end mr-1'
                                          : 'ml-1'
                                      }`}
                                    >
                                      <span className="text-xs text-gray-400">
                                        {format(new Date(message.sentAt), 'h:mm a')}
                                      </span>
                                      {message.senderType === 'parent' &&
                                        (message.readAt ? (
                                          <CheckCheck className="w-3.5 h-3.5 text-violet-500" />
                                        ) : (
                                          <Check className="w-3.5 h-3.5 text-gray-400" />
                                        ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      {/* Typing Indicators */}
                      {typingIndicators.length > 0 && (
                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                          <div className="flex gap-1">
                            <span
                              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                              style={{ animationDelay: '0ms' }}
                            />
                            <span
                              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                              style={{ animationDelay: '150ms' }}
                            />
                            <span
                              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                              style={{ animationDelay: '300ms' }}
                            />
                          </div>
                          <span>
                            {typingIndicators.map((t) => t.participantName ?? 'Someone').join(', ')}{' '}
                            {typingIndicators.length === 1 ? 'is' : 'are'} typing...
                          </span>
                        </div>
                      )}

                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Message Input */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-4 border-t border-gray-200 bg-white"
                >
                  <div className="flex items-end gap-3">
                    <div className="flex-1 relative">
                      <textarea
                        ref={textareaRef}
                        value={messageInput}
                        onChange={(e) => {
                          setMessageInput(e.target.value);
                          // Send typing indicator
                          if (selectedConversationId) {
                            messaging.sendTypingIndicator(selectedConversationId);
                          }
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        rows={1}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        disabled={messaging.isSending}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!messageInput.trim() || messaging.isSending}
                      className="p-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      aria-label="Send message"
                    >
                      {messaging.isSending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <User className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-lg font-medium mb-2">Select a conversation</p>
                <p className="text-sm text-gray-400 mb-4">
                  Choose a conversation from the list or start a new one
                </p>
                <button
                  onClick={() => {
                    setShowCompose(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Message
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <ComposeModal
          childrenList={childrenData || []}
          onClose={() => {
            setShowCompose(false);
          }}
          onSend={async (data) => {
            const result = await messaging.createConversation({
              participantIds: [data.teacherId],
              studentContext: {
                studentId: data.childId,
                studentName: '', // Will be resolved by API
              },
              subject: data.subject,
              initialMessage: data.content,
            });
            setShowCompose(false);
            setSelectedConversationId(result.id);
          }}
          isLoading={messaging.isCreating}
        />
      )}
    </main>
  );
}

// Compose Modal Component
function ComposeModal({
  childrenList,
  onClose,
  onSend,
  isLoading,
}: {
  childrenList: ChildWithTeachers[];
  onClose: () => void;
  onSend: (data: {
    teacherId: string;
    childId: string;
    subject: string;
    content: string;
  }) => Promise<void>;
  isLoading?: boolean;
}) {
  const [selectedChild, setSelectedChild] = useState<ChildWithTeachers | null>(
    childrenList.length === 1 ? childrenList[0] : null
  );
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const teachers = selectedChild?.teachers || [];
  const filteredTeachers = teachers.filter(
    (teacher) =>
      teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.subject?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedTeacher || !selectedChild || !subject.trim() || !content.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      await onSend({
        teacherId: selectedTeacher.id,
        childId: selectedChild.id,
        subject: subject.trim(),
        content: content.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="compose-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 id="compose-title" className="text-xl font-semibold text-gray-900">
            New Message
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Child Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Child</label>
              <div className="grid grid-cols-2 gap-2">
                {childrenList.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => {
                      setSelectedChild(child);
                      setSelectedTeacher(null);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      selectedChild?.id === child.id
                        ? 'border-violet-500 bg-violet-50'
                        : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50/50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">{child.name}</p>
                      {child.grade && <p className="text-xs text-gray-500">Grade {child.grade}</p>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Teacher Selector */}
            {selectedChild && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Teacher
                </label>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                    }}
                    placeholder="Search teachers..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                  />
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {filteredTeachers.length > 0 ? (
                    filteredTeachers.map((teacher) => (
                      <button
                        key={teacher.id}
                        type="button"
                        onClick={() => {
                          setSelectedTeacher(teacher);
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          selectedTeacher?.id === teacher.id
                            ? 'border-violet-500 bg-violet-50'
                            : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50/50'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center">
                          <span className="text-white font-medium">{teacher.name.charAt(0)}</span>
                        </div>
                        <div className="text-left flex-1">
                          <p className="text-sm font-medium text-gray-900">{teacher.name}</p>
                          {teacher.subject && (
                            <p className="text-xs text-gray-500">{teacher.subject}</p>
                          )}
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                      {searchQuery
                        ? 'No teachers found matching your search'
                        : 'No teachers available'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Subject */}
            {selectedTeacher && (
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <input
                  id="subject"
                  type="text"
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                  }}
                  placeholder="What's this message about?"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Message Content */}
            {selectedTeacher && (
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                  }}
                  placeholder="Type your message here..."
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedTeacher || !subject.trim() || !content.trim() || isLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Message
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
