// Public API for @aivo/onboarding-wizard
export type {
  OnboardingRole,
  OnboardingStep,
  OnboardingFlow,
  OnboardingProgress,
  StepStatus,
  StepWithStatus,
} from './types.js';

export {
  getStepsWithStatus,
  getCompletionPercentage,
  getNextIncompleteStep,
  isFlowComplete,
} from './types.js';

export { districtAdminFlow } from './flows/district-admin.js';
export { teacherFlow } from './flows/teacher.js';
export { parentFlow } from './flows/parent.js';
export { getFlowForRole, getAllFlows } from './flows/index.js';
