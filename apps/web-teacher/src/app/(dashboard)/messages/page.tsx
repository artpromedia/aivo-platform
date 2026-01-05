/**
 * Messages Page
 */

'use client';

import * as React from 'react';

import {
  fetchConversations,
  fetchConversationMessages,
  sendMessage,
  markConversationRead,
  type Conversation,
  type Message,
} from '../../../../lib/api/messages';

import { PageHeader } from '@/components/layout/breadcrumb';

export default function MessagesPage() {
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [selected, setSelected] = React.useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [newMessage, setNewMessage] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);

  React.useEffect(() => {
    async function loadConversations() {
      try {
        const accessToken = 'mock-token';
        const data = await fetchConversations(accessToken);
        setConversations(data);
        if (data.length > 0 && !selected) {
          setSelected(data[0]);
        }
      } catch (err) {
        console.error('Failed to load conversations:', err);
      } finally {
        setIsLoading(false);
      }
    }
    void loadConversations();
  }, [selected]);

  React.useEffect(() => {
    async function loadMessages() {
      if (!selected) return;
      try {
        const accessToken = 'mock-token';
        const data = await fetchConversationMessages(selected.id, accessToken);
        setMessages(data);
        if (selected.unread) {
          await markConversationRead(selected.id, accessToken);
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    }
    void loadMessages();
  }, [selected]);

  const handleSendMessage = async () => {
    if (!selected || !newMessage.trim()) return;
    try {
      setIsSending(true);
      const accessToken = 'mock-token';
      const sent = await sendMessage(selected.id, newMessage.trim(), accessToken);
      setMessages((prev) => [...prev, sent]);
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Messages"
        description="Communicate with parents and guardians"
        actions={
          <button className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
            + New Message
          </button>
        }
      />

      <div className="mt-6 flex h-[600px] overflow-hidden rounded-xl border bg-white">
        {/* Conversations List */}
        <div className="w-80 border-r">
          <div className="border-b p-3">
            <input
              type="search"
              placeholder="Search conversations..."
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <div className="overflow-y-auto">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => {
                  setSelected(conv);
                }}
                className={`w-full border-b p-4 text-left hover:bg-gray-50 ${
                  selected?.id === conv.id ? 'bg-primary-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <p className="font-medium text-gray-900">
                    {conv.participantName} {conv.studentName && `(${conv.studentName}'s parent)`}
                  </p>
                  <span className="text-xs text-gray-500">{conv.lastMessageTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm text-gray-500">{conv.lastMessage}</p>
                  {conv.unread && <span className="h-2 w-2 rounded-full bg-primary-600" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex flex-1 flex-col">
          {selected ? (
            <>
              {/* Header */}
              <div className="border-b p-4">
                <h3 className="font-semibold text-gray-900">{selected.participantName}</h3>
                <p className="text-sm text-gray-500">
                  {selected.studentName
                    ? `Parent of ${selected.studentName}`
                    : selected.participantRole}
                </p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.senderType === 'teacher' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        msg.senderType === 'teacher'
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p
                        className={`mt-1 text-xs ${msg.senderType === 'teacher' ? 'text-primary-200' : 'text-gray-500'}`}
                      >
                        {msg.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    className="flex-1 rounded-lg border px-4 py-2 text-sm"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isSending || !newMessage.trim()}
                    className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                  >
                    {isSending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-gray-500">
              Select a conversation to view messages
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
