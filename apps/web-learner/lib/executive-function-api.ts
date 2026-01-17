/**
 * Executive Function Service API Client
 * Connects to executive-function-svc microservice
 */

const EXEC_FUNC_API_BASE =
  process.env.NEXT_PUBLIC_EXEC_FUNC_API_URL || 'http://localhost:8081/api/executive-function';

export interface Task {
  id: string;
  learnerId: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in-progress' | 'completed';
  subtasks: Subtask[];
  tags: string[];
  estimatedMinutes?: number;
  actualMinutes?: number;
  completedAt?: string;
  createdAt: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  order: number;
}

export interface StudyPlan {
  id: string;
  learnerId: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  sessions: StudySession[];
  goals: string[];
  status: 'draft' | 'active' | 'completed';
}

export interface StudySession {
  id: string;
  planId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  subject: string;
  topics: string[];
  materials: string[];
  completed: boolean;
}

export interface TimeBlock {
  id: string;
  learnerId: string;
  title: string;
  startTime: string;
  endTime: string;
  type: 'study' | 'break' | 'activity' | 'other';
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    daysOfWeek?: number[];
    endDate?: string;
  };
}

export interface OrganizationFolder {
  id: string;
  learnerId: string;
  name: string;
  color: string;
  icon: string;
  parentId?: string;
  items: OrganizationItem[];
}

export interface OrganizationItem {
  id: string;
  folderId: string;
  type: 'note' | 'file' | 'link' | 'task';
  title: string;
  content?: string;
  url?: string;
  taskId?: string;
  tags: string[];
  createdAt: string;
}

// Task Management APIs

export async function getTasks(learnerId: string): Promise<Task[]> {
  const response = await fetch(`${EXEC_FUNC_API_BASE}/tasks?learnerId=${learnerId}`);
  if (!response.ok) throw new Error('Failed to fetch tasks');
  return response.json();
}

export async function createTask(learnerId: string, task: Partial<Task>): Promise<Task> {
  const response = await fetch(`${EXEC_FUNC_API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...task, learnerId }),
  });
  if (!response.ok) throw new Error('Failed to create task');
  return response.json();
}

export async function updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
  const response = await fetch(`${EXEC_FUNC_API_BASE}/tasks/${taskId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update task');
  return response.json();
}

export async function deleteTask(taskId: string): Promise<void> {
  const response = await fetch(`${EXEC_FUNC_API_BASE}/tasks/${taskId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete task');
}

export async function breakdownTask(
  taskId: string,
  subtasks: Omit<Subtask, 'id'>[]
): Promise<Task> {
  const response = await fetch(`${EXEC_FUNC_API_BASE}/tasks/${taskId}/breakdown`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subtasks }),
  });
  if (!response.ok) throw new Error('Failed to breakdown task');
  return response.json();
}

// Study Planner APIs

export async function getStudyPlans(learnerId: string): Promise<StudyPlan[]> {
  const response = await fetch(`${EXEC_FUNC_API_BASE}/study-plans?learnerId=${learnerId}`);
  if (!response.ok) throw new Error('Failed to fetch study plans');
  return response.json();
}

export async function createStudyPlan(
  learnerId: string,
  plan: Partial<StudyPlan>
): Promise<StudyPlan> {
  const response = await fetch(`${EXEC_FUNC_API_BASE}/study-plans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...plan, learnerId }),
  });
  if (!response.ok) throw new Error('Failed to create study plan');
  return response.json();
}

export async function updateStudyPlan(
  planId: string,
  updates: Partial<StudyPlan>
): Promise<StudyPlan> {
  const response = await fetch(`${EXEC_FUNC_API_BASE}/study-plans/${planId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update study plan');
  return response.json();
}

// Time Management APIs

export async function getTimeBlocks(learnerId: string): Promise<TimeBlock[]> {
  const response = await fetch(`${EXEC_FUNC_API_BASE}/time-blocks?learnerId=${learnerId}`);
  if (!response.ok) throw new Error('Failed to fetch time blocks');
  return response.json();
}

export async function createTimeBlock(
  learnerId: string,
  block: Partial<TimeBlock>
): Promise<TimeBlock> {
  const response = await fetch(`${EXEC_FUNC_API_BASE}/time-blocks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...block, learnerId }),
  });
  if (!response.ok) throw new Error('Failed to create time block');
  return response.json();
}

export async function updateTimeBlock(
  blockId: string,
  updates: Partial<TimeBlock>
): Promise<TimeBlock> {
  const response = await fetch(`${EXEC_FUNC_API_BASE}/time-blocks/${blockId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update time block');
  return response.json();
}

export async function deleteTimeBlock(blockId: string): Promise<void> {
  const response = await fetch(`${EXEC_FUNC_API_BASE}/time-blocks/${blockId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete time block');
}

// Organization APIs

export async function getFolders(learnerId: string): Promise<OrganizationFolder[]> {
  const response = await fetch(`${EXEC_FUNC_API_BASE}/folders?learnerId=${learnerId}`);
  if (!response.ok) throw new Error('Failed to fetch folders');
  return response.json();
}

export async function createFolder(
  learnerId: string,
  folder: Partial<OrganizationFolder>
): Promise<OrganizationFolder> {
  const response = await fetch(`${EXEC_FUNC_API_BASE}/folders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...folder, learnerId }),
  });
  if (!response.ok) throw new Error('Failed to create folder');
  return response.json();
}

export async function addItemToFolder(
  folderId: string,
  item: Partial<OrganizationItem>
): Promise<OrganizationItem> {
  const response = await fetch(`${EXEC_FUNC_API_BASE}/folders/${folderId}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  if (!response.ok) throw new Error('Failed to add item');
  return response.json();
}
