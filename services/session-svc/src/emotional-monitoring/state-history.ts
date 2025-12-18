/**
 * ND-2.3: State History
 *
 * Manages emotional state history for sessions, supporting trend analysis
 * and pattern detection.
 */

/**
 * Entry in the state history.
 */
export interface StateHistoryEntry {
  timestamp: Date;
  state: string;
  intensity: number;
  interventionTriggered: boolean;
}

/**
 * Trend analysis result.
 */
export interface TrendAnalysis {
  direction: 'improving' | 'stable' | 'declining' | 'rapid_decline';
  averageIntensity: number;
  peakIntensity: number;
  interventionCount: number;
  stateTransitions: number;
}

/**
 * StateHistory manages emotional state history for sessions.
 */
export class StateHistory {
  private histories = new Map<string, StateHistoryEntry[]>();
  private maxEntries: number;

  constructor(maxEntriesPerSession = 100) {
    this.maxEntries = maxEntriesPerSession;
  }

  /**
   * Add an entry to the session history.
   */
  addEntry(sessionId: string, entry: StateHistoryEntry): void {
    if (!this.histories.has(sessionId)) {
      this.histories.set(sessionId, []);
    }

    const history = this.histories.get(sessionId);
    if (!history) return;
    history.push(entry);

    // Trim to max entries
    if (history.length > this.maxEntries) {
      history.shift();
    }
  }

  /**
   * Get all entries for a session.
   */
  getHistory(sessionId: string): StateHistoryEntry[] {
    return this.histories.get(sessionId) ?? [];
  }

  /**
   * Get the latest entry for a session.
   */
  getLatestEntry(sessionId: string): StateHistoryEntry | null {
    const history = this.histories.get(sessionId);
    if (!history || history.length === 0) return null;
    return history[history.length - 1];
  }

  /**
   * Get entries from the last N minutes.
   */
  getRecentEntries(sessionId: string, minutes: number): StateHistoryEntry[] {
    const history = this.histories.get(sessionId) ?? [];
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return history.filter((e) => e.timestamp >= cutoff);
  }

  /**
   * Analyze the trend in recent history.
   */
  analyzeTrend(sessionId: string, lookbackMinutes = 10): TrendAnalysis {
    const entries = this.getRecentEntries(sessionId, lookbackMinutes);

    if (entries.length === 0) {
      return {
        direction: 'stable',
        averageIntensity: 0,
        peakIntensity: 0,
        interventionCount: 0,
        stateTransitions: 0,
      };
    }

    // Calculate average intensity
    const avgIntensity = entries.reduce((sum, e) => sum + e.intensity, 0) / entries.length;

    // Find peak intensity
    const peakIntensity = Math.max(...entries.map((e) => e.intensity));

    // Count interventions
    const interventionCount = entries.filter((e) => e.interventionTriggered).length;

    // Count state transitions
    let stateTransitions = 0;
    for (let i = 1; i < entries.length; i++) {
      if (entries[i].state !== entries[i - 1].state) {
        stateTransitions++;
      }
    }

    // Determine direction
    let direction: 'improving' | 'stable' | 'declining' | 'rapid_decline' = 'stable';

    if (entries.length >= 3) {
      // Compare first half to second half
      const midpoint = Math.floor(entries.length / 2);
      const firstHalf = entries.slice(0, midpoint);
      const secondHalf = entries.slice(midpoint);

      const firstAvg = firstHalf.reduce((sum, e) => sum + e.intensity, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, e) => sum + e.intensity, 0) / secondHalf.length;

      const change = secondAvg - firstAvg;

      // For intensity, lower is better (less stressed)
      if (change <= -1.5) {
        direction = 'improving';
      } else if (change >= 3) {
        direction = 'rapid_decline';
      } else if (change >= 1.5) {
        direction = 'declining';
      }
    }

    return {
      direction,
      averageIntensity: avgIntensity,
      peakIntensity,
      interventionCount,
      stateTransitions,
    };
  }

  /**
   * Check if there's been escalation (increasing intensity).
   */
  hasEscalation(sessionId: string, lookbackMinutes = 5): boolean {
    const entries = this.getRecentEntries(sessionId, lookbackMinutes);
    if (entries.length < 3) return false;

    // Check if intensity is consistently increasing
    let increases = 0;
    for (let i = 1; i < entries.length; i++) {
      if (entries[i].intensity > entries[i - 1].intensity) {
        increases++;
      }
    }

    // If more than 60% of transitions are increases, we have escalation
    return increases / (entries.length - 1) > 0.6;
  }

  /**
   * Get time since last intervention.
   */
  getTimeSinceLastIntervention(sessionId: string): number | null {
    const history = this.histories.get(sessionId) ?? [];

    // Find last intervention
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].interventionTriggered) {
        return Date.now() - history[i].timestamp.getTime();
      }
    }

    return null;
  }

  /**
   * Get the most common state in recent history.
   */
  getMostCommonState(sessionId: string, lookbackMinutes = 10): string | null {
    const entries = this.getRecentEntries(sessionId, lookbackMinutes);
    if (entries.length === 0) return null;

    const counts = new Map<string, number>();
    for (const entry of entries) {
      counts.set(entry.state, (counts.get(entry.state) ?? 0) + 1);
    }

    let maxCount = 0;
    let mostCommon: string | null = null;

    for (const [state, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = state;
      }
    }

    return mostCommon;
  }

  /**
   * Clear history for a session.
   */
  clearSession(sessionId: string): void {
    this.histories.delete(sessionId);
  }

  /**
   * Clear all history.
   */
  clearAll(): void {
    this.histories.clear();
  }
}

/**
 * Create a singleton instance of StateHistory.
 */
let stateHistoryInstance: StateHistory | null = null;

export function getStateHistory(): StateHistory {
  if (!stateHistoryInstance) {
    stateHistoryInstance = new StateHistory();
  }
  return stateHistoryInstance;
}
