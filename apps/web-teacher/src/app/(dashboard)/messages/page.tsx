/**
 * Messages Page
 */

'use client';

import * as React from 'react';

import { PageHeader } from '@/components/layout/breadcrumb';

const conversations = [
  {
    id: '1',
    name: "Sarah Wilson (Emma's parent)",
    lastMessage: 'Thank you for the update!',
    time: '2h ago',
    unread: false,
  },
  {
    id: '2',
    name: "James Chen (Michael's parent)",
    lastMessage: 'Can we schedule a call?',
    time: '5h ago',
    unread: true,
  },
  {
    id: '3',
    name: "Lisa Brown (Olivia's parent)",
    lastMessage: "I'll make sure she submits it today",
    time: '1d ago',
    unread: false,
  },
  {
    id: '4',
    name: "Robert Smith (Alex's parent)",
    lastMessage: 'Thanks for the accommodation info',
    time: '2d ago',
    unread: false,
  },
];

const mockMessages = [
  {
    id: '1',
    from: 'me',
    text: "Hi Mrs. Wilson, I wanted to update you on Emma's progress in Algebra.",
    time: '2:30 PM',
  },
  {
    id: '2',
    from: 'parent',
    text: 'Thank you for reaching out! How is she doing?',
    time: '2:35 PM',
  },
  {
    id: '3',
    from: 'me',
    text: "She's doing great! Her quiz scores have improved significantly this quarter.",
    time: '2:40 PM',
  },
  { id: '4', from: 'parent', text: 'Thank you for the update!', time: '2:45 PM' },
];

export default function MessagesPage() {
  const [selected, setSelected] = React.useState(conversations[0]);

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
                  selected.id === conv.id ? 'bg-primary-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <p className="font-medium text-gray-900">{conv.name}</p>
                  <span className="text-xs text-gray-500">{conv.time}</span>
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
          {/* Header */}
          <div className="border-b p-4">
            <h3 className="font-semibold text-gray-900">{selected.name}</h3>
            <p className="text-sm text-gray-500">Parent of Emma Wilson</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {mockMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    msg.from === 'me' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{msg.text}</p>
                  <p
                    className={`mt-1 text-xs ${msg.from === 'me' ? 'text-primary-200' : 'text-gray-500'}`}
                  >
                    {msg.time}
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
                className="flex-1 rounded-lg border px-4 py-2 text-sm"
              />
              <button className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
