/**
 * Messages API Client
 * Types and fetch functions for teacher-parent messaging.
 *
 * Backend Service: messaging-svc (port 3081)
 */

const MESSAGING_SVC_URL = process.env.NEXT_PUBLIC_MESSAGING_SVC_URL || 'http://localhost:3081';

// Production-safe mock mode check
// CRITICAL: This pattern ensures mock data is NEVER returned in production
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
const MOCK_REQUESTED = process.env.NEXT_PUBLIC_USE_MOCK === 'true';
const USE_MOCK = IS_DEVELOPMENT && MOCK_REQUESTED;

// Warn if mock mode is requested in production (but don't enable it)
if (process.env.NODE_ENV === 'production' && MOCK_REQUESTED) {
  console.warn('[Messages API] USE_MOCK ignored in production - using real API');
}

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

  const res = await fetch(`${MESSAGING_SVC_URL}/conversations`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch conversations: ${res.status}`);
  }

  const data = await res.json();
  // messaging-svc returns { data: [...], pagination: {...} } or { items: [...] }
  const items = data.data ?? data.items ?? data;
  return items.map(transformConversationResponse);
}

// Helper to transform backend conversation to frontend interface
function transformConversationResponse(conv: any): Conversation {
  // messaging-svc has participants array - find the other participant
  const participant = conv.participants?.find((p: any) => p.role !== 'OWNER') ?? conv.participants?.[0];
  const lastMsg = conv.lastMessage ?? conv.messages?.[0];

  return {
    id: conv.id,
    participantName: participant?.user?.name ?? participant?.name ?? 'Unknown',
    participantRole: mapParticipantRole(participant?.role ?? participant?.user?.role),
    studentName: conv.contextType === 'student' ? conv.contextName : participant?.studentName,
    lastMessage: lastMsg?.content ?? '',
    lastMessageTime: formatMessageTime(lastMsg?.createdAt ?? conv.updatedAt),
    unread: conv.unreadCount > 0,
    unreadCount: conv.unreadCount ?? 0,
  };
}

// Helper to map backend roles to frontend roles
function mapParticipantRole(role: string): Conversation['participantRole'] {
  const roleMap: Record<string, Conversation['participantRole']> = {
    'PARENT': 'parent',
    'GUARDIAN': 'guardian',
    'ADMIN': 'admin',
    'parent': 'parent',
    'guardian': 'guardian',
    'admin': 'admin',
  };
  return roleMap[role] ?? 'parent';
}

// Helper to format message timestamps
function formatMessageTime(timestamp: string | undefined): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return '1d ago';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
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
    `${MESSAGING_SVC_URL}/conversations/${conversationId}/messages`,
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

  const data = await res.json();
  const items = data.data ?? data.messages ?? data;
  return items.map((msg: any) => transformMessageResponse(msg, conversationId));
}

// Helper to transform backend message to frontend interface
function transformMessageResponse(msg: any, conversationId: string): Message {
  return {
    id: msg.id,
    conversationId,
    senderId: msg.senderId ?? msg.sender?.id,
    senderType: msg.senderRole === 'TEACHER' || msg.sender?.role === 'teacher' ? 'teacher' : 'parent',
    content: msg.content,
    timestamp: formatMessageTimestamp(msg.createdAt),
    read: msg.isRead ?? msg.readAt !== null,
    attachments: msg.metadata?.attachments?.map((a: any) => ({
      name: a.name ?? a.filename,
      url: a.url,
      type: a.mimeType ?? a.type,
    })),
  };
}

// Helper to format message timestamp for display
function formatMessageTimestamp(timestamp: string | undefined): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
    `${MESSAGING_SVC_URL}/conversations/${conversationId}/messages`,
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

  const data = await res.json();
  const msg = data.data ?? data;
  return transformMessageResponse(msg, conversationId);
}

export async function markConversationRead(
  conversationId: string,
  accessToken: string
): Promise<void> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return;
  }

  const res = await fetch(`${MESSAGING_SVC_URL}/conversations/${conversationId}/read`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ lastMessageId: 'latest' }), // messaging-svc requires lastMessageId
  });

  if (!res.ok) {
    throw new Error(`Failed to mark conversation as read: ${res.status}`);
  }
}
