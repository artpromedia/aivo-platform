/**
 * AI Generation Services - Barrel Export
 *
 * Central export for all AI content generation services.
 */

// Types
export * from './types.js';

// Core Services
export { LessonGenerationService } from './lesson-generation.service.js';
export { QuestionGenerationService } from './question-generation.service.js';
export { ExplanationService } from './explanation.service.js';
export { FeedbackService } from './feedback.service.js';

// Support Services
export { ImageGenerationService } from './image-generation.service.js';
export { LearningPathService } from './learning-path.service.js';
export { TranslationService } from './translation.service.js';
export { CostTrackingService } from './cost-tracking.service.js';
export type { UsageRecord, UsageSummary, BudgetConfig } from './cost-tracking.service.js';

// Reading Level & Content Adaptation
export { ReadabilityAnalysisService, LEXILE_GRADE_RANGES } from './readability-analysis.service.js';
export type { ReadabilityAnalysis, LexileEstimateRequest, ReadingLevelEstimate } from './readability-analysis.service.js';
export { ContentAdaptationService } from './content-adaptation.service.js';
export type { ContentAdaptationRequest, AdaptedContent, ScaffoldedContent, BatchAdaptationRequest } from './content-adaptation.service.js';

// Baseline Assessment
export { BaselineQuestionGenerationService } from './baseline-question.service.js';
export type {
  BaselineQuestionRequest,
  BaselineQuestion,
  BaselineQuestionResult,
  GradeBand,
  BaselineDomain,
} from './baseline-question.service.js';
