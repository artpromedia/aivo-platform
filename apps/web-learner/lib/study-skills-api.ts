// Study Skills API Client - Note-Taking Templates, Study Guides, Memory Techniques, and Test Prep Tools

// Note-Taking Template Types
export interface NoteTemplate {
  id: string;
  userId: string;
  name: string;
  description?: string;
  type: 'cornell' | 'outline' | 'mindMap' | 'twoColumn' | 'custom';
  sections: NoteSection[];
  backgroundColor?: string;
  fontSize?: number;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface NoteSection {
  id: string;
  title: string;
  type: 'heading' | 'paragraph' | 'bulletList' | 'numberedList' | 'table' | 'image';
  content: string;
  order: number;
  formatting?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    color?: string;
    backgroundColor?: string;
  };
}

export interface Note {
  id: string;
  userId: string;
  templateId?: string;
  subject: string;
  title: string;
  sections: NoteSection[];
  lastEdited: string;
  wordCount: number;
  tags: string[];
}

// Study Guide Types
export interface StudyGuideSection {
  id: string;
  title: string;
  type: 'overview' | 'keyTerms' | 'practice' | 'summary' | 'quiz' | 'resources';
  content: string;
  order: number;
}

export interface KeyTerm {
  id: string;
  term: string;
  definition: string;
  examples?: string[];
  category?: string;
}

