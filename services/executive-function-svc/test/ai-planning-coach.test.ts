import { describe, it, expect } from 'vitest';
import { getTimeEstimationCoaching } from '../src/services/ai-planning-coach.js';

// ============================================================================
// getTimeEstimationCoaching - exported pure function
// ============================================================================

describe('getTimeEstimationCoaching', () => {
  it('suggests adding buffer when accuracy is low', async () => {
    const result = await getTimeEstimationCoaching('homework', 30, [
      { estimated: 20, actual: 40 },
      { estimated: 15, actual: 30 },
    ]);
    expect(result.tip).toContain('adding a buffer');
    expect(result.adjustmentFactor).toBe(1.2); // underestimate → 1.2
  });

  it('encourages improvement when accuracy is moderate', async () => {
    const result = await getTimeEstimationCoaching('reading', 60, [{ estimated: 20, actual: 22 }]);
    expect(result.tip).toContain('getting better');
  });

  it('praises when accuracy is high', async () => {
    const result = await getTimeEstimationCoaching('math', 85, [{ estimated: 20, actual: 19 }]);
    expect(result.tip).toContain('Great job');
  });

  it('returns adjustment factor 1.2 when consistently underestimating', async () => {
    const result = await getTimeEstimationCoaching('project', 40, [
      { estimated: 10, actual: 20 },
      { estimated: 15, actual: 25 },
    ]);
    expect(result.adjustmentFactor).toBe(1.2);
  });

  it('returns adjustment factor 0.9 when consistently overestimating by a lot', async () => {
    const result = await getTimeEstimationCoaching('quiz', 50, [
      { estimated: 30, actual: 20 },
      { estimated: 25, actual: 15 },
    ]);
    // avgUnderestimate = ((20-30) + (15-25)) / 2 = -10
    expect(result.adjustmentFactor).toBe(0.9);
  });

  it('returns adjustment factor 1.0 when estimates are close', async () => {
    const result = await getTimeEstimationCoaching('activity', 75, [
      { estimated: 20, actual: 21 },
      { estimated: 15, actual: 14 },
    ]);
    // avgUnderestimate = ((21-20) + (14-15)) / 2 = 0
    expect(result.adjustmentFactor).toBe(1.0);
  });

  it('handles empty recent tasks', async () => {
    const result = await getTimeEstimationCoaching('task', 80, []);
    expect(result.adjustmentFactor).toBe(1.0);
    expect(result.tip).toBeTruthy();
  });
});
