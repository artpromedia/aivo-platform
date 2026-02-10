/**
 * Math Support API Client
 * 
 * Provides access to math assistance features:
 * - Virtual Manipulatives for visual math learning
 * - Step-by-Step Solutions with worked examples
 * - Formula Reference library
 * - Practice Problems with difficulty levels
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_MATH_API_URL || 'http://localhost:8085/api/math';

// ============================================================================
// Virtual Manipulatives Types
// ============================================================================

export interface Manipulative {
  id: string;
  name: string;
  type: 'fraction-bars' | 'number-line' | 'base-ten-blocks' | 'algebra-tiles' | 'geometric-shapes' | 'counters';
  description: string;
  grade_level: string;
  icon: string;
}

export interface ManipulativeState {
  manipulativeId: string;
  state: Record<string, any>; // Flexible state for different manipulative types
  timestamp: string;
}

// ============================================================================
// Step-by-Step Solutions Types
// ============================================================================

export interface MathProblem {
  id: string;
  question: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  answer: string;
}

export interface Solution {
  problemId: string;
  steps: SolutionStep[];
  explanation: string;
  hints: string[];
}

export interface SolutionStep {
  stepNumber: number;
  description: string;
  mathematical_notation: string;
  explanation: string;
  visual_aid?: string;
}

export interface SolutionRequest {
  learnerId: string;
  problemId: string;
  timestamp: string;
}

// ============================================================================
// Formula Reference Types
// ============================================================================

export interface Formula {
  id: string;
  name: string;
  formula: string;
  category: 'algebra' | 'geometry' | 'trigonometry' | 'calculus' | 'statistics';
  description: string;
  variables: FormulaVariable[];
  example: string;
  when_to_use: string;
}

export interface FormulaVariable {
  symbol: string;
  name: string;
  description: string;
}

export interface FormulaCategory {
  category: string;
  formulas: Formula[];
}

// ============================================================================
// Practice Problems Types
// ============================================================================

export interface PracticeProblem {
  id: string;
  question: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  options?: string[]; // For multiple choice
  correctAnswer: string;
  explanation: string;
  hint: string;
}

export interface PracticeSet {
  id: string;
  name: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  problems: PracticeProblem[];
}

export interface PracticeResult {
  learnerId: string;
  setId: string;
  answers: string[];
  timestamp: string;
}

export interface PracticeScore {
  setId: string;
  score: number;
  correctAnswers: number;
  totalProblems: number;
  timeSpent: number;
  feedback: string;
  recommendedTopics: string[];
}

// ============================================================================
// Virtual Manipulatives API Functions
// ============================================================================

/**
 * Get all available virtual manipulatives
 */
export async function getManipulatives(): Promise<Manipulative[]> {
  const response = await fetch(`${API_BASE_URL}/manipulatives`);
  if (!response.ok) throw new Error('Failed to fetch manipulatives');
  return response.json();
}

/**
 * Get manipulatives filtered by grade level
 */
export async function getManipulativesByGrade(gradeLevel: string): Promise<Manipulative[]> {
  const response = await fetch(`${API_BASE_URL}/manipulatives?grade=${gradeLevel}`);
  if (!response.ok) throw new Error('Failed to fetch manipulatives');
  return response.json();
}

/**
 * Save manipulative state
 */
export async function saveManipulativeState(state: ManipulativeState): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/manipulatives/state`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  });
  if (!response.ok) throw new Error('Failed to save manipulative state');
}

// ============================================================================
// Step-by-Step Solutions API Functions
// ============================================================================

/**
 * Get a math problem by ID
 */
export async function getProblem(problemId: string): Promise<MathProblem> {
  const response = await fetch(`${API_BASE_URL}/problems/${problemId}`);
  if (!response.ok) throw new Error('Failed to fetch problem');
  return response.json();
}

/**
 * Get step-by-step solution for a problem
 */
export async function getSolution(problemId: string): Promise<Solution> {
  const response = await fetch(`${API_BASE_URL}/problems/${problemId}/solution`);
  if (!response.ok) throw new Error('Failed to fetch solution');
  return response.json();
}

/**
 * Request solution for a custom problem
 */
export async function requestSolution(question: string, topic: string): Promise<Solution> {
  const response = await fetch(`${API_BASE_URL}/solutions/custom`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, topic }),
  });
  if (!response.ok) throw new Error('Failed to request solution');
  return response.json();
}

/**
 * Log solution request for analytics
 */
export async function logSolutionRequest(request: SolutionRequest): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/solutions/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error('Failed to log solution request');
}

// ============================================================================
// Formula Reference API Functions
// ============================================================================

/**
 * Get all formulas
 */
export async function getFormulas(): Promise<Formula[]> {
  const response = await fetch(`${API_BASE_URL}/formulas`);
  if (!response.ok) throw new Error('Failed to fetch formulas');
  return response.json();
}

/**
 * Get formulas by category
 */
export async function getFormulasByCategory(category: string): Promise<Formula[]> {
  const response = await fetch(`${API_BASE_URL}/formulas?category=${category}`);
  if (!response.ok) throw new Error('Failed to fetch formulas');
  return response.json();
}

/**
 * Get all formulas grouped by category
 */
export async function getFormulasGroupedByCategory(): Promise<FormulaCategory[]> {
  const response = await fetch(`${API_BASE_URL}/formulas/grouped`);
  if (!response.ok) throw new Error('Failed to fetch formulas');
  return response.json();
}

/**
 * Search formulas
 */
export async function searchFormulas(query: string): Promise<Formula[]> {
  const response = await fetch(`${API_BASE_URL}/formulas/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error('Failed to search formulas');
  return response.json();
}

// ============================================================================
// Practice Problems API Functions
// ============================================================================

/**
 * Get practice sets by topic
 */
export async function getPracticeSets(topic: string): Promise<PracticeSet[]> {
  const response = await fetch(`${API_BASE_URL}/practice?topic=${encodeURIComponent(topic)}`);
  if (!response.ok) throw new Error('Failed to fetch practice sets');
  return response.json();
}

/**
 * Get a specific practice set
 */
export async function getPracticeSet(setId: string): Promise<PracticeSet> {
  const response = await fetch(`${API_BASE_URL}/practice/${setId}`);
  if (!response.ok) throw new Error('Failed to fetch practice set');
  return response.json();
}

/**
 * Generate custom practice set
 */
export async function generatePracticeSet(
  topic: string,
  difficulty: 'easy' | 'medium' | 'hard',
  count: number
): Promise<PracticeSet> {
  const response = await fetch(`${API_BASE_URL}/practice/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, difficulty, count }),
  });
  if (!response.ok) throw new Error('Failed to generate practice set');
  return response.json();
}

/**
 * Submit practice results
 */
export async function submitPracticeResults(result: PracticeResult): Promise<PracticeScore> {
  const response = await fetch(`${API_BASE_URL}/practice/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result),
  });
  if (!response.ok) throw new Error('Failed to submit practice results');
  return response.json();
}

/**
 * Get practice history for a learner
 */
export async function getPracticeHistory(learnerId: string): Promise<PracticeScore[]> {
  const response = await fetch(`${API_BASE_URL}/practice/history/${learnerId}`);
  if (!response.ok) throw new Error('Failed to fetch practice history');
  return response.json();
}
