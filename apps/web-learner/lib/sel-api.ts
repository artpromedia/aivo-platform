/**
 * SEL (Social-Emotional Learning) Service API Client
 * Connects to sel-svc microservice
 */

const SEL_API_BASE = process.env.NEXT_PUBLIC_SEL_API_URL || 'http://localhost:8082/api/sel';

export interface MoodCheckIn {
  id: string;
  learnerId: string;
  timestamp: string;
  mood: 'happy' | 'sad' | 'angry' | 'worried' | 'calm' | 'excited' | 'frustrated' | 'tired';
  intensity: number; // 1-5 scale
  triggers?: string[];
  notes?: string;
  copingStrategiesUsed?: string[];
}

export interface EmotionRegulationStrategy {
  id: string;
  name: string;
  category: 'breathing' | 'grounding' | 'movement' | 'creative' | 'social' | 'cognitive';
  description: string;
  steps: string[];
  duration: number; // in minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
}

export interface SocialStory {
  id: string;
  title: string;
  category: 'school' | 'social' | 'routine' | 'change' | 'conflict' | 'self-care';
  description: string;
  pages: StoryPage[];
  ageRange: string;
  difficulty: 'easy' | 'medium' | 'hard';
  completed: boolean;
  favorite: boolean;
}

export interface StoryPage {
  id: string;
  order: number;
  text: string;
  imageUrl?: string;
  audioUrl?: string;
  questions?: StoryQuestion[];
}

export interface StoryQuestion {
  id: string;
  question: string;
  type: 'multiple-choice' | 'true-false' | 'open-ended';
  options?: string[];
  correctAnswer?: string;
}

export interface SelfAdvocacyTool {
  id: string;
  type: 'script' | 'template' | 'practice-scenario' | 'tip';
  title: string;
  description: string;
  content: string;
  category: 'classroom' | 'peer' | 'adult' | 'accommodations' | 'needs';
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface SELProgress {
  learnerId: string;
  totalCheckIns: number;
  currentStreak: number;
  longestStreak: number;
  moodTrends: {
    date: string;
    averageMood: string;
    intensity: number;
  }[];
  strategiesLearned: number;
  storiesCompleted: number;
  advocacySkillsLevel: number; // 1-5
}

// Mood Check-In APIs
/* eslint-disable @typescript-eslint/no-unsafe-return */

export async function createMoodCheckIn(
  learnerId: string,
  checkIn: Partial<MoodCheckIn>
): Promise<MoodCheckIn> {
  const response = await fetch(`${SEL_API_BASE}/mood-checkins`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...checkIn, learnerId }),
  });
  if (!response.ok) throw new Error('Failed to create mood check-in');
  return response.json();
}

export async function getMoodCheckIns(learnerId: string, limit = 30): Promise<MoodCheckIn[]> {
  const response = await fetch(
    `${SEL_API_BASE}/mood-checkins?learnerId=${learnerId}&limit=${limit}`
  );
  if (!response.ok) throw new Error('Failed to fetch mood check-ins');
  return response.json();
}

// Emotion Regulation APIs

export async function getRegulationStrategies(): Promise<EmotionRegulationStrategy[]> {
  const response = await fetch(`${SEL_API_BASE}/regulation-strategies`);
  if (!response.ok) throw new Error('Failed to fetch strategies');
  return response.json();
}

export async function getStrategyById(strategyId: string): Promise<EmotionRegulationStrategy> {
  const response = await fetch(`${SEL_API_BASE}/regulation-strategies/${strategyId}`);
  if (!response.ok) throw new Error('Failed to fetch strategy');
  return response.json();
}

export async function recordStrategyUse(
  learnerId: string,
  strategyId: string,
  effectiveness: number
): Promise<void> {
  const response = await fetch(`${SEL_API_BASE}/strategy-usage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ learnerId, strategyId, effectiveness }),
  });
  if (!response.ok) throw new Error('Failed to record strategy use');
}

// Social Stories APIs

export async function getSocialStories(): Promise<SocialStory[]> {
  const response = await fetch(`${SEL_API_BASE}/social-stories`);
  if (!response.ok) throw new Error('Failed to fetch social stories');
  return response.json();
}

export async function getStoryById(storyId: string): Promise<SocialStory> {
  const response = await fetch(`${SEL_API_BASE}/social-stories/${storyId}`);
  if (!response.ok) throw new Error('Failed to fetch story');
  return response.json();
}

export async function markStoryCompleted(learnerId: string, storyId: string): Promise<void> {
  const response = await fetch(`${SEL_API_BASE}/social-stories/${storyId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ learnerId }),
  });
  if (!response.ok) throw new Error('Failed to mark story as completed');
}

export async function toggleStoryFavorite(
  learnerId: string,
  storyId: string,
  favorite: boolean
): Promise<void> {
  const response = await fetch(`${SEL_API_BASE}/social-stories/${storyId}/favorite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ learnerId, favorite }),
  });
  if (!response.ok) throw new Error('Failed to update favorite status');
}

// Self-Advocacy APIs

export async function getSelfAdvocacyTools(): Promise<SelfAdvocacyTool[]> {
  const response = await fetch(`${SEL_API_BASE}/self-advocacy-tools`);
  if (!response.ok) throw new Error('Failed to fetch advocacy tools');
  return response.json();
}

export async function getAdvocacyToolById(toolId: string): Promise<SelfAdvocacyTool> {
  const response = await fetch(`${SEL_API_BASE}/self-advocacy-tools/${toolId}`);
  if (!response.ok) throw new Error('Failed to fetch advocacy tool');
  return response.json();
}

// Progress APIs

export async function getSELProgress(learnerId: string): Promise<SELProgress> {
  const response = await fetch(`${SEL_API_BASE}/progress/${learnerId}`);
  if (!response.ok) throw new Error('Failed to fetch SEL progress');
  return response.json();
}
