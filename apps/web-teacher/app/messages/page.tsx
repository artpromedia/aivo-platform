/**
 * Teacher Messages Page
 *
 * Teacher-parent messaging interface with conversation threads,
 * compose functionality, and message history.
 *
 * Sprint 3.3: Complete messaging parity with mobile-teacher
 */

'use client';

import { format, isToday, isYesterday } from 'date-fns';
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
  Circle,
  X,
  Loader2,
  Users,
  MessageSquare,
} from 'lucide-react';
import React, { useState, useEffect, useRef, useMemo } from 'react';

import { messagesApi } from '@/lib/api/messages';
import type { Message, Conversation } from '@/lib/types/message';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface Student {
  id: string;
  name: string;
  parentName: string;
  className: string;
}

interface ConversationDetail {
  conversation: Conversation;
  messages: Message[];
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function getDateLabel(date: Date): string {
  if (isToday(date)) {
    return 'Today';
  }
  if (isYesterday(date)) {
    return 'Yesterday';
  }
  return format(date, 'MMMM d, yyyy');
}

function formatMessageTime(timestamp: Date): string {
  if (isToday(timestamp)) {
    return format(timestamp, 'h:mm a');
  }
  if (isYesterday(timestamp)) {
    return `Yesterday ${format(timestamp, 'h:mm a')}`;
  }
  return format(timestamp, 'MMM d, h:mm a');
}

function formatConversationTime(date: Date | undefined): string {
  if (!date) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return '1d ago';
  if (diffDays < 7) return `${diffDays}d ago`;
  return format(date, 'MMM d');
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function TeacherMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load conversations on mount
  useEffect(() => {
    void loadConversations();
  }, []);

  // Load conversation detail when selected
  useEffect(() => {
    if (selectedConversationId) {
      void loadConversationDetail(selectedConversationId);
    }
  }, [selectedConversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversation?.messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [messageInput]);

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const data = await messagesApi.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadConversationDetail = async (conversationId: string) => {
    try {
      const [conversationData, messagesData] = await Promise.all([
        messagesApi.getConversation(conversationId),
        messagesApi.getMessages(conversationId),
      ]);
      
      setSelectedConversation({
        conversation: conversationData,
        messages: messagesData,
      });
      
      // Mark as read
      await messagesApi.markAsRead(conversationId);
      
      // Update unread count in conversation list
      setConversations(prev =>
        prev.map(c =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c
        )
      );
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversationId) return;

    setIsSending(true);
    try {
      const newMessage = await messagesApi.send({
        conversationId: selectedConversationId,
        content: messageInput.trim(),
      });
      
      // Add message to current conversation
      setSelectedConversation(prev =>
        prev
          ? { ...prev, messages: [...prev.messages, newMessage] }
          : prev
      );
      
      // Update last message in conversation list
      setConversations(prev =>
        prev.map(c =>
          c.id === selectedConversationId
            ? { 
                ...c, 
                lastMessage: {
                  content: messageInput.trim(),
                  senderId: newMessage.senderId,
                  senderName: newMessage.senderName,
                  createdAt: newMessage.createdAt,
                },
                updatedAt: new Date(),
              }
            : c
        )
      );
      setMessageInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  // Filter conversations by search
  const filteredConversations = useMemo(() => {
    if (!searchQuery) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter(c => {
      const participantMatch = c.participants.some(p => 
        p.name.toLowerCase().includes(query)
      );
      const studentMatch = c.studentName?.toLowerCase().includes(query);
      const messageMatch = c.lastMessage?.content.toLowerCase().includes(query);
      return participantMatch || studentMatch || messageMatch;
    });
  }, [conversations, searchQuery]);

  // Calculate total unread count
  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-slate-50">
      {/* Sidebar - Conversation List */}
      <div className="flex w-80 flex-col border-r border-slate-200 bg-white">
        {/* Header */}
        <div className="border-b border-slate-200 p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-slate-600" />
              <h1 className="text-lg font-semibold text-slate-900">Messages</h1>
              {totalUnread > 0 && (
                <span className="rounded-full bg-blue-500 px-2 py-0.5 text-xs font-medium text-white">
                  {totalUnread}
                </span>
              )}
            </div>
            <button
              onClick={() => { setShowCompose(true); }}
              className="rounded-lg bg-blue-500 p-2 text-white transition-colors hover:bg-blue-600"
              aria-label="New message"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); }}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          <ConversationList
            isLoading={isLoading}
            conversations={filteredConversations}
            selectedId={selectedConversationId}
            onSelect={setSelectedConversationId}
            onCompose={() => { setShowCompose(true); }}
          />
        </div>
      </div>

      {/* Main - Conversation View */}
      <div className="flex flex-1 flex-col">
        {selectedConversation ? (
          <>
            {/* Conversation Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setSelectedConversationId(null);
                    setSelectedConversation(null);
                  }}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">
                    {selectedConversation.conversation.participants
                      .filter(p => p.role !== 'teacher')
                      .map(p => p.name)
                      .join(', ') || 'Conversation'}
                  </p>
                  {selectedConversation.conversation.studentName && (
                    <p className="text-sm text-slate-500">
                      Parent of {selectedConversation.conversation.studentName}
                      {selectedConversation.conversation.className && 
                        ` • ${selectedConversation.conversation.className}`}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="View student profile"
                >
                  <Users className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    void messagesApi.archive(selectedConversation.conversation.id);
                  }}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Archive conversation"
                >
                  <Archive className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
              <div className="mx-auto max-w-2xl space-y-4">
                {selectedConversation.messages.map((message, index) => {
                  const isTeacher = message.senderRole === 'teacher';
                  const currentMsgDate = new Date(message.createdAt);
                  const prevMsgDate = index > 0 
                    ? new Date(selectedConversation.messages[index - 1].createdAt) 
                    : null;
                  const showDate = index === 0 || 
                    (prevMsgDate && !isSameDay(currentMsgDate, prevMsgDate));

                  return (
                    <React.Fragment key={message.id}>
                      {showDate && (
                        <div className="flex justify-center">
                          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs text-slate-600">
                            {getDateLabel(currentMsgDate)}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${isTeacher ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                            isTeacher
                              ? 'bg-blue-500 text-white'
                              : 'bg-white text-slate-900 shadow-sm'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <div
                            className={`mt-1 flex items-center justify-end gap-1 text-xs ${
                              isTeacher ? 'text-blue-100' : 'text-slate-400'
                            }`}
                          >
                            <span>{formatMessageTime(new Date(message.createdAt))}</span>
                            {isTeacher && (
                              message.readBy.length > 1 ? (
                                <CheckCheck className="h-3 w-3" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Message Input */}
            <div className="border-t border-slate-200 bg-white p-4">
              <div className="mx-auto flex max-w-2xl items-end gap-2">
                <button
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Attach file"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                <div className="flex-1">
                  <textarea
                    ref={textareaRef}
                    value={messageInput}
                    onChange={(e) => { setMessageInput(e.target.value); }}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    rows={1}
                    className="max-h-32 w-full resize-none rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={() => void handleSendMessage()}
                  disabled={!messageInput.trim() || isSending}
                  className="rounded-lg bg-blue-500 p-2 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Send message"
                >
                  {isSending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 p-8">
            <div className="rounded-full bg-slate-200 p-6">
              <MessageSquare className="h-12 w-12 text-slate-400" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-slate-700">
              Select a conversation
            </h2>
            <p className="mt-2 text-center text-sm text-slate-500">
              Choose a conversation from the sidebar to view messages,
              <br />
              or start a new conversation with a parent.
            </p>
            <button
              onClick={() => { setShowCompose(true); }}
              className="mt-6 rounded-lg bg-blue-500 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-600"
            >
              New Message
            </button>
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <ComposeModal
          onClose={() => { setShowCompose(false); }}
          onSend={async () => {
            setShowCompose(false);
            void loadConversations();
          }}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CONVERSATION LIST COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

interface ConversationListProps {
  isLoading: boolean;
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCompose: () => void;
}

function ConversationList({ 
  isLoading, 
  conversations, 
  selectedId, 
  onSelect, 
  onCompose 
}: Readonly<ConversationListProps>) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-8 text-center">
        <MessageSquare className="mx-auto h-12 w-12 text-slate-300" />
        <p className="mt-2 text-sm text-slate-500">No conversations yet</p>
        <button
          onClick={onCompose}
          className="mt-4 text-sm font-medium text-blue-500 hover:text-blue-600"
        >
          Start a new conversation
        </button>
      </div>
    );
  }

  return (
    <>
      {conversations.map(conversation => {
        const otherParticipant = conversation.participants.find(p => p.role !== 'teacher');
        const participantName = otherParticipant?.name ?? 'Unknown';
        const hasUnread = conversation.unreadCount > 0;

        return (
          <button
            key={conversation.id}
            onClick={() => { onSelect(conversation.id); }}
            className={`w-full border-b border-slate-100 p-4 text-left transition-colors hover:bg-slate-50 ${
              selectedId === conversation.id ? 'bg-blue-50' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                  <User className="h-5 w-5" />
                </div>
                {hasUnread && (
                  <Circle className="absolute -right-0.5 -top-0.5 h-3 w-3 fill-blue-500 text-blue-500" />
                )}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className={`truncate text-sm ${hasUnread ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                    {participantName}
                  </p>
                  <span className="text-xs text-slate-400">
                    {formatConversationTime(conversation.lastMessage?.createdAt)}
                  </span>
                </div>
                {conversation.studentName && (
                  <p className="text-xs text-slate-500">
                    Parent of {conversation.studentName}
                  </p>
                )}
                <p className={`mt-1 truncate text-sm ${hasUnread ? 'font-medium text-slate-700' : 'text-slate-500'}`}>
                  {conversation.lastMessage?.content || 'No messages'}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPOSE MODAL
// ══════════════════════════════════════════════════════════════════════════════

interface ComposeModalProps {
  onClose: () => void;
  onSend: () => Promise<void>;
}

function ComposeModal({ onClose, onSend }: Readonly<ComposeModalProps>) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // Mock students - in production, fetch from API
  const students: Student[] = [
    { id: '1', name: 'Emma Wilson', parentName: 'Sarah Wilson', className: 'Math 101' },
    { id: '2', name: 'Jake Thompson', parentName: 'Mike Thompson', className: 'Math 101' },
    { id: '3', name: 'Olivia Martinez', parentName: 'Maria Martinez', className: 'Science 201' },
    { id: '4', name: 'Noah Johnson', parentName: 'David Johnson', className: 'English 101' },
    { id: '5', name: 'Sophia Lee', parentName: 'Jennifer Lee', className: 'Math 101' },
  ];

  const filteredStudents = students.filter(
    s =>
      s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
      s.parentName.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
      s.className.toLowerCase().includes(studentSearchQuery.toLowerCase())
  );

  const handleSend = async () => {
    if (!selectedStudentId || !message.trim()) return;
    setIsSending(true);
    try {
      // In production, create conversation and send message
      await onSend();
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-lg rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">New Message</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Student Search */}
          <div className="mb-4">
            <label htmlFor="student-search" className="mb-2 block text-sm font-medium text-slate-700">
              To (Parent of)
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="student-search"
                type="text"
                placeholder="Search students..."
                value={studentSearchQuery}
                onChange={(e) => { setStudentSearchQuery(e.target.value); }}
                className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Student List */}
          <div className="mb-4 max-h-48 overflow-y-auto rounded-lg border border-slate-200">
            {filteredStudents.map(student => (
              <button
                key={student.id}
                onClick={() => { setSelectedStudentId(student.id); }}
                className={`flex w-full items-center gap-3 border-b border-slate-100 p-3 text-left transition-colors last:border-b-0 hover:bg-slate-50 ${
                  selectedStudentId === student.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{student.name}</p>
                  <p className="text-xs text-slate-500">
                    {student.parentName} • {student.className}
                  </p>
                </div>
                {selectedStudentId === student.id && (
                  <Check className="h-4 w-4 text-blue-500" />
                )}
              </button>
            ))}
          </div>

          {/* Message Input */}
          <div className="mb-4">
            <label htmlFor="compose-message" className="mb-2 block text-sm font-medium text-slate-700">
              Message
            </label>
            <textarea
              id="compose-message"
              value={message}
              onChange={(e) => { setMessage(e.target.value); }}
              placeholder="Type your message..."
              rows={4}
              className="w-full resize-none rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSend()}
            disabled={!selectedStudentId || !message.trim() || isSending}
            className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Message
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
