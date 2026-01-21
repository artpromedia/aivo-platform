/**
 * Sensory Matcher Service - STUB
 *
 * Original file backed up to ../sensory.bak/
 */

import type { SensoryProfile, ContentSensoryMetadata } from './sensory-compat-types.js';

export interface MatchResult {
  contentId: string;
  score: number;
  warnings: string[];
}

export class SensoryMatcherService {
  async matchContent(
    profile: SensoryProfile,
    content: ContentSensoryMetadata
  ): Promise<MatchResult> {
    // Stub implementation
    return {
      contentId: content.id,
      score: 100,
      warnings: [],
    };
  }

  async filterContent(
    profile: SensoryProfile,
    contentList: ContentSensoryMetadata[]
  ): Promise<MatchResult[]> {
    // Stub implementation
    return contentList.map((c) => ({
      contentId: c.id,
      score: 100,
      warnings: [],
    }));
  }
}

export const sensoryMatcherService = new SensoryMatcherService();
