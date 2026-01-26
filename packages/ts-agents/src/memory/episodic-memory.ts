/**
 * EpisodicMemory - Stores and retrieves specific interaction episodes
 */

import { v4 as uuid } from 'uuid';
import type { Episode } from '../core/types';

export interface EpisodicMemoryConfig {
  maxEpisodes: number;
}

export class EpisodicMemory {
  private episodes: Episode[] = [];
  private maxEpisodes: number;

  constructor(maxEpisodes: number = 100) {
    this.maxEpisodes = maxEpisodes;
  }

  /**
   * Record a new episode
   */
  async record(episode: Omit<Episode, 'id'>): Promise<Episode> {
    const newEpisode: Episode = {
      id: uuid(),
      ...episode,
    };

    this.episodes.push(newEpisode);

    // Enforce max episodes limit
    while (this.episodes.length > this.maxEpisodes) {
      this.episodes.shift();
    }

    return newEpisode;
  }

  /**
   * Recall episodes matching a query
   */
  async recall(query: string, limit: number = 10): Promise<Episode[]> {
    const queryLower = query.toLowerCase();
    const scored = this.episodes.map(episode => ({
      episode,
      score: this.calculateRelevance(episode, queryLower),
    }));

    // Sort by relevance score descending
    scored.sort((a, b) => b.score - a.score);

    // Return top matches
    return scored
      .filter(s => s.score > 0)
      .slice(0, limit)
      .map(s => s.episode);
  }

  /**
   * Recall episodes within a time range
   */
  async recallByTimeRange(start: Date, end: Date): Promise<Episode[]> {
    return this.episodes.filter(episode => {
      const timestamp = new Date(episode.timestamp);
      return timestamp >= start && timestamp <= end;
    });
  }

  /**
   * Recall episodes by type
   */
  async recallByType(type: string, limit: number = 10): Promise<Episode[]> {
    return this.episodes
      .filter(episode => episode.type === type)
      .slice(-limit);
  }

  /**
   * Recall episodes involving specific participants
   */
  async recallByParticipant(
    participant: string,
    limit: number = 10
  ): Promise<Episode[]> {
    return this.episodes
      .filter(episode => episode.participants.includes(participant))
      .slice(-limit);
  }

  /**
   * Get the most recent episodes
   */
  async getRecent(limit: number = 10): Promise<Episode[]> {
    return this.episodes.slice(-limit);
  }

  /**
   * Summarize a set of episodes
   */
  async summarize(episodes: Episode[]): Promise<string> {
    if (episodes.length === 0) {
      return 'No episodes to summarize.';
    }

    const summaryParts: string[] = [];

    // Group by type
    const byType = new Map<string, Episode[]>();
    for (const episode of episodes) {
      const typeEpisodes = byType.get(episode.type) || [];
      typeEpisodes.push(episode);
      byType.set(episode.type, typeEpisodes);
    }

    for (const [type, typeEpisodes] of byType) {
      const count = typeEpisodes.length;
      const outcomes = typeEpisodes
        .filter(e => e.outcome)
        .map(e => e.outcome)
        .slice(0, 3);

      let summary = `${count} ${type} episode${count > 1 ? 's' : ''}`;
      if (outcomes.length > 0) {
        summary += ` with outcomes: ${outcomes.join(', ')}`;
      }
      summaryParts.push(summary);
    }

    // Add time range
    if (episodes.length > 0) {
      const sortedByTime = [...episodes].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      const oldest = sortedByTime[0];
      const newest = sortedByTime[sortedByTime.length - 1];
      summaryParts.push(
        `Time range: ${new Date(oldest.timestamp).toISOString()} to ${new Date(newest.timestamp).toISOString()}`
      );
    }

    return summaryParts.join('. ');
  }

  /**
   * Get an episode by ID
   */
  async getById(id: string): Promise<Episode | undefined> {
    return this.episodes.find(e => e.id === id);
  }

  /**
   * Delete an episode by ID
   */
  async delete(id: string): Promise<boolean> {
    const index = this.episodes.findIndex(e => e.id === id);
    if (index !== -1) {
      this.episodes.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Clear all episodes
   */
  clear(): void {
    this.episodes = [];
  }

  /**
   * Get the total count of episodes
   */
  getCount(): number {
    return this.episodes.length;
  }

  /**
   * Export all episodes
   */
  export(): Episode[] {
    return [...this.episodes];
  }

  /**
   * Import episodes
   */
  import(episodes: Episode[]): void {
    this.episodes = [...episodes];
    while (this.episodes.length > this.maxEpisodes) {
      this.episodes.shift();
    }
  }

  /**
   * Calculate relevance score for an episode
   */
  private calculateRelevance(episode: Episode, query: string): number {
    let score = 0;
    const queryTerms = query.split(/\s+/).filter(t => t.length > 2);

    // Check content
    const contentStr = JSON.stringify(episode.content).toLowerCase();
    for (const term of queryTerms) {
      if (contentStr.includes(term)) {
        score += 2;
      }
    }

    // Check type
    if (episode.type.toLowerCase().includes(query)) {
      score += 3;
    }

    // Check outcome
    if (episode.outcome?.toLowerCase().includes(query)) {
      score += 2;
    }

    // Check metadata
    const metadataStr = JSON.stringify(episode.metadata).toLowerCase();
    for (const term of queryTerms) {
      if (metadataStr.includes(term)) {
        score += 1;
      }
    }

    // Recency bonus (newer episodes get higher scores)
    const ageMs = Date.now() - new Date(episode.timestamp).getTime();
    const ageHours = ageMs / (1000 * 60 * 60);
    if (ageHours < 1) score += 3;
    else if (ageHours < 24) score += 2;
    else if (ageHours < 168) score += 1; // Within a week

    return score;
  }
}
