/**
 * Educational agents exports
 */

export {
  TutorAgent,
  createTutorAgent,
  type TutorAgentConfig,
  type ScaffoldingStep,
  type LearningProgress,
} from './tutor-agent.js';

export {
  AssessmentAgent,
  createAssessmentAgent,
  type AssessmentConfig,
  type BloomsLevel,
  type DifficultyLevel,
  type Question,
  type Answer,
  type QuestionResult,
  type AssessmentResult,
} from './assessment-agent.js';

export {
  FeedbackAgent,
  createFeedbackAgent,
  type FeedbackAgentConfig,
  type FeedbackTone,
  type FeedbackFocus,
  type FeedbackRequest,
  type StructuredFeedback,
  type ProgressMilestone,
  type LearningGoal,
} from './feedback-agent.js';
