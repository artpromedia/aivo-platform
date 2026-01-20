/**
 * Executive Function Service API Client
 * Connects to executive-function-svc microservice
 */

const EXEC_FUNC_API_BASE =
  process.env.NEXT_PUBLIC_EXEC_FUNC_API_URL || 'http://localhost:8081/api/executive-function';

// EF Skills tracked by the system
export type EFSkill =
  | 'WORKING_MEMORY'
  | 'COGNITIVE_FLEXIBILITY'
  | 'INHIBITORY_CONTROL'
  | 'PLANNING'
  | 'ORGANIZATION'
  | 'TIME_MANAGEMENT'
  | 'TASK_INITIATION'
  | 'EMOTIONAL_REGULATION'
  | 'METACOGNITION';

// Task status and priority enums (aligned with backend)
export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'SKIPPED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type ScheduleBlockType = 'LEARNING' | 'BREAK' | 'TRANSITION' | 'ROUTINE' | 'FLEXIBLE';

// Legacy types for backwards compatibility with existing components
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

// Backend-aligned task type
export interface BackendTask {
  id: string;
  learnerId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  parentTaskId?: string;
  estimatedMin?: number;
  actualMin?: number;
  dueAt?: string;
  completedAt?: string;
  category?: string;
  icon?: string;
  color?: string;
  rewardXp?: number;
  orderIndex: number;
  subtasks?: BackendTask[];
  createdAt: string;
  updatedAt: string;
}

// EF Profile
export interface EFProfile {
  id: string;
  learnerId: string;
  skillLevels: Record<EFSkill, number>;
  preferredChunkMin: number;
  preferredBreakMin: number;
  needsVisualSchedule: boolean;
  needsCountdown: boolean;
  needsTransitionWarn: boolean;
  transitionWarnMin: number;
  bestFocusTime?: string;
  maxVisibleTasks: number;
  rewardStyle: 'VISUAL' | 'AUDIO' | 'POINTS' | 'MINIMAL';
  createdAt: string;
  updatedAt: string;
}

// Visual Schedule types
export interface Schedule {
  id: string;
  learnerId: string;
  scheduleDate: string;
  isReviewed: boolean;
  reviewedAt?: string;
  blocks: ScheduleBlock[];
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleBlock {
  id: string;
  scheduleId: string;
  blockType: ScheduleBlockType;
  title: string;
  startTime: string;
  endTime: string;
  durationMin: number;
  icon?: string;
  color?: string;
  taskIds: string[];
  orderIndex: number;
  isCompleted: boolean;
  completedAt?: string;
  isSkipped: boolean;
  skipReason?: string;
}

export interface CreateScheduleBlock {
  blockType: ScheduleBlockType;
  title: string;
  startTime: string;
  endTime: string;
  icon?: string;
  color?: string;
  taskIds?: string[];
}

// Schedule Template types
export interface ScheduleTemplate {
  id: string;
  tenantId: string;
  learnerId?: string;
  name: string;
  dayType: 'WEEKDAY' | 'WEEKEND' | 'SCHOOL_DAY' | 'HOLIDAY' | 'SPECIAL';
  blocks: TemplateBlock[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateBlock {
  blockType: ScheduleBlockType;
  title: string;
  startTimeOffset: number; // minutes from midnight
  durationMin: number;
  icon?: string;
  color?: string;
}

// EF Strategy types
export interface EFStrategy {
  id: string;
  title: string;
  description: string;
  skill: EFSkill;
  category: string;
  steps?: string[];
  minGrade?: number;
  maxGrade?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LearnerStrategyUsage {
  learnerId: string;
  strategyId: string;
  strategy?: EFStrategy;
  usageCount: number;
  avgRating?: number;
  isFavorite: boolean;
  lastUsedAt: string;
}

// AI Task Breakdown types
export interface AITaskBreakdown {
  subtasks: AISubtaskSuggestion[];
  strategyRecommendations?: string[];
  estimatedTotalMin?: number;
}

export interface AISubtaskSuggestion {
  title: string;
  description?: string;
  estimatedMin: number;
  order: number;
}

// Planning Assistant types
export interface PlanningMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface PlanningSession {
  id: string;
  learnerId: string;
  messages: PlanningMessage[];
  createdTask?: BackendTask;
  createdSchedule?: Schedule;
  createdAt: string;
}

// Analytics types
export interface PerformanceSummary {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  onTimeRate: number;
  estimationAccuracy: number;
  skillLevels: Record<EFSkill, number>;
  recommendations: string[];
  periodDays: number;
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

// ===== EF Profile APIs =====

export async function getEFProfile(learnerId: string): Promise<EFProfile | null> {
  const response = await fetch(`${EXEC_FUNC_API_BASE}/profile/${learnerId}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Failed to fetch EF profile');
  return response.json();
}

export async function upsertEFProfile(
  learnerId: string,
  profile: Partial<EFProfile>
): Promise<EFProfile> {
  const response = await fetch(`${EXEC_FUNC_API_BASE}/profile/${learnerId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });
  if (!response.ok) throw new Error('Failed to update EF profile');
  return response.json();
}

// ===== Visual Schedule APIs =====

export async function getTodaySchedule(learnerId: string): Promise<Schedule | null> {
  const response = await fetch(`${EXEC_FUNC_API_BASE}/schedules/today/${learnerId}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Failed to fetch today schedule');
  return response.json();
}

export async function getScheduleByDate(learnerId: string, date: string): Promise<Schedule | null> {
  const response = await fetch(
    `${EXEC_FUNC_API_BASE}/schedules/${learnerId}?date=${encodeURIComponent(date)}`
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Failed to fetch schedule');
  return response.json();
}

export async function createSchedule(
  learnerId: string,
  scheduleDate: string,
  blocks: CreateScheduleBlock[]
): Promise<Schedule> {
  const response = await fetch(`${EXEC_FUNC_API_BASE}/schedules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ learnerId, scheduleDate, blocks }),
  });
  if (!response.ok) throw new Error('Failed to create schedule');
  return response.json();
}

export async function markScheduleReviewed(scheduleId: string): Promise<Schedule> {
  const response = await fetch(`${EXEC_FUNC_API_BASE}/schedules/${scheduleId}/reviewed`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to mark schedule reviewed');
  return response.json();
}

export async function completeScheduleBlock(
  scheduleId: string,
  blockId: string
): Promise<ScheduleBlock> {
  const response = await fetch(
    `${EXEC_FUNC_API_BASE}/schedules/${scheduleId}/blocks/${blockId}/complete`,
    { method: 'POST' }
  );
  if (!response.ok) throw new Error('Failed to complete block');
  return response.json();
}

export async function skipScheduleBlock(
  scheduleId: string,
  blockId: string,
  reason?: string
): Promise<ScheduleBlock> {
  const response = await fetch(
    `${EXEC_FUNC_API_BASE}/schedules/${scheduleId}/blocks/${blockId}/skip`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    }
  );
  if (!response.ok) throw new Error('Failed to skip block');
  return response.json();
}

export async function createScheduleFromTemplate(
  learnerId: string,
  templateId: string,
  date: string
): Promise<Schedule> {
  const response = await fetch(`${EXEC_FUNC_API_BASE}/schedules/from-template`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ learnerId, templateId, date }),
  });
  if (!response.ok) throw new Error('Failed to create schedule from template');
  return response.json();
}