export interface PracticeQuestion {
  id: string;
  question: string;
  type: 'multipleChoice' | 'trueFalse' | 'shortAnswer' | 'essay';
  options?: string[];
  correctAnswer?: string | string[];
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface StudyGuide {
  id: string;
  userId: string;
  subject: string;
  topic: string;
  description?: string;
  sections: StudyGuideSection[];
  keyTerms: KeyTerm[];
  practiceQuestions: PracticeQuestion[];
  estimatedStudyTime: number; // minutes
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

// Memory Technique Types
export interface MemoryTechnique {
  id: string;
  userId: string;
  name: string;
  type: 'mnemonic' | 'visualization' | 'chunking' | 'association' | 'storyMethod' | 'custom';
  description: string;
  steps: string[];
  examples?: string[];
  subject?: string;
  effectiveness: number; // 1-5 rating
  timesUsed: number;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryCard {
  id: string;
  userId: string;
  techniqueId?: string;
  front: string;
  back: string;
  subject: string;
  deck: string;
  lastReviewed?: string;
  nextReview?: string;
  correctCount: number;
  incorrectCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

// Test Prep Types
export interface TestPrepPlan {
  id: string;
  userId: string;
  testName: string;
  testDate: string;
  subject: string;
  description?: string;
  studySessions: StudySession[];
  topics: string[];
  progress: number; // 0-100
  createdAt: string;
  updatedAt: string;
}

export interface StudySession {
  id: string;
  date: string;
  time: string;
  duration: number; // minutes
  topics: string[];
  activities: string[];
  isCompleted: boolean;
  completedAt?: string;
  notes?: string;
}

export interface PracticeTest {
  id: string;
  userId: string;
  testPrepPlanId?: string;
  name: string;
  subject: string;
  questions: PracticeQuestion[];
  duration: number; // minutes
  score?: number;
  completedAt?: string;
  createdAt: string;
}

export interface TestAnalytics {
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  averageTimePerQuestion: number; // seconds
  strongTopics: string[];
  weakTopics: string[];
  recommendedFocus: string[];
}

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_STUDY_SKILLS_API_URL || 'http://localhost:8091';

// Note-Taking Template API Functions
export async function getNoteTemplates(userId: string): Promise<NoteTemplate[]> {
  const response = await fetch(`${API_BASE_URL}/note-templates?userId=${userId}`);
  if (!response.ok) throw new Error('Failed to fetch note templates');
  return response.json();
}

export async function getNoteTemplate(templateId: string): Promise<NoteTemplate> {
  const response = await fetch(`${API_BASE_URL}/note-templates/${templateId}`);
  if (!response.ok) throw new Error('Failed to fetch note template');
  return response.json();
}

export async function createNoteTemplate(data: {
  userId: string;
  name: string;
  description?: string;
  type: NoteTemplate['type'];
}): Promise<NoteTemplate> {
  const response = await fetch(`${API_BASE_URL}/note-templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create note template');
  return response.json();
}

export async function updateNoteTemplate(
  templateId: string,
  updates: Partial<NoteTemplate>
): Promise<NoteTemplate> {
  const response = await fetch(`${API_BASE_URL}/note-templates/${templateId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update note template');
  return response.json();
}

export async function deleteNoteTemplate(templateId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/note-templates/${templateId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete note template');
}

export async function getNotes(userId: string): Promise<Note[]> {
  const response = await fetch(`${API_BASE_URL}/notes?userId=${userId}`);
  if (!response.ok) throw new Error('Failed to fetch notes');
  return response.json();
}

export async function getNote(noteId: string): Promise<Note> {
  const response = await fetch(`${API_BASE_URL}/notes/${noteId}`);
  if (!response.ok) throw new Error('Failed to fetch note');
  return response.json();
}

export async function createNote(data: {
  userId: string;
  templateId?: string;
  subject: string;
  title: string;
}): Promise<Note> {
  const response = await fetch(`${API_BASE_URL}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create note');
  return response.json();
}

export async function updateNote(noteId: string, updates: Partial<Note>): Promise<Note> {
  const response = await fetch(`${API_BASE_URL}/notes/${noteId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update note');
  return response.json();
}

export async function deleteNote(noteId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/notes/${noteId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete note');
}

// Study Guide API Functions
export async function getStudyGuides(userId: string): Promise<StudyGuide[]> {
  const response = await fetch(`${API_BASE_URL}/study-guides?userId=${userId}`);
  if (!response.ok) throw new Error('Failed to fetch study guides');
  return response.json();
}

export async function getStudyGuide(guideId: string): Promise<StudyGuide> {
  const response = await fetch(`${API_BASE_URL}/study-guides/${guideId}`);
  if (!response.ok) throw new Error('Failed to fetch study guide');
  return response.json();
}

export async function createStudyGuide(data: {
  userId: string;
  subject: string;
  topic: string;
  description?: string;
}): Promise<StudyGuide> {
  const response = await fetch(`${API_BASE_URL}/study-guides`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create study guide');
  return response.json();
}

export async function updateStudyGuide(
  guideId: string,
  updates: Partial<StudyGuide>
): Promise<StudyGuide> {
  const response = await fetch(`${API_BASE_URL}/study-guides/${guideId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update study guide');
  return response.json();
}

export async function deleteStudyGuide(guideId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/study-guides/${guideId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete study guide');
}

export async function addKeyTerm(guideId: string, term: Omit<KeyTerm, 'id'>): Promise<StudyGuide> {
  const response = await fetch(`${API_BASE_URL}/study-guides/${guideId}/key-terms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(term),
  });
  if (!response.ok) throw new Error('Failed to add key term');
  return response.json();
}

export async function addPracticeQuestion(
  guideId: string,
  question: Omit<PracticeQuestion, 'id'>
): Promise<StudyGuide> {
  const response = await fetch(`${API_BASE_URL}/study-guides/${guideId}/practice-questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(question),
  });
  if (!response.ok) throw new Error('Failed to add practice question');
  return response.json();
}

// Memory Technique API Functions
export async function getMemoryTechniques(userId: string): Promise<MemoryTechnique[]> {
  const response = await fetch(`${API_BASE_URL}/memory-techniques?userId=${userId}`);
  if (!response.ok) throw new Error('Failed to fetch memory techniques');
  return response.json();
}

export async function getMemoryTechnique(techniqueId: string): Promise<MemoryTechnique> {
  const response = await fetch(`${API_BASE_URL}/memory-techniques/${techniqueId}`);
  if (!response.ok) throw new Error('Failed to fetch memory technique');
  return response.json();
}

export async function createMemoryTechnique(data: {
  userId: string;
  name: string;
  type: MemoryTechnique['type'];
  description: string;
  steps: string[];
}): Promise<MemoryTechnique> {
  const response = await fetch(`${API_BASE_URL}/memory-techniques`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create memory technique');
  return response.json();
}

export async function updateMemoryTechnique(
  techniqueId: string,
  updates: Partial<MemoryTechnique>
): Promise<MemoryTechnique> {
  const response = await fetch(`${API_BASE_URL}/memory-techniques/${techniqueId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update memory technique');
  return response.json();
}

export async function deleteMemoryTechnique(techniqueId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/memory-techniques/${techniqueId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete memory technique');
}

export async function getMemoryCards(userId: string, deck?: string): Promise<MemoryCard[]> {
  const url = deck
    ? `${API_BASE_URL}/memory-cards?userId=${userId}&deck=${deck}`
    : `${API_BASE_URL}/memory-cards?userId=${userId}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch memory cards');
  return response.json();
}

export async function createMemoryCard(data: {
  userId: string;
  front: string;
  back: string;
  subject: string;
  deck: string;
  techniqueId?: string;
}): Promise<MemoryCard> {
  const response = await fetch(`${API_BASE_URL}/memory-cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create memory card');
  return response.json();
}

export async function reviewMemoryCard(
  cardId: string,
  correct: boolean
): Promise<MemoryCard> {
  const response = await fetch(`${API_BASE_URL}/memory-cards/${cardId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correct }),
  });
  if (!response.ok) throw new Error('Failed to review memory card');
  return response.json();
}

export async function deleteMemoryCard(cardId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/memory-cards/${cardId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete memory card');
}

// Test Prep API Functions
export async function getTestPrepPlans(userId: string): Promise<TestPrepPlan[]> {
  const response = await fetch(`${API_BASE_URL}/test-prep-plans?userId=${userId}`);
  if (!response.ok) throw new Error('Failed to fetch test prep plans');
  return response.json();
}

export async function getTestPrepPlan(planId: string): Promise<TestPrepPlan> {
  const response = await fetch(`${API_BASE_URL}/test-prep-plans/${planId}`);
  if (!response.ok) throw new Error('Failed to fetch test prep plan');
  return response.json();
}

export async function createTestPrepPlan(data: {
  userId: string;
  testName: string;
  testDate: string;
  subject: string;
  description?: string;
}): Promise<TestPrepPlan> {
  const response = await fetch(`${API_BASE_URL}/test-prep-plans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create test prep plan');
  return response.json();
}

export async function updateTestPrepPlan(
  planId: string,
  updates: Partial<TestPrepPlan>
): Promise<TestPrepPlan> {
  const response = await fetch(`${API_BASE_URL}/test-prep-plans/${planId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update test prep plan');
  return response.json();
}

export async function deleteTestPrepPlan(planId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/test-prep-plans/${planId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete test prep plan');
}

export async function completeStudySession(planId: string, sessionId: string): Promise<TestPrepPlan> {
  const response = await fetch(`${API_BASE_URL}/test-prep-plans/${planId}/sessions/${sessionId}/complete`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to complete study session');
  return response.json();
}

export async function getPracticeTests(userId: string): Promise<PracticeTest[]> {
  const response = await fetch(`${API_BASE_URL}/practice-tests?userId=${userId}`);
  if (!response.ok) throw new Error('Failed to fetch practice tests');
  return response.json();
}

export async function createPracticeTest(data: {
  userId: string;
  name: string;
  subject: string;
  testPrepPlanId?: string;
  duration: number;
}): Promise<PracticeTest> {
  const response = await fetch(`${API_BASE_URL}/practice-tests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create practice test');
  return response.json();
}

export async function submitPracticeTest(
  testId: string,
  answers: Record<string, string | string[]>
): Promise<{ test: PracticeTest; analytics: TestAnalytics }> {
  const response = await fetch(`${API_BASE_URL}/practice-tests/${testId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers }),
  });
  if (!response.ok) throw new Error('Failed to submit practice test');
  return response.json();
}

export async function getTestAnalytics(testId: string): Promise<TestAnalytics> {
  const response = await fetch(`${API_BASE_URL}/practice-tests/${testId}/analytics`);
  if (!response.ok) throw new Error('Failed to fetch test analytics');
  return response.json();
}
