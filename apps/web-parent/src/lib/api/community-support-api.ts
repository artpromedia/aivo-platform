const BASE_URL = process.env.NEXT_PUBLIC_COMMUNITY_SUPPORT_URL || '/api/community';

// Forum types
export type ForumCategory =
  | 'general'
  | 'learning-support'
  | 'behavior'
  | 'iep'
  | 'social-emotional'
  | 'transition';
export type PostStatus = 'active' | 'locked' | 'archived';

export interface ForumPost {
  id: string;
  title: string;
  content: string;
  category: ForumCategory;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
  updatedAt: string;
  status: PostStatus;
  viewCount: number;
  replyCount: number;
  likeCount: number;
  isLiked: boolean;
  isPinned: boolean;
  tags: string[];
  lastReplyAt?: string;
  lastReplyBy?: string;
}

export interface ForumReply {
  id: string;
  postId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  isLiked: boolean;
  isExpertAnswer: boolean;
  isBestAnswer: boolean;
}

// Q&A types
export type QuestionStatus = 'open' | 'answered' | 'closed';
export type QuestionCategory =
  | 'academic'
  | 'behavioral'
  | 'social'
  | 'medical'
  | 'legal'
  | 'resources';

export interface Question {
  id: string;
  title: string;
  content: string;
  category: QuestionCategory;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
  updatedAt: string;
  status: QuestionStatus;
  viewCount: number;
  answerCount: number;
  likeCount: number;
  isLiked: boolean;
  tags: string[];
  hasExpertAnswer: boolean;
  bestAnswerId?: string;
}

export interface Answer {
  id: string;
  questionId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  isExpert: boolean;
  expertTitle?: string;
  expertCredentials?: string;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  isLiked: boolean;
  isBestAnswer: boolean;
  resources?: { title: string; url: string }[];
}

// Support Group types
export type GroupType = 'public' | 'private' | 'moderated';
export type GroupCategory = 'diagnosis-specific' | 'age-specific' | 'topic-specific' | 'local';

export interface SupportGroup {
  id: string;
  name: string;
  description: string;
  category: GroupCategory;
  type: GroupType;
  coverImageUrl?: string;
  createdAt: string;
  memberCount: number;
  postCount: number;
  tags: string[];
  moderators: string[];
  isMember: boolean;
  lastActivityAt: string;
}

export interface GroupPost {
  id: string;
  groupId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  attachments?: { type: 'image' | 'file'; url: string; name: string }[];
}

export interface GroupComment {
  id: string;
  postId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
  likeCount: number;
  isLiked: boolean;
}

