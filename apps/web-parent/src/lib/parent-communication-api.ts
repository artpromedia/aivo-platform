/**
 * Parent Communication API Client
 *
 * Provides API methods for progress updates, messaging, goal sharing,
 * and resource access.
 */

const BASE_URL = 'http://localhost:8094';

// ============================================================================
// Types
// ============================================================================

export type UpdateType = 'academic' | 'behavioral' | 'social' | 'achievement' | 'alert' | 'general';
export type UpdatePriority = 'low' | 'normal' | 'high' | 'urgent';
export type MessageStatus = 'unread' | 'read' | 'archived';
export type GoalStatus = 'notStarted' | 'inProgress' | 'achieved' | 'modified' | 'discontinued';
export type ResourceCategory = 'article' | 'video' | 'activity' | 'guide' | 'tool' | 'book';

export interface ProgressUpdate {
  id?: string;
  studentId: string;
  studentName?: string;
  type: UpdateType;
  priority: UpdatePriority;
  title: string;
  description: string;
  details?: string;
  subject?: string;
  timestamp: string;
  teacherId: string;
  teacherName?: string;
  read?: boolean;
  metrics?: {
    label: string;
    value: string | number;
    change?: number;
  }[];
  attachments?: string[];
}

export interface Message {
  id?: string;
  parentId: string;
  teacherId: string;
  teacherName?: string;
  studentId: string;
  studentName?: string;
  subject: string;
  body: string;
  timestamp: string;
  status: MessageStatus;
  thread?: Message[];
  hasAttachments?: boolean;
  attachments?: string[];
  urgent?: boolean;
}

export interface SharedGoal {
  id?: string;
  studentId: string;
  studentName?: string;
  title: string;
  description: string;
  category: string;
  status: GoalStatus;
  target: string;
  current: number;
  targetValue: number;
  progress: number;
  startDate: string;
  targetDate: string;
  teacherId: string;
  teacherName?: string;
  parentNotes?: string;
  teacherNotes?: string;
  milestones?: {
    title: string;
    completed: boolean;
    date?: string;
  }[];
  supportStrategies?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ParentResource {
  id: string;
  title: string;
  category: ResourceCategory;
  description: string;
  content?: string;
  url?: string;
  thumbnail?: string;
  duration?: number;
  ageRange?: string[];
  topics: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  rating?: number;
  downloads?: number;
  recommended?: boolean;
  createdBy?: string;
  createdAt?: string;
}

export interface ResourceCollection {
  id: string;
  name: string;
  description: string;
  resources: string[];
  parentId: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationThread {
  id: string;
  participants: {
    id: string;
    name: string;
    role: 'parent' | 'teacher';
  }[];
  subject: string;
  studentId: string;
  studentName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: Message[];
}

// ============================================================================
// Progress Updates API
// ============================================================================

export async function getProgressUpdates(params: {
  studentId: string;
  startDate?: string;
  endDate?: string;
  type?: UpdateType;
  unreadOnly?: boolean;
}): Promise<ProgressUpdate[]> {
  const queryParams = new URLSearchParams();
  queryParams.append('studentId', params.studentId);
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  if (params.type) queryParams.append('type', params.type);
  if (params.unreadOnly) queryParams.append('unreadOnly', 'true');

  const response = await fetch(`${BASE_URL}/api/parent/progress-updates?${queryParams}`);
  if (!response.ok) throw new Error('Failed to fetch progress updates');
  return response.json();
}

export async function markUpdateAsRead(updateId: string): Promise<ProgressUpdate> {
  const response = await fetch(`${BASE_URL}/api/parent/progress-updates/${updateId}/read`, {
    method: 'PUT',
  });
  if (!response.ok) throw new Error('Failed to mark update as read');
  return response.json();
}

export async function getUpdatesSummary(studentId: string): Promise<{
  total: number;
  unread: number;
  byType: Record<UpdateType, number>;
  recentHighPriority: ProgressUpdate[];
}> {
  const response = await fetch(`${BASE_URL}/api/parent/progress-updates/summary?studentId=${studentId}`);
  if (!response.ok) throw new Error('Failed to fetch updates summary');
  return response.json();
}

// ============================================================================
// Message Center API
// ============================================================================

export async function getMessages(params: {
  parentId: string;
  studentId?: string;
  status?: MessageStatus;
  unreadOnly?: boolean;
}): Promise<Message[]> {
  const queryParams = new URLSearchParams();
  queryParams.append('parentId', params.parentId);
  if (params.studentId) queryParams.append('studentId', params.studentId);
  if (params.status) queryParams.append('status', params.status);
  if (params.unreadOnly) queryParams.append('unreadOnly', 'true');

  const response = await fetch(`${BASE_URL}/api/parent/messages?${queryParams}`);
  if (!response.ok) throw new Error('Failed to fetch messages');
  return response.json();
}

export async function getConversationThreads(params: {
  parentId: string;
  studentId?: string;
}): Promise<ConversationThread[]> {
  const queryParams = new URLSearchParams();
  queryParams.append('parentId', params.parentId);
  if (params.studentId) queryParams.append('studentId', params.studentId);

  const response = await fetch(`${BASE_URL}/api/parent/conversations?${queryParams}`);
  if (!response.ok) throw new Error('Failed to fetch conversations');
  return response.json();
}

export async function sendMessage(message: Omit<Message, 'id' | 'timestamp' | 'status'>): Promise<Message> {
  const response = await fetch(`${BASE_URL}/api/parent/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });
  if (!response.ok) throw new Error('Failed to send message');
  return response.json();
}

export async function replyToMessage(messageId: string, reply: {
  parentId: string;
  body: string;
}): Promise<Message> {
  const response = await fetch(`${BASE_URL}/api/parent/messages/${messageId}/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reply),
  });
  if (!response.ok) throw new Error('Failed to reply to message');
  return response.json();
}

