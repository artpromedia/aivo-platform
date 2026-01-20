/**
 * Reading Tools API Client
 * Connects to reading-svc microservice
 */

const READING_API_BASE = process.env.NEXT_PUBLIC_READING_API_URL || 'http://localhost:8084/api/reading';

// Text-to-Speech Types

export interface TTSVoice {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female' | 'neutral';
  rate: number; // 0.5 - 2.0
  pitch: number; // 0.5 - 2.0
}

export interface TTSSettings {
  learnerId: string;
  voiceId: string;
  rate: number;
  pitch: number;
  volume: number;
  highlightText: boolean;
  autoScroll: boolean;
}

export interface ReadingSession {
  id: string;
  learnerId: string;
  contentId?: string;
  text: string;
  timestamp: string;
  duration: number;
  wordsRead: number;
  pauseCount: number;
  comprehensionScore?: number;
}

// Word Prediction Types

export interface WordSuggestion {
  word: string;
  confidence: number;
  context: string;
  frequency: number;
}

export interface PredictionSettings {
  learnerId: string;
  enabled: boolean;
  suggestionCount: number;
  contextWords: number;
  learningMode: boolean;
  domains: string[];
  maxSuggestions?: number;
  minConfidence?: number;
  useContext?: boolean;
  learnFromUser?: boolean;
  suggestPunctuation?: boolean;
}

export interface TypingSession {
  id: string;
  learnerId: string;
  timestamp: string;
  wordsTyped: number;
  suggestionsAccepted: number;
  timeSavedSeconds: number;
  text?: string;
  duration?: number;
}

// Reading Comprehension Types

export interface ComprehensionStrategy {
  id: string;
  name: string;
  type: 'preview' | 'during' | 'after';
  description: string;
  steps: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  icon?: string;
  category?: string;
  example?: string;
}

export interface ComprehensionQuestion {
  id: string;
  contentId: string;
  question: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'inference';
  options?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: number;
  passage?: string;
}

export interface ComprehensionResult {
  id: string;
  learnerId: string;
  contentId: string;
  timestamp: string;
  questionsAnswered: number;
  correctAnswers: number;
  timeSpent: number;
  strategiesUsed: string[];
  score?: number;
  totalQuestions?: number;
  feedback?: string;
}

// Vocabulary Types

export interface VocabularyWord {
  id: string;
  word: string;
  definition: string;
  partOfSpeech: string;
  difficulty: number;
  example: string;
  synonyms: string[];
  antonyms: string[];
  imageUrl?: string;
  audioUrl?: string;
}

export interface VocabularyList {
  id: string;
  learnerId: string;
  name: string;
  description: string;
  words: VocabularyWord[];
  createdAt: string;
  lastReviewed?: string;
  masteryLevel: number;
}

export interface VocabularyProgress {
  learnerId: string;
  totalWords: number;
  masteredWords: number;
  reviewingWords: number;
  newWords: number;
  weeklyGoal: number;
  currentStreak: number;
  overallAccuracy?: number;
  recentActivity?: Array<{
    listName: string;
    date: string;
    score: number;
    correctAnswers: number;
    totalQuestions: number;
  }>;
}

export interface FlashcardResult {
  wordId: string;
  correct: boolean;
  timeSpent?: number;
  timestamp?: string;
}

// Text-to-Speech APIs

export async function getTTSVoices(): Promise<TTSVoice[]> {
  const response = await fetch(`${READING_API_BASE}/tts/voices`);
  if (!response.ok) throw new Error('Failed to fetch voices');
  return response.json();
}

export async function getTTSSettings(learnerId: string): Promise<TTSSettings> {
  const response = await fetch(`${READING_API_BASE}/tts/settings/${learnerId}`);
  if (!response.ok) throw new Error('Failed to fetch TTS settings');
  return response.json();
}

export async function updateTTSSettings(settings: TTSSettings): Promise<void> {
  const response = await fetch(`${READING_API_BASE}/tts/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!response.ok) throw new Error('Failed to update TTS settings');
}

export async function saveReadingSession(session: Omit<ReadingSession, 'id'>): Promise<ReadingSession> {
  const response = await fetch(`${READING_API_BASE}/tts/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(session),
  });
  if (!response.ok) throw new Error('Failed to save reading session');
  return response.json();
}

// Word Prediction APIs

