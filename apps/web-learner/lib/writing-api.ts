/**
 * Writing Tools API Client
 * 
 * Provides access to writing assistance features:
 * - Graphic Organizers for structuring ideas
 * - Sentence Starters to overcome writer's block
 * - Grammar Help for writing corrections
 * - Writing Templates for different formats
 */

const API_BASE_URL = 'http://localhost:8086/api/writing';

// ============================================================================
// Graphic Organizers Types
// ============================================================================

export interface GraphicOrganizer {
  id: string;
  name: string;
  type: 'web' | 'venn' | 'sequence' | 'compare-contrast' | 'cause-effect' | 'kwl' | 'story-map' | 'outline';
  description: string;
  best_for: string;
  icon: string;
}

export interface OrganizerContent {
  organizerId: string;
  content: Record<string, any>; // Flexible content for different organizer types
  timestamp: string;
}

export interface SavedOrganizer {
  id: string;
  learnerId: string;
  organizerId: string;
  name: string;
  content: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Sentence Starters Types
// ============================================================================

export interface SentenceStarter {
  id: string;
  category: string;
  subcategory: string;
  starters: string[];
  examples: string[];
}

export interface StarterCategory {
  category: string;
  subcategories: string[];
  description: string;
}

export interface StarterUsage {
  learnerId: string;
  starterId: string;
  starter: string;
  completedSentence: string;
  timestamp: string;
}

// ============================================================================
// Grammar Help Types
// ============================================================================

export interface GrammarCheck {
  text: string;
  issues: GrammarIssue[];
  score: number;
  suggestions: string[];
}

export interface GrammarIssue {
  type: 'spelling' | 'grammar' | 'punctuation' | 'style' | 'clarity';
  message: string;
  position: {
    start: number;
    end: number;
  };
  suggestions: string[];
  severity: 'error' | 'warning' | 'info';
  explanation?: string;
}

export interface GrammarRule {
  id: string;
  name: string;
  category: string;
  description: string;
  examples: {
    incorrect: string;
    correct: string;
    explanation: string;
  }[];
}

export interface GrammarTip {
  id: string;
  title: string;
  category: string;
  tip: string;
  examples: string[];
}

// ============================================================================
// Writing Templates Types
// ============================================================================

export interface WritingTemplate {
  id: string;
  name: string;
  type: 'essay' | 'report' | 'story' | 'letter' | 'email' | 'paragraph' | 'poem' | 'persuasive';
  description: string;
  gradeLevel: string;
  sections: TemplateSection[];
  icon?: string;
}

export interface TemplateSection {
  id: string;
  title: string;
  description: string;
  prompts: string[];
  example?: string;
  required: boolean;
  prompt?: string;
  minWords?: number;
  placeholder?: string;
}

export interface ProjectSection extends TemplateSection {
  content: string;
}

export interface WritingProject {
  id: string;
  learnerId: string;
  templateId: string;
  title: string;
  sections: ProjectSection[];
  createdAt: string;
  lastModified: string;
  status?: 'draft' | 'in-progress' | 'completed';
}

// ============================================================================
// Graphic Organizers API Functions
// ============================================================================

/**
 * Get all available graphic organizers
 */
export async function getGraphicOrganizers(): Promise<GraphicOrganizer[]> {
  const response = await fetch(`${API_BASE_URL}/organizers`);
  if (!response.ok) throw new Error('Failed to fetch organizers');
  return response.json();
}

/**
 * Save organizer content
 */
export async function saveOrganizerContent(
  learnerId: string,
  organizerId: string,
  name: string,
  content: Record<string, any>
): Promise<SavedOrganizer> {
  const response = await fetch(`${API_BASE_URL}/organizers/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ learnerId, organizerId, name, content }),
  });
  if (!response.ok) throw new Error('Failed to save organizer');
  return response.json();
}

/**
 * Get saved organizers for a learner
 */
export async function getSavedOrganizers(learnerId: string): Promise<SavedOrganizer[]> {
  const response = await fetch(`${API_BASE_URL}/organizers/saved/${learnerId}`);
  if (!response.ok) throw new Error('Failed to fetch saved organizers');
  return response.json();
}

/**
 * Export organizer to text format
 */
export async function exportOrganizer(organizerId: string, content: Record<string, any>): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/organizers/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ organizerId, content }),
  });
  if (!response.ok) throw new Error('Failed to export organizer');
  const data = await response.json();
  return data.text;
}

// ============================================================================
// Sentence Starters API Functions
// ============================================================================

/**
 * Get all sentence starter categories
 */
export async function getStarterCategories(): Promise<StarterCategory[]> {
  const response = await fetch(`${API_BASE_URL}/starters/categories`);
  if (!response.ok) throw new Error('Failed to fetch categories');
  return response.json();
}

/**
 * Get sentence starters by category and subcategory
 */
export async function getSentenceStarters(
  category: string,
  subcategory?: string
): Promise<SentenceStarter[]> {
  const url = subcategory
    ? `${API_BASE_URL}/starters?category=${category}&subcategory=${subcategory}`
    : `${API_BASE_URL}/starters?category=${category}`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch starters');
  return response.json();
}

/**
 * Log sentence starter usage
 */
export async function logStarterUsage(usage: StarterUsage): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/starters/usage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(usage),
  });
  if (!response.ok) throw new Error('Failed to log usage');
}

/**
 * Get random sentence starters
 */
export async function getRandomStarters(count: number = 5): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/starters/random?count=${count}`);
  if (!response.ok) throw new Error('Failed to fetch random starters');
  const data = await response.json();
  return data.starters;
}

// ============================================================================
// Grammar Help API Functions
// ============================================================================

/**
 * Check text for grammar issues
 */
export async function checkGrammar(text: string): Promise<GrammarCheck> {
  const response = await fetch(`${API_BASE_URL}/grammar/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) throw new Error('Failed to check grammar');
  return response.json();
}

/**
 * Get all grammar rules
 */
export async function getGrammarRules(): Promise<GrammarRule[]> {
  const response = await fetch(`${API_BASE_URL}/grammar/rules`);
  if (!response.ok) throw new Error('Failed to fetch grammar rules');
  return response.json();
}

/**
 * Get grammar rules by category
 */
export async function getGrammarRulesByCategory(category: string): Promise<GrammarRule[]> {
  const response = await fetch(`${API_BASE_URL}/grammar/rules?category=${category}`);
  if (!response.ok) throw new Error('Failed to fetch grammar rules');
  return response.json();
}

/**
 * Get grammar tips
 */
export async function getGrammarTips(): Promise<GrammarTip[]> {
  const response = await fetch(`${API_BASE_URL}/grammar/tips`);
  if (!response.ok) throw new Error('Failed to fetch grammar tips');
  return response.json();
}

/**
 * Apply grammar suggestion
 */
export async function applyGrammarSuggestion(
  text: string,
  issue: GrammarIssue,
  suggestionIndex: number
): Promise<string> {
  const before = text.substring(0, issue.position.start);
  const after = text.substring(issue.position.end);
  return before + issue.suggestions[suggestionIndex] + after;
}

// ============================================================================
// Writing Templates API Functions
// ============================================================================

/**
 * Get all writing templates
 */
export async function getWritingTemplates(): Promise<WritingTemplate[]> {
  const response = await fetch(`${API_BASE_URL}/templates`);
  if (!response.ok) throw new Error('Failed to fetch templates');
  return response.json();
}

/**
 * Get templates by type
 */
export async function getTemplatesByType(type: string): Promise<WritingTemplate[]> {
  const response = await fetch(`${API_BASE_URL}/templates?type=${type}`);
  if (!response.ok) throw new Error('Failed to fetch templates');
  return response.json();
}

/**
 * Get a specific template
 */
export async function getTemplate(templateId: string): Promise<WritingTemplate> {
  const response = await fetch(`${API_BASE_URL}/templates/${templateId}`);
  if (!response.ok) throw new Error('Failed to fetch template');
  return response.json();
}

/**
 * Create a new writing project from template
 */
export async function createWritingProject(
  learnerId: string,
  data: {
    templateId: string;
    title: string;
    sections: ProjectSection[];
  }
): Promise<WritingProject> {
  const response = await fetch(`${API_BASE_URL}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ learnerId, ...data }),
  });
  if (!response.ok) throw new Error('Failed to create project');
  return response.json();
}

/**
 * Update writing project
 */
export async function updateWritingProject(
  learnerId: string,
  projectId: string,
  data: {
    title: string;
    sections: ProjectSection[];
  }
): Promise<WritingProject> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update project');
  return response.json();
}

/**
 * Get writing projects for a learner
 */
export async function getWritingProjects(learnerId: string): Promise<WritingProject[]> {
  const response = await fetch(`${API_BASE_URL}/projects?learnerId=${learnerId}`);
  if (!response.ok) throw new Error('Failed to fetch projects');
  return response.json();
}

/**
 * Delete a writing project
 */
export async function deleteWritingProject(learnerId: string, projectId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}?learnerId=${learnerId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete project');
}

/**
 * Export project to PDF or DOCX
 */
export async function exportProject(
  learnerId: string,
  projectId: string,
  format: 'pdf' | 'docx'
): Promise<Blob> {
  const response = await fetch(
    `${API_BASE_URL}/projects/${projectId}/export?format=${format}&learnerId=${learnerId}`
  );
  if (!response.ok) throw new Error('Failed to export project');
  return response.blob();
}
