/**
 * Episodic memory implementation for storing specific interactions and events
 */

import type { Episode } from '../core/types.js';

export interface EpisodicMemoryConfig {
  /** Maximum number of episodes to store */
  maxEpisodes?: number;
  /** Retention period in days */
  retentionDays?: number;
  /** Enable automatic summarization */
  autoSummarize?: boolean;
  /** Summarization threshold (number of episodes) */
  summarizationThreshold?: number;
}

export interface EpisodeSummary {
  id: string;
  startDate: Date;
  endDate: Date;
  episodeCount: number;
  summary: string;
  topics: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Episodic memory stores specific interactions, events, and experiences
 * Supports temporal queries and automatic summarization
 */
export class EpisodicMemory {
  private episodes: Episode[] = [];
  private summaries: EpisodeSummary[] = [];
  private readonly maxEpisodes: number;
  private readonly retentionDays: number;
  private readonly autoSummarize: boolean;
  private readonly summarizationThreshold: number;

  constructor(config?: EpisodicMemoryConfig) {
    this.maxEpisodes = config?.maxEpisodes ?? 1000;
    this.retentionDays = config?.retentionDays ?? 30;
    this.autoSummarize = config?.autoSummarize ?? true;
    this.summarizationThreshold = config?.summarizationThreshold ?? 50;
  }

  /**
   * Record a new episode
   */
  async record(episode: Episode): Promise<void> {
    const fullEpisode: Episode = {
      id: episode.id ?? this.generateId(),
      type: episode.type,
      content: episode.content,
      participants: episode.participants,
      context: episode.context,
      timestamp: episode.timestamp ?? new Date(),
      duration: episode.duration,
      outcome: episode.outcome,
      metadata: episode.metadata,
    };

    this.episodes.push(fullEpisode);

    // Enforce max episodes limit
    if (this.episodes.length > this.maxEpisodes) {
      await this.pruneOldEpisodes();
    }

    // Check for auto-summarization
    if (this.autoSummarize && this.shouldSummarize()) {
      await this.createSummary();
    }
  }

  /**
   * Recall episodes matching a query
   */
  async recall(query: string, limit?: number): Promise<Episode[]> {
    const queryLower = query.toLowerCase();
    const maxResults = limit ?? 10;

    const matches = this.episodes.filter(episode => {
      const contentStr = typeof episode.content === 'string'
        ? episode.content
        : JSON.stringify(episode.content);

      return (
        contentStr.toLowerCase().includes(queryLower) ||
        episode.type.toLowerCase().includes(queryLower) ||
        episode.outcome?.toLowerCase().includes(queryLower) ||
        episode.participants?.some(p => p.toLowerCase().includes(queryLower))
      );
    });

    // Sort by recency
    matches.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return matches.slice(0, maxResults);
  }

  /**
   * Recall episodes within a time range
   */
  async recallByTimeRange(start: Date, end: Date): Promise<Episode[]> {
    return this.episodes.filter(
      episode => episode.timestamp >= start && episode.timestamp <= end
    );
  }

  /**
   * Recall episodes by type
   */
  async recallByType(type: string, limit?: number): Promise<Episode[]> {
    const matches = this.episodes.filter(episode => episode.type === type);
    matches.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return limit ? matches.slice(0, limit) : matches;
  }

  /**
   * Recall episodes involving specific participants
   */
  async recallByParticipants(participants: string[], limit?: number): Promise<Episode[]> {
    const participantSet = new Set(participants.map(p => p.toLowerCase()));

    const matches = this.episodes.filter(episode =>
      episode.participants?.some(p => participantSet.has(p.toLowerCase()))
    );

    matches.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return limit ? matches.slice(0, limit) : matches;
  }

  /**
   * Get the most recent episodes
   */
  async getRecent(count: number): Promise<Episode[]> {
    const sorted = [...this.episodes].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
    return sorted.slice(0, count);
  }

  /**
   * Summarize a set of episodes
   */
  async summarize(episodes: Episode[]): Promise<string> {
    if (episodes.length === 0) {
      return 'No episodes to summarize.';
    }

    // Group by type
    const byType = new Map<string, Episode[]>();
    for (const episode of episodes) {
      const existing = byType.get(episode.type) ?? [];
      existing.push(episode);
      byType.set(episode.type, existing);
    }

    const summaryParts: string[] = [];

    for (const [type, typeEpisodes] of byType) {
      const outcomes = typeEpisodes
        .filter(e => e.outcome)
        .map(e => e.outcome);

      const uniqueOutcomes = [...new Set(outcomes)];

      summaryParts.push(
        `${type}: ${typeEpisodes.length} episode(s)` +
        (uniqueOutcomes.length > 0 ? ` - Outcomes: ${uniqueOutcomes.join(', ')}` : '')
      );
    }

    const timeRange = this.getTimeRange(episodes);

    return (
      `Summary of ${episodes.length} episodes from ${timeRange.start.toISOString()} to ${timeRange.end.toISOString()}:\n` +
      summaryParts.join('\n')
    );
  }

