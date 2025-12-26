'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import {
  Send,
  Plus,
  Archive,
  Search,
  ChevronLeft,
  AlertTriangle,
  Check,
  CheckCheck,
} from 'lucide-react';
import { api } from '@/lib/api';

interface Message {
  id: string;
  senderId: string;
  senderType: 'parent' | 'teacher';
  senderName: string;
  content: string;
  sentAt: string;
  readAt?: string;
}

interface Conversation {
  id: string;
  teacherId: string;
  teacherName: string;
  studentId: string;
  studentName: string;
  subject: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  archived: boolean;
}

export default function MessagesPage() {
  const { t } = useTranslation('parent');
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ['conversations', { includeArchived: showArchived }],
    queryFn: () =>
      api.get<Conversation[]>(`/messages/conversations?includeArchived=${showArchived}`),
  });

  // Fetch messages for selected conversation
  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', selectedConversation],
    queryFn: () =>
      api.get<{ messages: Message[]; conversation: Conversation }>(
        `/messages/conversations/${selectedConversation}`
      ),
    enabled: !!selectedConversation,
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: (content: string) =>
      api.post(`/messages/conversations/${selectedConversation}/messages`, { content }),
    onSuccess: () => {
      setMessageInput('');
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  // Mark as read mutation
  const markAsRead = useMutation({
    mutationFn: (conversationId: string) =>
      api.put(`/messages/conversations/${conversationId}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
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
  }, [selectedConversation]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim() && selectedConversation) {
      sendMessage.mutate(messageInput.trim());
    }
  };

  const filteredConversations = conversations?.filter((c) =>
    c.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.studentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedConversationData = messagesData?.conversation;

  return (
    <main id="main-content" className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('messages.title')}</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex h-[600px]">
          {/* Conversation List */}
          <div
            className={`w-full md:w-80 border-r border-gray-100 flex flex-col ${
              selectedConversation ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Search */}
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => setShowArchived(false)}
                  className={`flex-1 py-1.5 text-sm rounded-lg transition-colors ${
                    !showArchived
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {t('messages.unread')}
                </button>
                <button
                  onClick={() => setShowArchived(true)}
                  className={`flex-1 py-1.5 text-sm rounded-lg transition-colors ${
                    showArchived
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {t('messages.archived')}
                </button>
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
              {conversationsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
                </div>
              ) : filteredConversations?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {t('messages.noMessages')}
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredConversations?.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation.id)}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                        selectedConversation === conversation.id ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {conversation.teacherName}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {conversation.studentName} • {conversation.subject}
                          </p>
                          {conversation.lastMessage && (
                            <p className="text-sm text-gray-600 truncate mt-1">
                              {conversation.lastMessage}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end ml-2">
                          {conversation.lastMessageAt && (
                            <span className="text-xs text-gray-400">
                              {formatDistanceToNow(new Date(conversation.lastMessageAt), {
                                addSuffix: true,
                              })}
                            </span>
                          )}
                          {conversation.unreadCount > 0 && (
                            <span className="mt-1 px-2 py-0.5 bg-indigo-600 text-white text-xs rounded-full">
                              {conversation.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* New Conversation Button */}
            <div className="p-4 border-t border-gray-100">
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                <Plus className="w-4 h-4" />
                {t('messages.newConversation')}
              </button>
            </div>
          </div>

          {/* Message Thread */}
          <div
            className={`flex-1 flex flex-col ${
              !selectedConversation ? 'hidden md:flex' : 'flex'
            }`}
          >
            {selectedConversation && selectedConversationData ? (
              <>
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="md:hidden p-2 -ml-2 hover:bg-gray-100 rounded-lg"
                    aria-label="Back to conversations"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex-1">
                    <h2 className="font-medium text-gray-900">
                      {selectedConversationData.teacherName}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {selectedConversationData.studentName} •{' '}
                      {selectedConversationData.subject}
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
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
                    </div>
                  ) : (
                    <>
                      {messagesData?.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.senderType === 'parent' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                              message.senderType === 'parent'
                                ? 'bg-indigo-600 text-white rounded-br-none'
                                : 'bg-gray-100 text-gray-900 rounded-bl-none'
                            }`}
                          >
                            <p>{message.content}</p>
                            <div
                              className={`flex items-center gap-1 mt-1 text-xs ${
                                message.senderType === 'parent'
                                  ? 'text-indigo-200'
                                  : 'text-gray-400'
                              }`}
                            >
                              <span>
                                {formatDistanceToNow(new Date(message.sentAt), {
                                  addSuffix: true,
                                })}
                              </span>
                              {message.senderType === 'parent' && (
                                <span>
                                  {message.readAt ? (
                                    <CheckCheck className="w-3.5 h-3.5" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5" />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder={t('messages.typeMessage')}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <button
                      type="submit"
                      disabled={!messageInput.trim() || sendMessage.isPending}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={t('messages.send')}
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                {t('messages.noMessages')}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
