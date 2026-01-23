/**
 * Messages Page
 *
 * Parent-teacher messaging interface with real-time updates,
 * compose functionality, and browser notifications.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
} from 'lucide-react';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { api, isDevMode } from '@/lib/api';

interface Message {
  id: string;
  senderId: string;
  senderType: 'parent' | 'teacher';
  senderName: string;
  senderAvatar?: string;
  content: string;
  sentAt: string;
  readAt?: string;
  attachments?: {
    id: string;
    name: string;
    url: string;
    type: string;
  }[];
}

interface Conversation {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherAvatar?: string;
  teacherSubject?: string;
  studentId: string;
  studentName: string;
  subject: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  archived: boolean;
}

interface Teacher {
  id: string;
  name: string;
  avatar?: string;
  subject?: string;
}

interface Child {
  id: string;
  name: string;
  grade?: string;
  teachers?: Teacher[];
}

// Mock data for development
function getMockConversations(): Conversation[] {
  return [
    {
      id: 'conv-1',
      teacherId: 'teacher-1',
      teacherName: 'Mrs. Anderson',
      teacherSubject: 'Math',
      studentId: 'student-1',
      studentName: 'Emma',
      subject: 'Great progress this week!',
      lastMessage: 'Emma has been showing excellent progress in fractions...',
      lastMessageAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      unreadCount: 2,
      archived: false,
    },
    {
      id: 'conv-2',
      teacherId: 'teacher-2',
      teacherName: 'Mr. Chen',
      teacherSubject: 'Science',
      studentId: 'student-1',
      studentName: 'Emma',
      subject: 'Science Fair Project',
      lastMessage: 'Just a reminder about the upcoming science fair...',
      lastMessageAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      unreadCount: 0,
      archived: false,
    },
    {
      id: 'conv-3',
      teacherId: 'teacher-1',
      teacherName: 'Mrs. Anderson',
      teacherSubject: 'Math',
      studentId: 'student-2',
      studentName: 'Noah',
      subject: 'Parent-Teacher Conference',
      lastMessage: "I'd like to schedule a brief conference...",
      lastMessageAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      unreadCount: 0,
      archived: false,
    },
  ];
}

function getMockMessages(_conversationId: string): Message[] {
  const baseMessages: Message[] = [
    {
      id: 'msg-1',
      senderId: 'teacher-1',
      senderType: 'teacher',
      senderName: 'Mrs. Anderson',
      content: "Hello! I wanted to share some updates about Emma's progress in class.",
      sentAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      readAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'msg-2',
      senderId: 'teacher-1',
      senderType: 'teacher',
      senderName: 'Mrs. Anderson',
      content:
        'Emma has been showing excellent progress in fractions. She helped other students understand the concept today!',
      sentAt: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'msg-3',
      senderId: 'parent-1',
      senderType: 'parent',
      senderName: 'Sarah Johnson',
      content: "Thank you so much for letting me know! We've been practicing at home.",
      sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      readAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
    },
  ];

  return baseMessages;
}

function getMockChildren(): Child[] {
  return [
    {
      id: 'student-1',
      name: 'Emma',
      grade: '4',
      teachers: [
        { id: 'teacher-1', name: 'Mrs. Anderson', subject: 'Math' },
        { id: 'teacher-2', name: 'Mr. Chen', subject: 'Science' },
        { id: 'teacher-3', name: 'Ms. Williams', subject: 'Reading' },
      ],
    },
    {
      id: 'student-2',
      name: 'Noah',
      grade: '2',
      teachers: [{ id: 'teacher-4', name: 'Mrs. Brown', subject: 'General' }],
    },
  ];
}

export default function MessagesPage() {
  const { t } = useTranslation('parent');
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  // Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
    }
  };

  // Show browser notification
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const showNotification = useCallback(
    (title: string, body: string) => {
      if (notificationsEnabled && 'Notification' in window) {
        new Notification(title, {
          body: body.substring(0, 100),
          icon: '/icon.png',
          badge: '/badge.png',
        });
      }
    },
    [notificationsEnabled]
  );

  // Fetch conversations
  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ['conversations', { includeArchived: showArchived }],
    queryFn: async () => {
      try {
        const data = await api.get<Conversation[]>(
          `/messages/conversations?includeArchived=${showArchived}`
        );
        return data;
      } catch (error) {
        if (isDevMode()) {
          console.warn('[DEV] Using mock conversations data');
          return getMockConversations();
        }
        throw error;
      }
    },
    refetchInterval: 30000, // Poll every 30 seconds for real-time updates
    retry: isDevMode() ? 0 : 3,
  });

  // Fetch messages for selected conversation
  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', selectedConversation],
    queryFn: async () => {
      if (!selectedConversation) return null;
      try {
        const data = await api.get<{ messages: Message[]; conversation: Conversation }>(
          `/messages/conversations/${selectedConversation}`
        );
        return data;
      } catch (error) {
        if (isDevMode()) {
          console.warn('[DEV] Using mock messages data');
          const conv = getMockConversations().find((c) => c.id === selectedConversation);
          return {
            messages: getMockMessages(selectedConversation),
            conversation: conv || getMockConversations()[0],
          };
        }
        throw error;
      }
    },
    enabled: !!selectedConversation,
    refetchInterval: 10000, // Poll every 10 seconds for real-time messages
    retry: isDevMode() ? 0 : 3,
  });

  // Fetch children for compose modal
  const { data: children } = useQuery({
    queryKey: ['children-with-teachers'],
    queryFn: async () => {
      try {
        const data = await api.get<Child[]>('/parent/children/with-teachers');
        return data;
      } catch (error) {
        if (isDevMode()) {
          console.warn('[DEV] Using mock children data');
          return getMockChildren();
        }
        throw error;
      }
    },
    retry: isDevMode() ? 0 : 3,
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (isDevMode()) {
        // Simulate API delay in dev mode
        await new Promise((resolve) => setTimeout(resolve, 500));
        return { success: true };
      }
      return api.post(`/messages/conversations/${selectedConversation}/messages`, { content });
    },
    onSuccess: () => {
      setMessageInput('');
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  // Mark as read mutation
  const markAsRead = useMutation({
    mutationFn: async (conversationId: string) => {
      if (isDevMode()) {
        return { success: true };
      }
      return api.put(`/messages/conversations/${conversationId}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  // Create new conversation mutation
  const createConversation = useMutation({
    mutationFn: async (data: {
      teacherId: string;
      childId: string;
      subject: string;
      content: string;
    }) => {
      if (isDevMode()) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return { conversationId: `conv-${Date.now()}` };
      }
      return api.post<{ conversationId: string }>('/messages/conversations', data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setShowCompose(false);
      setSelectedConversation(data.conversationId);
    },
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData?.messages]);

  // Mark as read when selecting conversation
  useEffect(() => {
    if (selectedConversation) {
      markAsRead.mutate(selectedConversation);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [messageInput]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim() && selectedConversation) {
      sendMessage.mutate(messageInput.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const filteredConversations = conversations?.filter(
    (c) =>
      c.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.studentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedConversationData = messagesData?.conversation;
  const unreadTotal = conversations?.reduce((sum, c) => sum + c.unreadCount, 0) || 0;

  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  // Group messages by date
  const groupedMessages =
    messagesData?.messages?.reduce<{ date: string; messages: Message[] }[]>((groups, message) => {
      const date = formatMessageDate(message.sentAt);
      const lastGroup = groups[groups.length - 1];

      if (lastGroup?.date === date) {
        lastGroup.messages.push(message);
      } else {
        groups.push({ date, messages: [message] });
      }

      return groups;
    }, []) || [];

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
        </div>
        <button
          onClick={notificationsEnabled ? undefined : requestNotificationPermission}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            notificationsEnabled
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          title={notificationsEnabled ? 'Notifications enabled' : 'Enable notifications'}
        >
          {notificationsEnabled ? (
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
              selectedConversation ? 'hidden md:flex' : 'flex'
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
              {conversationsLoading ? (
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
                        setSelectedConversation(conversation.id);
                      }}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                        selectedConversation === conversation.id
                          ? 'bg-violet-50 border-l-4 border-violet-500'
                          : conversation.unreadCount > 0
                            ? 'bg-violet-50/50'
                            : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          {conversation.teacherAvatar ? (
                            <img
                              src={conversation.teacherAvatar}
                              alt={conversation.teacherName}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center">
                              <span className="text-white font-semibold">
                                {conversation.teacherName.charAt(0)}
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
                              {conversation.teacherName}
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
                              {conversation.studentName}
                            </span>
                            {conversation.teacherSubject && (
                              <span className="text-xs px-1.5 py-0.5 bg-violet-100 text-violet-600 rounded">
                                {conversation.teacherSubject}
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
              !selectedConversation ? 'hidden md:flex' : 'flex'
            }`}
          >
            {selectedConversation && selectedConversationData ? (
              <>
                {/* Header */}
                <div className="p-4 border-b border-gray-200 bg-white flex items-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedConversation(null);
                    }}
                    className="md:hidden p-2 -ml-2 hover:bg-gray-100 rounded-lg"
                    aria-label="Back to conversations"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  {selectedConversationData.teacherAvatar ? (
                    <img
                      src={selectedConversationData.teacherAvatar}
                      alt={selectedConversationData.teacherName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {selectedConversationData.teacherName.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="flex-1">
                    <h2 className="font-semibold text-gray-900">
                      {selectedConversationData.teacherName}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {selectedConversationData.teacherSubject &&
                        `${selectedConversationData.teacherSubject} - `}
                      {selectedConversationData.studentName}
                    </p>
                  </div>
                  <button
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                    aria-label="Archive conversation"
                  >
                    <Archive className="w-5 h-5" />
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {messagesLoading ? (
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
                            {group.messages.map((message) => (
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
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        rows={1}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        disabled={sendMessage.isPending}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!messageInput.trim() || sendMessage.isPending}
                      className="p-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      aria-label="Send message"
                    >
                      {sendMessage.isPending ? (
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
          childrenList={children || []}
          onClose={() => {
            setShowCompose(false);
          }}
          onSend={async (data) => {
            await createConversation.mutateAsync(data);
          }}
          isLoading={createConversation.isPending}
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
  childrenList: Child[];
  onClose: () => void;
  onSend: (data: {
    teacherId: string;
    childId: string;
    subject: string;
    content: string;
  }) => Promise<void>;
  isLoading?: boolean;
}) {
  const [selectedChild, setSelectedChild] = useState<Child | null>(
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

  const filteredTeachers =
    selectedChild?.teachers?.filter(
      (teacher) =>
        teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        teacher.subject?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

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
