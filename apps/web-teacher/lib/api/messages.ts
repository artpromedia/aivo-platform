/**
 * Messages API Client
 * Types and fetch functions for teacher-parent messaging.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface Conversation {
  id: string;
  participantName: string;
  participantRole: 'parent' | 'guardian' | 'admin';
  studentName?: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: boolean;
  unreadCount: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: 'teacher' | 'parent';
  content: string;
  timestamp: string;
  read: boolean;
  attachments?: { name: string; url: string; type: string }[];
}

export interface ConversationDetail {
  conversation: Conversation;
  messages: Message[];
  studentInfo?: {
    id: string;
    name: string;
    grade: string;
    className: string;
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ══════════════════════════════════════════════════════════════════════════════

function mockConversations(): Conversation[] {
  return [
    {
      id: '1',
      participantName: 'Sarah Wilson',
      participantRole: 'parent',
      studentName: 'Emma Wilson',
      lastMessage: 'Thank you for the update!',
      lastMessageTime: '2h ago',
      unread: false,
      unreadCount: 0,
    },
    {
      id: '2',
      participantName: 'James Chen',
      participantRole: 'parent',
      studentName: 'Michael Chen',
      lastMessage: 'Can we schedule a call?',
      lastMessageTime: '5h ago',
      unread: true,
      unreadCount: 1,
    },
    {
      id: '3',
      participantName: 'Lisa Brown',
      participantRole: 'guardian',
      studentName: 'Olivia Brown',
      lastMessage: "I'll make sure she submits it today",
      lastMessageTime: '1d ago',
      unread: false,
      unreadCount: 0,
    },
    {
      id: '4',
      participantName: 'Robert Smith',
      participantRole: 'parent',
      studentName: 'Alex Smith',
      lastMessage: 'Thanks for the accommodation info',
      lastMessageTime: '2d ago',
      unread: false,
      unreadCount: 0,
    },
  ];
}

function mockMessages(conversationId: string): Message[] {
  const conversations: Record<string, Message[]> = {
    '1': [
      {
        id: '1',
        conversationId: '1',
        senderId: 'teacher-1',
        senderType: 'teacher',
        content: "Hi Mrs. Wilson, I wanted to update you on Emma's progress in Algebra.",
        timestamp: '2:30 PM',
        read: true,
      },
      {
        id: '2',
        conversationId: '1',
        senderId: 'parent-1',
        senderType: 'parent',
        content: 'Thank you for reaching out! How is she doing?',
        timestamp: '2:35 PM',
        read: true,
      },
      {
        id: '3',
        conversationId: '1',
        senderId: 'teacher-1',
        senderType: 'teacher',
        content: "She's doing great! Her quiz scores have improved significantly this quarter.",
        timestamp: '2:40 PM',
        read: true,
      },
      {
        id: '4',
        conversationId: '1',
        senderId: 'parent-1',
        senderType: 'parent',
        content: 'Thank you for the update!',
        timestamp: '2:45 PM',
        read: true,
      },
    ],
    '2': [
      {
        id: '5',
        conversationId: '2',
        senderId: 'parent-2',
        senderType: 'parent',
        content: "Hello, I have some concerns about Michael's recent test.",
        timestamp: '10:00 AM',
        read: true,
      },
      {
        id: '6',
        conversationId: '2',
        senderId: 'parent-2',
        senderType: 'parent',
        content: 'Can we schedule a call?',
        timestamp: '10:05 AM',
        read: false,
      },
    ],
  };
  return conversations[conversationId] ?? [];
}

// ══════════════════════════════════════════════════════════════════════════════
// API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

export async function fetchConversations(accessToken: string): Promise<Conversation[]> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return mockConversations();
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/messages/conversations`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch conversations: ${res.status}`);
  }

  return res.json() as Promise<Conversation[]>;
}

export async function fetchConversationMessages(
  conversationId: string,
  accessToken: string
): Promise<Message[]> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return mockMessages(conversationId);
  }

  const res = await fetch(
    `${API_BASE_URL}/api/v1/messages/conversations/${conversationId}/messages`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch messages: ${res.status}`);
  }

  return res.json() as Promise<Message[]>;
}

export async function sendMessage(
  conversationId: string,
  content: string,
  accessToken: string
): Promise<Message> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      id: `msg-${Date.now()}`,
      conversationId,
      senderId: 'teacher-1',
      senderType: 'teacher',
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: true,
    };
  }

  const res = await fetch(
    `${API_BASE_URL}/api/v1/messages/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to send message: ${res.status}`);
  }

  return res.json() as Promise<Message>;
}

export async function markConversationRead(
  conversationId: string,
  accessToken: string
): Promise<void> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return;
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/messages/conversations/${conversationId}/read`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to mark conversation as read: ${res.status}`);
  }
}
