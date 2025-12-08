/**
 * External Service Clients
 *
 * Clients for communicating with other AIVO services.
 */

import { config } from '../config.js';
import type { SkillInfo } from '../types/domain.js';

// ══════════════════════════════════════════════════════════════════════════════
// LEARNER MODEL SERVICE (Virtual Brain)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Validate that a skill exists and return its info
 */
export async function getSkillById(skillId: string): Promise<SkillInfo | null> {
  try {
    const response = await fetch(`${config.learnerModelSvcUrl}/skills/${skillId}`);
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`Failed to fetch skill: ${response.statusText}`);
    }
    const data = await response.json() as SkillInfo;
    return data;
  } catch (error) {
    // Log but don't fail - skill service might be unavailable
    console.warn(`Failed to fetch skill ${skillId}:`, error);
    return null;
  }
}

/**
 * Get multiple skills by IDs (batch)
 */
export async function getSkillsByIds(skillIds: string[]): Promise<Map<string, SkillInfo>> {
  const result = new Map<string, SkillInfo>();
  if (skillIds.length === 0) return result;

  try {
    const response = await fetch(`${config.learnerModelSvcUrl}/skills?ids=${skillIds.join(',')}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch skills: ${response.statusText}`);
    }
    const data = await response.json() as { skills: SkillInfo[] };
    for (const skill of data.skills || []) {
      result.set(skill.id, skill);
    }
  } catch (error) {
    console.warn('Failed to batch fetch skills:', error);
  }

  return result;
}

/**
 * Validate that a skill exists (simple check)
 */
export async function validateSkillId(skillId: string): Promise<boolean> {
  const skill = await getSkillById(skillId);
  return skill !== null;
}

// ══════════════════════════════════════════════════════════════════════════════
// SESSION SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export interface SessionInfo {
  id: string;
  learnerId: string;
  tenantId: string;
  status: string;
  startedAt: Date | null;
  endedAt: Date | null;
}

/**
 * Validate that a session exists and return its info
 */
export async function getSessionById(sessionId: string): Promise<SessionInfo | null> {
  try {
    const response = await fetch(`${config.sessionSvcUrl}/sessions/${sessionId}`);
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`Failed to fetch session: ${response.statusText}`);
    }
    const data = await response.json() as SessionInfo;
    return data;
  } catch (error) {
    console.warn(`Failed to fetch session ${sessionId}:`, error);
    return null;
  }
}

/**
 * Validate that a session exists (simple check)
 */
export async function validateSessionId(sessionId: string): Promise<boolean> {
  const session = await getSessionById(sessionId);
  return session !== null;
}
