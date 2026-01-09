/**
 * Services Module
 */

export { ActivitySequencer } from './activity-sequencer.js';

export type { ActivitySequencerDependencies } from './activity-sequencer.js';

export type {
  SequencedActivity,
  SessionPlan,
  SessionPlanOptions,
  ActivityScore,
} from './activity-sequencer-types.js';

// Curriculum-aware content filtering
export {
  CurriculumContentFilter,
  curriculumContentFilter,
} from './curriculum-content-filter.js';

export type {
  CurriculumFilterOptions,
  CurriculumFilterResult,
} from './curriculum-content-filter.js';

// Virtual Brain template system (Main AIVO Brain cloning)
export {
  VirtualBrainTemplateService,
  virtualBrainTemplateService,
} from './virtual-brain-template.js';

export type {
  SkillEstimate,
  CloneResult,
} from './virtual-brain-template.js';