// Forum API
export async function getForumPosts(filters?: {
  category?: ForumCategory;
  search?: string;
  status?: PostStatus;
}): Promise<ForumPost[]> {
  const params = new URLSearchParams();
  if (filters?.category) params.append('category', filters.category);
  if (filters?.search) params.append('search', filters.search);
  if (filters?.status) params.append('status', filters.status);

  const response = await fetch(`${BASE_URL}/api/parent/forum/posts?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch forum posts');
  return response.json();
}

export async function getForumPost(id: string): Promise<ForumPost> {
  const response = await fetch(`${BASE_URL}/api/parent/forum/posts/${id}`);
  if (!response.ok) throw new Error('Failed to fetch forum post');
  return response.json();
}

export async function createForumPost(data: {
  title: string;
  content: string;
  category: ForumCategory;
  tags: string[];
}): Promise<ForumPost> {
  const response = await fetch(`${BASE_URL}/api/parent/forum/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create forum post');
  return response.json();
}

export async function getForumReplies(postId: string): Promise<ForumReply[]> {
  const response = await fetch(`${BASE_URL}/api/parent/forum/posts/${postId}/replies`);
  if (!response.ok) throw new Error('Failed to fetch replies');
  return response.json();
}

export async function createForumReply(postId: string, content: string): Promise<ForumReply> {
  const response = await fetch(`${BASE_URL}/api/parent/forum/posts/${postId}/replies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) throw new Error('Failed to create reply');
  return response.json();
}

export async function toggleForumLike(id: string, type: 'post' | 'reply'): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/parent/forum/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, type }),
  });
  if (!response.ok) throw new Error('Failed to toggle like');
}

// Q&A API
export async function getQuestions(filters?: {
  category?: QuestionCategory;
  search?: string;
  status?: QuestionStatus;
}): Promise<Question[]> {
  const params = new URLSearchParams();
  if (filters?.category) params.append('category', filters.category);
  if (filters?.search) params.append('search', filters.search);
  if (filters?.status) params.append('status', filters.status);

  const response = await fetch(`${BASE_URL}/api/parent/qa/questions?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch questions');
  return response.json();
}

export async function getQuestion(id: string): Promise<Question> {
  const response = await fetch(`${BASE_URL}/api/parent/qa/questions/${id}`);
  if (!response.ok) throw new Error('Failed to fetch question');
  return response.json();
}

export async function createQuestion(data: {
  title: string;
  content: string;
  category: QuestionCategory;
  tags: string[];
}): Promise<Question> {
  const response = await fetch(`${BASE_URL}/api/parent/qa/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create question');
  return response.json();
}

export async function getAnswers(questionId: string): Promise<Answer[]> {
  const response = await fetch(`${BASE_URL}/api/parent/qa/questions/${questionId}/answers`);
  if (!response.ok) throw new Error('Failed to fetch answers');
  return response.json();
}

export async function createAnswer(questionId: string, content: string): Promise<Answer> {
  const response = await fetch(`${BASE_URL}/api/parent/qa/questions/${questionId}/answers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) throw new Error('Failed to create answer');
  return response.json();
}

export async function markBestAnswer(questionId: string, answerId: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/parent/qa/questions/${questionId}/best-answer`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answerId }),
  });
  if (!response.ok) throw new Error('Failed to mark best answer');
}

export async function toggleQuestionLike(id: string, type: 'question' | 'answer'): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/parent/qa/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, type }),
  });
  if (!response.ok) throw new Error('Failed to toggle like');
}

// Support Groups API
export async function getSupportGroups(filters?: {
  category?: GroupCategory;
  search?: string;
  type?: GroupType;
}): Promise<SupportGroup[]> {
  const params = new URLSearchParams();
  if (filters?.category) params.append('category', filters.category);
  if (filters?.search) params.append('search', filters.search);
  if (filters?.type) params.append('type', filters.type);

  const response = await fetch(`${BASE_URL}/api/parent/groups?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch support groups');
  return response.json();
}

export async function getSupportGroup(id: string): Promise<SupportGroup> {
  const response = await fetch(`${BASE_URL}/api/parent/groups/${id}`);
  if (!response.ok) throw new Error('Failed to fetch support group');
  return response.json();
}

export async function joinGroup(groupId: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/parent/groups/${groupId}/join`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to join group');
}

export async function leaveGroup(groupId: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/parent/groups/${groupId}/leave`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to leave group');
}

export async function getGroupPosts(groupId: string): Promise<GroupPost[]> {
  const response = await fetch(`${BASE_URL}/api/parent/groups/${groupId}/posts`);
  if (!response.ok) throw new Error('Failed to fetch group posts');
  return response.json();
}

export async function createGroupPost(groupId: string, content: string): Promise<GroupPost> {
  const response = await fetch(`${BASE_URL}/api/parent/groups/${groupId}/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) throw new Error('Failed to create group post');
  return response.json();
}

export async function getGroupComments(postId: string): Promise<GroupComment[]> {
  const response = await fetch(`${BASE_URL}/api/parent/groups/posts/${postId}/comments`);
  if (!response.ok) throw new Error('Failed to fetch comments');
  return response.json();
}

export async function createGroupComment(postId: string, content: string): Promise<GroupComment> {
  const response = await fetch(`${BASE_URL}/api/parent/groups/posts/${postId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) throw new Error('Failed to create comment');
  return response.json();
}

export async function toggleGroupLike(id: string, type: 'post' | 'comment'): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/parent/groups/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, type }),
  });
  if (!response.ok) throw new Error('Failed to toggle like');
}
