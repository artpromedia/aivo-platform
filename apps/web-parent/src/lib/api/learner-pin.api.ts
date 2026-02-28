/**
 * Learner PIN API Client
 *
 * Type-safe API functions for managing learner login PINs.
 * Parents use these to change or check their child's PIN.
 */

import { apiClient } from './client';

// ============================================================================
// Types
// ============================================================================

export interface ChangeLearnerPinRequest {
  newPin: string;
  confirmPin: string;
}

export interface ChangeLearnerPinResponse {
  success: boolean;
  message: string;
}

export interface LearnerPinStatusResponse {
  hasPin: boolean;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Change a learner's 6-digit login PIN.
 * Requires parent authentication and ownership of the learner.
 */
export async function changeLearnerPin(
  learnerId: string,
  body: ChangeLearnerPinRequest
): Promise<ChangeLearnerPinResponse> {
  return apiClient.patch<ChangeLearnerPinResponse>(`/api/v1/learner/${learnerId}/pin`, body);
}

/**
 * Check whether a learner has a PIN set.
 * Does not reveal the actual PIN value.
 */
export async function getLearnerPinStatus(learnerId: string): Promise<LearnerPinStatusResponse> {
  return apiClient.get<LearnerPinStatusResponse>(`/api/v1/learner/${learnerId}/pin-status`);
}