// ===== Schedule Template APIs =====

export async function getScheduleTemplates(learnerId: string): Promise<ScheduleTemplate[]> {
  const response = await fetch(`${EXEC_FUNC_API_BASE}/schedules/templates?learnerId=${learnerId}`);
  if (!response.ok) throw new Error('Failed to fetch templates');
  return response.json();
}

export async function getDefaultTemplate(learnerId: string): Promise<ScheduleTemplate | null> {
  const response = await fetch(
    `${EXEC_FUNC_API_BASE}/schedules/templates/default/${learnerId}`
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Failed to fetch default template');
  return response.json();
}

export async function createScheduleTemplate(
  learnerId: string,
  template: Partial<ScheduleTemplate>
): Promise<ScheduleTemplate> {
  const response = await fetch(`${EXEC_FUNC_API_BASE}/schedules/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...template, learnerId }),
  });
  if (!response.ok) throw new Error('Failed to create template');
  return response.json();
}

// ===== AI Task Breakdown APIs =====

export async function getAITaskBreakdown(
  learnerId: string,
  taskTitle: string,
  taskDescription?: string
): Promise<AITaskBreakdown> {
  const response = await fetch(`${EXEC_FUNC_API_BASE}/tasks/breakdown`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ learnerId, taskTitle, taskDescription }),
  });
  if (!response.ok) throw new Error('Failed to get AI task breakdown');
  return response.json();
}

export async function createSubtasksFromBreakdown(
  taskId: string,
  subtasks: AISubtaskSuggestion[]
): Promise<BackendTask[]> {
  const response = await fetch(`${EXEC_FUNC_API_BASE}/tasks/${taskId}/create-subtasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subtasks }),
  });
  if (!response.ok) throw new Error('Failed to create subtasks');
  return response.json();
}

// ===== Backend Task APIs (aligned with service) =====

export async function getBackendTasks(
  learnerId: string,
  options?: { status?: TaskStatus; parentTaskId?: string }
): Promise<BackendTask[]> {
  const params = new URLSearchParams({ learnerId });
  if (options?.status) params.append('status', options.status);
  if (options?.parentTaskId) params.append('parentTaskId', options.parentTaskId);

  const response = await fetch(`${EXEC_FUNC_API_BASE}/tasks?${params}`);
  if (!response.ok) throw new Error('Failed to fetch tasks');
  return response.json();
}

