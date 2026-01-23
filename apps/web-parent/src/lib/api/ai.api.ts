/**
 * AI API Client
 *
 * Type-safe API functions for AI-powered features:
 * - AI Insights for parent dashboard
 * - AI Feedback collection
 * - Writing assistance (proxy to writing-pad-svc)
 */

import type {
  AIInsight,
  AIInsightsResponse,
  AIInsightFeedback,
  AIFeedback,
  AIFeedbackSubmission,
  WritingFeedback,
  WritingFeedbackRequest,
  WritingSuggestion,
  GrammarIssue,
} from '@aivo/ts-types';

import { apiClient } from './client';

// ============================================================================
// Cache Management
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

const CACHE_TTL = {
  insights: 60 * 60 * 1000, // 1 hour
  writing: 60 * 60 * 1000, // 1 hour
  predictions: 30 * 1000, // 30 seconds
};

function getCacheKey(prefix: string, params: Record<string, unknown>): string {
  return `${prefix}:${JSON.stringify(params)}`;
}

function getFromCache(key: string): unknown {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: unknown, ttl: number): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + ttl,
  });
}

function invalidateCache(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

// ============================================================================
// AI Insights API
// ============================================================================

/**
 * Get AI-generated insights for a student
 */
export async function getAIInsights(studentId: string): Promise<AIInsightsResponse> {
  const cacheKey = getCacheKey('insights', { studentId });
  const cached = getFromCache(cacheKey) as AIInsightsResponse | null;
  if (cached) return cached;

  const response = await apiClient.get<AIInsightsResponse>(`/api/ai/insights/parent/${studentId}`);

  setCache(cacheKey, response, CACHE_TTL.insights);
  return response;
}

/**
 * Get a single AI insight by ID
 */
export async function getAIInsight(studentId: string, insightId: string): Promise<AIInsight> {
  return apiClient.get<AIInsight>(`/api/ai/insights/parent/${studentId}/${insightId}`);
}

/**
 * Refresh AI insights (bypasses cache)
 */
export async function refreshAIInsights(studentId: string): Promise<AIInsightsResponse> {
  invalidateCache(`insights:${JSON.stringify({ studentId })}`);

  const response = await apiClient.post<AIInsightsResponse>(
    `/api/ai/insights/parent/${studentId}/refresh`,
    {}
  );

  setCache(getCacheKey('insights', { studentId }), response, CACHE_TTL.insights);
  return response;
}

/**
 * Dismiss an AI insight
 */
export async function dismissAIInsight(
  studentId: string,
  insightId: string
): Promise<{ success: boolean }> {
  invalidateCache('insights');
  return apiClient.post<{ success: boolean }>(
    `/api/ai/insights/parent/${studentId}/${insightId}/dismiss`,
    {}
  );
}

/**
 * Submit feedback on an AI insight
 */
export async function submitAIInsightFeedback(
  feedback: AIInsightFeedback
): Promise<{ success: boolean }> {
  return apiClient.post<{ success: boolean }>(`/api/ai/insights/feedback`, feedback);
}

// ============================================================================
// Writing Assistance API
// ============================================================================

/**
 * Get AI-powered writing feedback
 */
export async function getWritingFeedback(
  request: WritingFeedbackRequest
): Promise<WritingFeedback> {
  // Cache by content hash
  const contentHash = hashContent(request.text);
  const cacheKey = getCacheKey('writing', { hash: contentHash, context: request.context });
  const cached = getFromCache(cacheKey) as WritingFeedback | null;
  if (cached) return cached;

  const response = await apiClient.post<WritingFeedback>(`/api/ai/writing/feedback`, request);

  setCache(cacheKey, response, CACHE_TTL.writing);
  return response;
}

/**
 * Get real-time writing suggestions (lighter-weight than full feedback)
 */
export async function getWritingSuggestions(
  text: string,
  gradeLevel: string,
  types?: string[]
): Promise<WritingSuggestion[]> {
  return apiClient.post<WritingSuggestion[]>(`/api/ai/writing/suggestions`, {
    text,
    gradeLevel,
    types,
  });
}

/**
 * Check grammar and spelling
 */
export async function checkGrammar(text: string, gradeLevel: string): Promise<GrammarIssue[]> {
  return apiClient.post<GrammarIssue[]>(`/api/ai/writing/grammar`, { text, gradeLevel });
}

// ============================================================================
// AI Feedback Collection API
// ============================================================================

/**
 * Submit feedback on an AI response
 */
export async function submitAIFeedback(feedback: AIFeedbackSubmission): Promise<AIFeedback> {
  return apiClient.post<AIFeedback>(`/api/ai/feedback`, feedback);
}

/**
 * Report inappropriate AI content
 */
export async function reportAIContent(
  featureType: AIFeedback['featureType'],
  responseId: string,
  reason: string,
  details?: string
): Promise<{ reportId: string; acknowledged: boolean }> {
  return apiClient.post<{ reportId: string; acknowledged: boolean }>(`/api/ai/feedback/report`, {
    featureType,
    responseId,
    reason,
    details,
  });
}

/**
 * Request clarification on an AI response
 */
export async function requestAIClarification(
  featureType: AIFeedback['featureType'],
  responseId: string,
  question: string
): Promise<{ clarification: string; confidence: number }> {
  return apiClient.post<{ clarification: string; confidence: number }>(`/api/ai/clarification`, {
    featureType,
    responseId,
    question,
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Simple content hash for caching
 */
function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

// ============================================================================
// Export as namespace
// ============================================================================

export const aiApi = {
  // Insights
  getAIInsights,
  getAIInsight,
  refreshAIInsights,
  dismissAIInsight,
  submitAIInsightFeedback,

  // Writing
  getWritingFeedback,
  getWritingSuggestions,
  checkGrammar,

  // Feedback Collection
  submitAIFeedback,
  reportAIContent,
  requestAIClarification,

  // Cache Management
  invalidateCache,
};
