export { districtAdminFlow } from './district-admin.js';
export { teacherFlow } from './teacher.js';
export { parentFlow } from './parent.js';

import type { OnboardingFlow, OnboardingRole } from '../types.js';
import { districtAdminFlow } from './district-admin.js';
import { teacherFlow } from './teacher.js';
import { parentFlow } from './parent.js';

const flowsByRole: Record<OnboardingRole, OnboardingFlow> = {
  district_admin: districtAdminFlow,
  teacher: teacherFlow,
  parent: parentFlow,
};

export function getFlowForRole(role: OnboardingRole): OnboardingFlow {
  return flowsByRole[role];
}

export function getAllFlows(): OnboardingFlow[] {
  return Object.values(flowsByRole);
}
