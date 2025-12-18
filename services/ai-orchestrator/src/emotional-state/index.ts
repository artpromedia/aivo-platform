/**
 * ND-2.3: Emotional State Module
 *
 * Provides anxiety and overwhelm detection, intervention recommendations,
 * and pattern learning for early intervention before learners reach crisis states.
 */

export { EmotionalStateService } from './emotional-state.service.js';
export type { EmotionalStateServiceConfig } from './emotional-state.service.js';

export { AnxietyDetector } from './anxiety-detector.js';
export { OverwhelmDetector } from './overwhelm-detector.js';
export { PatternAnalyzer } from './pattern-analyzer.js';
export { InterventionSelector } from './intervention-selector.js';

export * from './emotional-state.types.js';