export async function getWordSuggestions(
  contextOrLearnerId: string,
  currentWordOrCount?: string | number,
  currentWord?: string
): Promise<WordSuggestion[]> {
  // Support both old (learnerId, context, currentWord) and new (text, maxSuggestions) signatures
  const body = typeof currentWordOrCount === 'number'
    ? { text: contextOrLearnerId, maxSuggestions: currentWordOrCount }
    : { learnerId: contextOrLearnerId, context: currentWordOrCount, currentWord };
  const response = await fetch(`${READING_API_BASE}/prediction/suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('Failed to get suggestions');
  return response.json();
}

export async function getPredictionSettings(learnerId: string): Promise<PredictionSettings> {
  const response = await fetch(`${READING_API_BASE}/prediction/settings/${learnerId}`);
  if (!response.ok) throw new Error('Failed to fetch prediction settings');
  return response.json();
}

export async function updatePredictionSettings(settings: PredictionSettings): Promise<void> {
  const response = await fetch(`${READING_API_BASE}/prediction/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!response.ok) throw new Error('Failed to update prediction settings');
}

export async function saveTypingSession(session: Omit<TypingSession, 'id'>): Promise<void> {
  const response = await fetch(`${READING_API_BASE}/prediction/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(session),
  });
  if (!response.ok) throw new Error('Failed to save typing session');
}

// Reading Comprehension APIs

export async function getComprehensionStrategies(): Promise<ComprehensionStrategy[]> {
  const response = await fetch(`${READING_API_BASE}/comprehension/strategies`);
  if (!response.ok) throw new Error('Failed to fetch strategies');
  return response.json();
}

export async function getComprehensionQuestions(contentId?: string): Promise<ComprehensionQuestion[]> {
  const url = contentId 
    ? `${READING_API_BASE}/comprehension/questions/${contentId}`
    : `${READING_API_BASE}/comprehension/questions`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch questions');
  return response.json();
}

export async function submitComprehensionResult(
  result: Partial<ComprehensionResult> & { learnerId: string; questionIds?: string[]; answers?: string[]; timestamp?: string }
): Promise<ComprehensionResult> {
  const response = await fetch(`${READING_API_BASE}/comprehension/results`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result),
  });
  if (!response.ok) throw new Error('Failed to submit result');
  return response.json();
}

// Vocabulary APIs

export async function getVocabularyLists(learnerId: string): Promise<VocabularyList[]> {
  const response = await fetch(`${READING_API_BASE}/vocabulary/lists?learnerId=${learnerId}`);
  if (!response.ok) throw new Error('Failed to fetch vocabulary lists');
  return response.json();
}

export async function createVocabularyList(
  list: Omit<VocabularyList, 'id' | 'createdAt' | 'masteryLevel' | 'words'> & { words?: VocabularyWord[] }
): Promise<VocabularyList> {
  const response = await fetch(`${READING_API_BASE}/vocabulary/lists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...list, words: list.words || [] }),
  });
  if (!response.ok) throw new Error('Failed to create list');
  return response.json();
}

export async function addWordToList(listId: string, word: string | VocabularyWord): Promise<VocabularyList> {
  const body = typeof word === 'string' ? { wordId: word } : word;
  const response = await fetch(`${READING_API_BASE}/vocabulary/lists/${listId}/words`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('Failed to add word');
  return response.json();
}

export async function searchWords(query: string): Promise<VocabularyWord[]> {
  const response = await fetch(`${READING_API_BASE}/vocabulary/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error('Failed to search words');
  return response.json();
}

export async function getVocabularyProgress(learnerId: string): Promise<VocabularyProgress> {
  const response = await fetch(`${READING_API_BASE}/vocabulary/progress/${learnerId}`);
  if (!response.ok) throw new Error('Failed to fetch progress');
  return response.json();
}

export async function submitFlashcardResults(
  learnerIdOrData: string | { learnerId: string; listId: string; results: FlashcardResult[]; timestamp?: string },
  listId?: string,
  results?: FlashcardResult[]
): Promise<void> {
  const body = typeof learnerIdOrData === 'string'
    ? { learnerId: learnerIdOrData, listId, results }
    : learnerIdOrData;
  const response = await fetch(`${READING_API_BASE}/vocabulary/flashcards/results`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('Failed to submit results');
}