export async function markMessageAsRead(messageId: string): Promise<Message> {
  const response = await fetch(`${BASE_URL}/api/parent/messages/${messageId}/read`, {
    method: 'PUT',
  });
  if (!response.ok) throw new Error('Failed to mark message as read');
  return response.json();
}

export async function archiveMessage(messageId: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/parent/messages/${messageId}/archive`, {
    method: 'PUT',
  });
  if (!response.ok) throw new Error('Failed to archive message');
}

// ============================================================================
// Goal Sharing API
// ============================================================================

export async function getSharedGoals(params: {
  studentId: string;
  status?: GoalStatus;
}): Promise<SharedGoal[]> {
  const queryParams = new URLSearchParams();
  queryParams.append('studentId', params.studentId);
  if (params.status) queryParams.append('status', params.status);

  const response = await fetch(`${BASE_URL}/api/parent/goals?${queryParams}`);
  if (!response.ok) throw new Error('Failed to fetch shared goals');
  return response.json();
}

export async function getGoalDetails(goalId: string): Promise<SharedGoal> {
  const response = await fetch(`${BASE_URL}/api/parent/goals/${goalId}`);
  if (!response.ok) throw new Error('Failed to fetch goal details');
  return response.json();
}

export async function addParentNote(goalId: string, note: string): Promise<SharedGoal> {
  const response = await fetch(`${BASE_URL}/api/parent/goals/${goalId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note }),
  });
  if (!response.ok) throw new Error('Failed to add parent note');
  return response.json();
}

export async function updateGoalProgress(goalId: string, progress: {
  current: number;
  notes?: string;
}): Promise<SharedGoal> {
  const response = await fetch(`${BASE_URL}/api/parent/goals/${goalId}/progress`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(progress),
  });
  if (!response.ok) throw new Error('Failed to update goal progress');
  return response.json();
}

// ============================================================================
// Resource Hub API
// ============================================================================

export async function getResources(params: {
  category?: ResourceCategory;
  topics?: string[];
  search?: string;
  recommended?: boolean;
}): Promise<ParentResource[]> {
  const queryParams = new URLSearchParams();
  if (params.category) queryParams.append('category', params.category);
  if (params.topics) params.topics.forEach(t => queryParams.append('topics', t));
  if (params.search) queryParams.append('search', params.search);
  if (params.recommended) queryParams.append('recommended', 'true');

  const response = await fetch(`${BASE_URL}/api/parent/resources?${queryParams}`);
  if (!response.ok) throw new Error('Failed to fetch resources');
  return response.json();
}

export async function getResourceCollections(parentId: string): Promise<ResourceCollection[]> {
  const response = await fetch(`${BASE_URL}/api/parent/resource-collections?parentId=${parentId}`);
  if (!response.ok) throw new Error('Failed to fetch resource collections');
  return response.json();
}

export async function createCollection(collection: {
  name: string;
  description: string;
  parentId: string;
  isPublic: boolean;
}): Promise<ResourceCollection> {
  const response = await fetch(`${BASE_URL}/api/parent/resource-collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(collection),
  });
  if (!response.ok) throw new Error('Failed to create collection');
  return response.json();
}

export async function addToCollection(collectionId: string, resourceId: string): Promise<ResourceCollection> {
  const response = await fetch(`${BASE_URL}/api/parent/resource-collections/${collectionId}/resources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resourceId }),
  });
  if (!response.ok) throw new Error('Failed to add resource to collection');
  return response.json();
}

export async function removeFromCollection(collectionId: string, resourceId: string): Promise<void> {
  const response = await fetch(
    `${BASE_URL}/api/parent/resource-collections/${collectionId}/resources/${resourceId}`,
    { method: 'DELETE' }
  );
  if (!response.ok) throw new Error('Failed to remove resource from collection');
}

export async function getRecommendedResources(studentId: string): Promise<ParentResource[]> {
  const response = await fetch(`${BASE_URL}/api/parent/resources/recommended?studentId=${studentId}`);
  if (!response.ok) throw new Error('Failed to fetch recommended resources');
  return response.json();
}
