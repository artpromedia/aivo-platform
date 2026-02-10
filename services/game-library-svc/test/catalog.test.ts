import { describe, it, expect } from 'vitest';
import { GAME_CATALOG, filterGames, getRandomFocusBreakGame } from '../src/games/catalog.js';

// ============================================================================
// GAME_CATALOG data integrity
// ============================================================================

describe('GAME_CATALOG', () => {
  it('contains game definitions', () => {
    expect(GAME_CATALOG.length).toBeGreaterThan(0);
  });

  it('every game has required fields', () => {
    for (const game of GAME_CATALOG) {
      expect(game.slug).toBeTruthy();
      expect(game.title).toBeTruthy();
      expect(game.description).toBeTruthy();
      expect(game.type).toBeTruthy();
      expect(game.category).toBeTruthy();
      expect(game.minAge).toBeGreaterThanOrEqual(0);
      expect(game.maxAge).toBeGreaterThan(game.minAge);
      expect(game.gradeBands.length).toBeGreaterThan(0);
      expect(game.estimatedDurationSec).toBeGreaterThan(0);
      expect(game.cognitiveSkills.length).toBeGreaterThan(0);
      expect(game.xpReward).toBeGreaterThan(0);
      expect(game.coinReward).toBeGreaterThan(0);
    }
  });

  it('has unique slugs', () => {
    const slugs = GAME_CATALOG.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('includes focus break games', () => {
    const focusBreak = GAME_CATALOG.filter((g) => g.type === 'FOCUS_BREAK');
    expect(focusBreak.length).toBeGreaterThan(0);
  });

  it('includes brain training games', () => {
    const brainTraining = GAME_CATALOG.filter((g) => g.type === 'BRAIN_TRAINING');
    expect(brainTraining.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// filterGames
// ============================================================================

describe('filterGames', () => {
  it('returns all games with no filters', () => {
    const result = filterGames(GAME_CATALOG, {});
    expect(result.length).toBe(GAME_CATALOG.length);
  });

  it('filters by type', () => {
    const result = filterGames(GAME_CATALOG, { type: 'FOCUS_BREAK' });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((g) => g.type === 'FOCUS_BREAK')).toBe(true);
  });

  it('filters by category', () => {
    const result = filterGames(GAME_CATALOG, { category: 'RELAXATION' });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((g) => g.category === 'RELAXATION')).toBe(true);
  });

  it('filters by gradeBand', () => {
    const result = filterGames(GAME_CATALOG, { gradeBand: 'K_2' });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((g) => g.gradeBands.includes('K_2' as any))).toBe(true);
  });

  it('filters by cognitiveSkill', () => {
    const result = filterGames(GAME_CATALOG, { cognitiveSkill: 'ATTENTION' });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((g) => g.cognitiveSkills.includes('ATTENTION' as any))).toBe(true);
  });

  it('filters by maxDurationSec', () => {
    const result = filterGames(GAME_CATALOG, { maxDurationSec: 120 });
    expect(result.every((g) => g.estimatedDurationSec <= 120)).toBe(true);
  });

  it('filters by age range', () => {
    const result = filterGames(GAME_CATALOG, { minAge: 10, maxAge: 14 });
    // Games whose age range overlaps with [10, 14]
    expect(result.every((g) => g.maxAge >= 10 && g.minAge <= 14)).toBe(true);
  });

  it('filters by tags', () => {
    const result = filterGames(GAME_CATALOG, { tags: ['breathing'] });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((g) => g.tags.some((t) => t === 'breathing'))).toBe(true);
  });

  it('filters by accessibilityFeatures', () => {
    const result = filterGames(GAME_CATALOG, { accessibilityFeatures: ['high-contrast'] });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((g) => g.accessibilityFeatures.includes('high-contrast'))).toBe(true);
  });

  it('combines multiple filters', () => {
    const result = filterGames(GAME_CATALOG, {
      type: 'FOCUS_BREAK',
      category: 'RELAXATION',
    });
    expect(result.every((g) => g.type === 'FOCUS_BREAK' && g.category === 'RELAXATION')).toBe(true);
  });

  it('returns empty array when no games match', () => {
    const result = filterGames(GAME_CATALOG, { type: 'NONEXISTENT' });
    expect(result).toEqual([]);
  });
});

// ============================================================================
// getRandomFocusBreakGame
// ============================================================================

describe('getRandomFocusBreakGame', () => {
  it('returns a focus break game for a valid grade band', () => {
    const game = getRandomFocusBreakGame(GAME_CATALOG, 'K_2');
    expect(game).not.toBeNull();
    expect(game!.type === 'FOCUS_BREAK' || game!.type === 'RELAXATION').toBe(true);
    expect(game!.gradeBands).toContain('K_2');
  });

  it('returns null when no games match', () => {
    const game = getRandomFocusBreakGame(GAME_CATALOG, 'NONEXISTENT');
    expect(game).toBeNull();
  });

  it('excludes specified slugs', () => {
    // Get all focus break slugs for K_2
    const allFocusBreak = GAME_CATALOG.filter(
      (g) =>
        (g.type === 'FOCUS_BREAK' || g.type === 'RELAXATION') && g.gradeBands.includes('K_2' as any)
    );
    const allSlugs = allFocusBreak.map((g) => g.slug);

    // Exclude all — should return null
    const game = getRandomFocusBreakGame(GAME_CATALOG, 'K_2', allSlugs);
    expect(game).toBeNull();
  });
});
