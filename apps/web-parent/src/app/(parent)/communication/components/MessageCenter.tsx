'use client';

import { useEffect, useState } from 'react';
import {
  getConversationThreads,
  sendMessage,
  replyToMessage,
  markMessageAsRead,
  archiveMessage,
  ConversationThread,
  Message,
} from '@/lib/parent-communication-api';

export function MessageCenter() {
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<ConversationThread | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [composing, setComposing] = useState(false);
  const [loading, setLoading] = useState(true);

  const parentId = 'parent-1'; // Would come from auth context
  const [selectedStudent, setSelectedStudent] = useState('student-1');

  useEffect(() => {
    loadThreads();
  }, [selectedStudent]);

  const loadThreads = async () => {
    try {
      setLoading(true);
      const data = await getConversationThreads({
        parentId,
        studentId: selectedStudent,
      });
      setThreads(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      if (selectedThread) {
        // Reply to existing thread
        await replyToMessage(selectedThread.messages[0].id!, {
          parentId,
          body: newMessage,
        });
      } else if (composing) {
        // Send new message
        await sendMessage({
          parentId,
          teacherId: 'teacher-1', // Would come from teacher selection
          studentId: selectedStudent,
          subject: 'New Message',
          body: newMessage,
          hasAttachments: false,
        });
      }

      setNewMessage('');
      setComposing(false);
      loadThreads();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleSelectThread = async (thread: ConversationThread) => {
    setSelectedThread(thread);
    setComposing(false);

    // Mark unread messages as read
    try {
      const unreadMessages = thread.messages.filter((m) => m.status === 'unread');
      await Promise.all(unreadMessages.map((m) => markMessageAsRead(m.id!)));
      loadThreads();
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  };

  const handleArchive = async (threadId: string) => {
    try {
      const thread = threads.find((t) => t.id === threadId);
      if (thread) {
        await archiveMessage(thread.messages[0].id!);
        setSelectedThread(null);
        loadThreads();
      }
    } catch (error) {
      console.error('Failed to archive message:', error);
    }
  };

  if (loading) {
    return <div className="py-8 text-center text-gray-500">Loading messages...</div>;
  }

  return (
    <div className="flex h-[600px] gap-4">
      {/* Conversations List */}
      <div className="w-1/3 overflow-y-auto rounded-lg border border-gray-200 bg-white">
        <div className="sticky top-0 border-b border-gray-200 bg-white p-4">
          <button
            onClick={() => {
              setComposing(true);
              setSelectedThread(null);
            }}
            className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            ✉️ New Message
          </button>
        </div>

        <div className="divide-y divide-gray-200">
          {threads.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">No messages yet</div>
          ) : (
            threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => handleSelectThread(thread)}
                className={`w-full p-4 text-left transition-colors hover:bg-gray-50 ${
                  selectedThread?.id === thread.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{thread.subject}</span>
                      {thread.unreadCount > 0 && (
                        <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                          {thread.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {thread.participants.find((p) => p.role === 'teacher')?.name}
                    </div>
                    <div className="mt-2 truncate text-sm text-gray-500">
                      {thread.lastMessage}
                    </div>
                  </div>
                  <div className="ml-2 text-xs text-gray-400">
                    {new Date(thread.lastMessageTime).toLocaleDateString()}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Message View */}
      <div className="flex-1 rounded-lg border border-gray-200 bg-white">
        {!selectedThread && !composing ? (
          <div className="flex h-full items-center justify-center text-gray-400">
            Select a conversation or start a new message
          </div>
        ) : (
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-b border-gray-200 p-4">
              {composing ? (
                <h3 className="text-lg font-semibold text-gray-900">New Message</h3>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedThread?.subject}
                    </h3>
                    <div className="mt-1 text-sm text-gray-500">
                      {selectedThread?.participants.find((p) => p.role === 'teacher')?.name}
                    </div>
                  </div>
                  <button
                    onClick={() => handleArchive(selectedThread!.id)}
                    className="text-sm font-medium text-gray-600 hover:text-gray-900"
                  >
                    📦 Archive
                  </button>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {selectedThread?.messages.map((message) => {
                const isParent = message.parentId === parentId;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isParent ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-4 ${
                        isParent
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="mb-2 text-sm font-medium">
                        {isParent ? 'You' : message.teacherName}
                      </div>
                      <div className="whitespace-pre-wrap">{message.body}</div>
                      <div
                        className={`mt-2 text-xs ${isParent ? 'text-blue-100' : 'text-gray-500'}`}
                      >
                        {new Date(message.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Compose */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex gap-2">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  rows={3}
                  className="flex-1 rounded-md border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="rounded-md bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