export async function getActiveTasks(learnerId: string): Promise<BackendTask[]> {
  const response = await fetch(`${EXEC_FUNC_API_BASE}/tasks/active/${learnerId}`);
  if (!response.ok) throw new Error('Failed to fetch active tasks');
  return response.json();
}

export async function startTask(taskId: string): Promise<BackendTask> {
  const response = await fetch(`${EXEC_FUNC_API_BASE}/tasks/${taskId}/start`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to start task');
  return response.json();
}

export async function completeBackendTask(
  taskId: string,
  actualMin?: number
): Promise<BackendTask> {
  const response = await fetch(`${EXEC_FUNC_API_BASE}/tasks/${taskId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actualMin }),
  });
  if (!response.ok) throw new Error('Failed to complete task');
  return response.json();
}

export async function blockTask(taskId: string, reason: string): Promise<BackendTask> {
  const response = await fetch(`${EXEC_FUNC_API_BASE}/tasks/${taskId}/block`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) throw new Error('Failed to block task');
  return response.json();
}

export async function skipTask(taskId: string): Promise<BackendTask> {
  const response = await fetch(`${EXEC_FUNC_API_BASE}/tasks/${taskId}/skip`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to skip task');
  return response.json();
}

// ===== EF Strategy APIs =====

export async function getStrategies(options?: {
  skill?: EFSkill;
  gradeLevel?: number;
}): Promise<EFStrategy[]> {
  const params = new URLSearchParams();
  if (options?.skill) params.append('skill', options.skill);
  if (options?.gradeLevel) params.append('gradeLevel', options.gradeLevel.toString());

  const response = await fetch(`${EXEC_FUNC_API_BASE}/strategies?${params}`);
  if (!response.ok) throw new Error('Failed to fetch strategies');
  return response.json();
}

export async function getRecommendedStrategies(
  learnerId: string,
  skills?: EFSkill[]
): Promise<EFStrategy[]> {
  const params = new URLSearchParams();
  if (skills) skills.forEach((s) => params.append('skills', s));

  const response = await fetch(
    `${EXEC_FUNC_API_BASE}/strategies/recommended/${learnerId}?${params}`
  );
  if (!response.ok) throw new Error('Failed to fetch recommended strategies');
  return response.json();
}

export async function getFavoriteStrategies(learnerId: string): Promise<LearnerStrategyUsage[]> {
  const response = await fetch(`${EXEC_FUNC_API_BASE}/strategies/favorites/${learnerId}`);
  if (!response.ok) throw new Error('Failed to fetch favorite strategies');
  return response.json();
}

export async function recordStrategyUsage(
  learnerId: string,
  strategyId: string
): Promise<LearnerStrategyUsage> {
  const response = await fetch(`${EXEC_FUNC_API_BASE}/strategies/${strategyId}/use`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ learnerId }),
  });
  if (!response.ok) throw new Error('Failed to record strategy usage');
  return response.json();
}

export async function rateStrategy(
  learnerId: string,
  strategyId: string,
  rating: number
): Promise<LearnerStrategyUsage> {
  const response = await fetch(`${EXEC_FUNC_API_BASE}/strategies/${strategyId}/rate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ learnerId, rating }),
  });
  if (!response.ok) throw new Error('Failed to rate strategy');
  return response.json();
}

export async function toggleFavoriteStrategy(
  learnerId: string,
  strategyId: string
): Promise<LearnerStrategyUsage> {
  const response = await fetch(`${EXEC_FUNC_API_BASE}/strategies/${strategyId}/favorite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ learnerId }),
  });
  if (!response.ok) throw new Error('Failed to toggle favorite');
  return response.json();
}

// ===== Planning Assistant API =====

export async function sendPlanningMessage(
  learnerId: string,
  message: string,
  sessionId?: string
): Promise<{ sessionId: string; response: string; suggestions?: string[] }> {
  const response = await fetch(`${EXEC_FUNC_API_BASE}/planning/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ learnerId, message, sessionId }),
  });
  if (!response.ok) throw new Error('Failed to send planning message');
  return response.json();
}

// ===== Analytics APIs =====

export async function getPerformanceSummary(
  learnerId: string,
  periodDays?: number
): Promise<PerformanceSummary> {
  const params = new URLSearchParams();
  if (periodDays) params.append('periodDays', periodDays.toString());

  const response = await fetch(
    `${EXEC_FUNC_API_BASE}/analytics/performance/${learnerId}?${params}`
  );
  if (!response.ok) throw new Error('Failed to fetch performance summary');
  return response.json();
}
