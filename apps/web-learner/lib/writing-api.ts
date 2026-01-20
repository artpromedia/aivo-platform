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
  title?: string;
  createdAt?: string;
  [key: string]: any; // Allow any organizer-specific content fields
}

export interface SavedOrganizer {
  id: string;
  learnerId: string;
  organizerId: string;
  name: string;
  content: OrganizerContent;
  lastModified?: string;
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
  text?: string; // Individual starter text when fetched individually
  purpose?: string;
  name?: string;
  gradeLevel?: string;
  example?: string; // Single example (alias for backward compatibility)
}

export interface StarterCategory {
  id?: string;
  category: string;
  name?: string;
  subcategories: string[];
  description: string;
  starters?: string[]; // When fetched with starters
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

export interface GrammarSuggestion {
  replacement: string;
  explanation?: string;
}

export interface GrammarIssue {
  id?: string;
  type: 'spelling' | 'grammar' | 'punctuation' | 'style' | 'clarity';
  message: string;
  position: {
    start: number;
    end: number;
  };
  suggestions: (string | GrammarSuggestion)[];
  severity: 'error' | 'warning' | 'info';
  explanation?: string;
  category?: string;
  line?: number;
  column?: number;
  context?: string;
  replacement?: string;
  ruleId?: string;
}

export interface GrammarRule {
  id: string;
  name: string;
  title?: string;
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
  content?: string;
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
  contentOrOrganizerId: OrganizerContent | string,
  name?: string,
  content?: Record<string, any>
): Promise<SavedOrganizer> {
  // Support both old (learnerId, organizerId, name, content) and new (learnerId, OrganizerContent) signatures
  const body = typeof contentOrOrganizerId === 'string'
    ? { learnerId, organizerId: contentOrOrganizerId, name, content }
    : { 
        learnerId, 
        organizerId: contentOrOrganizerId.organizerId, 
        name: contentOrOrganizerId.title || 'Untitled',
        content: contentOrOrganizerId 
      };
  const response = await fetch(`${API_BASE_URL}/organizers/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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
 * Export organizer to text/pdf/image format
 */
export async function exportOrganizer(
  learnerId: string,
  contentOrOrganizerId: OrganizerContent | string,
  format?: 'pdf' | 'image' | 'text'
): Promise<Blob> {
  const body = typeof contentOrOrganizerId === 'string'
    ? { learnerId, organizerId: contentOrOrganizerId, format: format || 'text' }
    : { learnerId, organizerId: contentOrOrganizerId.organizerId, content: contentOrOrganizerId, format: format || 'text' };
  const response = await fetch(`${API_BASE_URL}/organizers/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('Failed to export organizer');
  return response.blob();
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
export async function logStarterUsage(
  usageOrLearnerId: StarterUsage | string,
  starterId?: string
): Promise<void> {
  const body = typeof usageOrLearnerId === 'string'
    ? { learnerId: usageOrLearnerId, starterId }
    : usageOrLearnerId;
  const response = await fetch(`${API_BASE_URL}/starters/usage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('Failed to log usage');
}

/**
 * Get random sentence starters
 */
export async function getRandomStarters(count: number = 5): Promise<SentenceStarter[]> {
  const response = await fetch(`${API_BASE_URL}/starters/random?count=${count}`);
  if (!response.ok) throw new Error('Failed to fetch random starters');
  const data = await response.json();
  // Handle both array of strings and array of objects
  if (Array.isArray(data.starters) && typeof data.starters[0] === 'string') {
    return data.starters.map((text: string, index: number) => ({
      id: `random-${index}`,
      text,
      category: 'random',
      subcategory: '',
      starters: [text],
      examples: [],
    }));
  }
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
  issueOrId: GrammarIssue | string,
  suggestionIndex: number
): Promise<{ correctedText: string }> {
  // If issueOrId is a string (issueId), fetch the issue first or use the suggestion directly
  if (typeof issueOrId === 'string') {
    // For now, return the original text; actual implementation would fetch the issue
    const response = await fetch(`${API_BASE_URL}/grammar/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, issueId: issueOrId, suggestionIndex }),
    });
    if (!response.ok) throw new Error('Failed to apply suggestion');
    return response.json();
  }
  
  const issue = issueOrId;
  const before = text.substring(0, issue.position.start);
  const after = text.substring(issue.position.end);
  return { correctedText: before + issue.suggestions[suggestionIndex] + after };
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