  /**
   * Get all stored summaries
   */
  getSummaries(): EpisodeSummary[] {
    return [...this.summaries];
  }

  /**
   * Get episode count
   */
  size(): number {
    return this.episodes.length;
  }

  /**
   * Clear all episodes
   */
  async clear(): Promise<void> {
    this.episodes = [];
    this.summaries = [];
  }

  /**
   * Delete a specific episode
   */
  async delete(episodeId: string): Promise<boolean> {
    const index = this.episodes.findIndex(e => e.id === episodeId);
    if (index === -1) {
      return false;
    }
    this.episodes.splice(index, 1);
    return true;
  }

  /**
   * Serialize episodic memory for persistence
   */
  serialize(): string {
    return JSON.stringify({
      episodes: this.episodes,
      summaries: this.summaries,
    });
  }

  /**
   * Restore episodic memory from serialized data
   */
  deserialize(data: string): void {
    try {
      const parsed = JSON.parse(data) as {
        episodes: Episode[];
        summaries: EpisodeSummary[];
      };

      this.episodes = parsed.episodes.map(e => ({
        ...e,
        timestamp: new Date(e.timestamp),
      }));

      this.summaries = parsed.summaries.map(s => ({
        ...s,
        startDate: new Date(s.startDate),
        endDate: new Date(s.endDate),
      }));
    } catch {
      this.episodes = [];
      this.summaries = [];
    }
  }

  private async pruneOldEpisodes(): Promise<void> {
    const retentionCutoff = new Date();
    retentionCutoff.setDate(retentionCutoff.getDate() - this.retentionDays);

    // Create summary of episodes to be pruned
    const toPrune = this.episodes.filter(e => e.timestamp < retentionCutoff);

    if (toPrune.length > 0 && this.autoSummarize) {
      await this.createSummary(toPrune);
    }

    // Keep only recent episodes within retention period
    this.episodes = this.episodes.filter(e => e.timestamp >= retentionCutoff);

    // If still over limit, remove oldest
    while (this.episodes.length > this.maxEpisodes) {
      this.episodes.shift();
    }
  }

  private shouldSummarize(): boolean {
    // Summarize when we have enough unsummarized episodes
    const lastSummary = this.summaries[this.summaries.length - 1];
    if (!lastSummary) {
      return this.episodes.length >= this.summarizationThreshold;
    }

    const unsummarizedCount = this.episodes.filter(
      e => e.timestamp > lastSummary.endDate
    ).length;

    return unsummarizedCount >= this.summarizationThreshold;
  }

  private async createSummary(episodes?: Episode[]): Promise<void> {
    const toSummarize = episodes ?? this.getUnsummarizedEpisodes();

    if (toSummarize.length === 0) {
      return;
    }

    const timeRange = this.getTimeRange(toSummarize);
    const summary = await this.summarize(toSummarize);

    // Extract topics from episodes
    const topics = this.extractTopics(toSummarize);

    this.summaries.push({
      id: this.generateId('sum'),
      startDate: timeRange.start,
      endDate: timeRange.end,
      episodeCount: toSummarize.length,
      summary,
      topics,
    });
  }

  private getUnsummarizedEpisodes(): Episode[] {
    const lastSummary = this.summaries[this.summaries.length - 1];
    if (!lastSummary) {
      return this.episodes;
    }
    return this.episodes.filter(e => e.timestamp > lastSummary.endDate);
  }

  private getTimeRange(episodes: Episode[]): { start: Date; end: Date } {
    if (episodes.length === 0) {
      const now = new Date();
      return { start: now, end: now };
    }

    const sorted = [...episodes].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    return {
      start: sorted[0]!.timestamp,
      end: sorted[sorted.length - 1]!.timestamp,
    };
  }

  private extractTopics(episodes: Episode[]): string[] {
    const topics = new Set<string>();

    for (const episode of episodes) {
      topics.add(episode.type);

      if (episode.metadata?.topic) {
        topics.add(String(episode.metadata.topic));
      }

      if (episode.metadata?.topics && Array.isArray(episode.metadata.topics)) {
        for (const topic of episode.metadata.topics) {
          topics.add(String(topic));
        }
      }
    }

    return Array.from(topics);
  }

  private generateId(prefix = 'ep'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
