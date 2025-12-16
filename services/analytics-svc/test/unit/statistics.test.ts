/**
 * Statistics Utility Tests
 */

import { describe, it, expect } from 'vitest';
import {
  sum,
  mean,
  median,
  mode,
  variance,
  standardDeviation,
  percentile,
  quartiles,
  interquartileRange,
  findOutliers,
  skewness,
  kurtosis,
  histogram,
  pearsonCorrelation,
  linearRegression,
  growthRate,
  normalize,
  standardize,
  weightedMean,
  compositeScore,
  describe as describeStats,
} from '../../src/utils/statistics.js';

describe('Statistics Utilities', () => {
  describe('sum', () => {
    it('should calculate sum of numbers', () => {
      expect(sum([1, 2, 3, 4, 5])).toBe(15);
    });

    it('should return 0 for empty array', () => {
      expect(sum([])).toBe(0);
    });

    it('should handle negative numbers', () => {
      expect(sum([-1, 2, -3, 4])).toBe(2);
    });
  });

  describe('mean', () => {
    it('should calculate mean of numbers', () => {
      expect(mean([1, 2, 3, 4, 5])).toBe(3);
    });

    it('should return 0 for empty array', () => {
      expect(mean([])).toBe(0);
    });

    it('should handle single value', () => {
      expect(mean([42])).toBe(42);
    });

    it('should handle decimal results', () => {
      expect(mean([1, 2, 3, 4])).toBe(2.5);
    });
  });

  describe('median', () => {
    it('should calculate median for odd-length array', () => {
      expect(median([1, 2, 3, 4, 5])).toBe(3);
    });

    it('should calculate median for even-length array', () => {
      expect(median([1, 2, 3, 4])).toBe(2.5);
    });

    it('should return 0 for empty array', () => {
      expect(median([])).toBe(0);
    });

    it('should handle unsorted input', () => {
      expect(median([5, 1, 3, 2, 4])).toBe(3);
    });
  });

  describe('mode', () => {
    it('should find single mode', () => {
      expect(mode([1, 2, 2, 3, 4])).toEqual([2]);
    });

    it('should find multiple modes', () => {
      const result = mode([1, 1, 2, 2, 3]);
      expect(result).toContain(1);
      expect(result).toContain(2);
      expect(result.length).toBe(2);
    });

    it('should return empty array for empty input', () => {
      expect(mode([])).toEqual([]);
    });
  });

  describe('variance', () => {
    it('should calculate sample variance', () => {
      const result = variance([2, 4, 4, 4, 5, 5, 7, 9]);
      expect(result).toBeCloseTo(4.571, 2);
    });

    it('should calculate population variance', () => {
      const result = variance([2, 4, 4, 4, 5, 5, 7, 9], false);
      expect(result).toBeCloseTo(4, 2);
    });

    it('should return 0 for empty array', () => {
      expect(variance([])).toBe(0);
    });

    it('should return 0 for single value', () => {
      expect(variance([5])).toBe(0);
    });
  });

  describe('standardDeviation', () => {
    it('should calculate sample standard deviation', () => {
      const result = standardDeviation([2, 4, 4, 4, 5, 5, 7, 9]);
      expect(result).toBeCloseTo(2.138, 2);
    });

    it('should calculate population standard deviation', () => {
      const result = standardDeviation([2, 4, 4, 4, 5, 5, 7, 9], false);
      expect(result).toBeCloseTo(2, 2);
    });
  });

  describe('percentile', () => {
    it('should calculate 50th percentile (median)', () => {
      expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
    });

    it('should calculate 25th percentile', () => {
      expect(percentile([1, 2, 3, 4, 5, 6, 7, 8], 25)).toBeCloseTo(2.75, 2);
    });

    it('should calculate 0th percentile (min)', () => {
      expect(percentile([1, 2, 3, 4, 5], 0)).toBe(1);
    });

    it('should calculate 100th percentile (max)', () => {
      expect(percentile([1, 2, 3, 4, 5], 100)).toBe(5);
    });

    it('should throw for invalid percentile', () => {
      expect(() => percentile([1, 2, 3], -1)).toThrow();
      expect(() => percentile([1, 2, 3], 101)).toThrow();
    });
  });

  describe('quartiles', () => {
    it('should calculate quartiles', () => {
      const result = quartiles([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      expect(result.q1).toBeCloseTo(3.25, 1);
      expect(result.q2).toBe(5.5);
      expect(result.q3).toBeCloseTo(7.75, 1);
    });
  });

  describe('interquartileRange', () => {
    it('should calculate IQR', () => {
      const result = interquartileRange([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      expect(result).toBeCloseTo(4.5, 1);
    });
  });

  describe('findOutliers', () => {
    it('should identify outliers', () => {
      const data = [1, 2, 3, 4, 5, 100];
      const result = findOutliers(data);
      expect(result.upper).toContain(100);
      expect(result.lower).toHaveLength(0);
    });

    it('should return empty arrays when no outliers', () => {
      const data = [1, 2, 3, 4, 5];
      const result = findOutliers(data);
      expect(result.upper).toHaveLength(0);
      expect(result.lower).toHaveLength(0);
    });
  });

  describe('skewness', () => {
    it('should calculate positive skewness for right-skewed data', () => {
      const result = skewness([1, 2, 3, 4, 100]);
      expect(result).toBeGreaterThan(0);
    });

    it('should calculate negative skewness for left-skewed data', () => {
      const result = skewness([1, 97, 98, 99, 100]);
      expect(result).toBeLessThan(0);
    });

    it('should return 0 for empty or small arrays', () => {
      expect(skewness([])).toBe(0);
      expect(skewness([1, 2])).toBe(0);
    });
  });

  describe('kurtosis', () => {
    it('should calculate kurtosis', () => {
      const result = kurtosis([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      expect(typeof result).toBe('number');
    });

    it('should return 0 for small arrays', () => {
      expect(kurtosis([1, 2, 3])).toBe(0);
    });
  });

  describe('histogram', () => {
    it('should create histogram bins', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = histogram(data, 5);
      expect(result.length).toBe(5);
      expect(result.every((bin) => bin.count >= 0)).toBe(true);
    });

    it('should return empty array for empty input', () => {
      expect(histogram([], 5)).toEqual([]);
    });

    it('should calculate percentages correctly', () => {
      const data = [1, 2, 3, 4, 5];
      const result = histogram(data, 1);
      expect(result[0].percentage).toBe(100);
    });
  });

  describe('pearsonCorrelation', () => {
    it('should calculate perfect positive correlation', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [1, 2, 3, 4, 5];
      expect(pearsonCorrelation(x, y)).toBeCloseTo(1, 5);
    });

    it('should calculate perfect negative correlation', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [5, 4, 3, 2, 1];
      expect(pearsonCorrelation(x, y)).toBeCloseTo(-1, 5);
    });

    it('should return 0 for mismatched arrays', () => {
      expect(pearsonCorrelation([1, 2, 3], [1, 2])).toBe(0);
    });
  });

  describe('linearRegression', () => {
    it('should calculate linear regression', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10];
      const result = linearRegression(x, y);
      expect(result.slope).toBeCloseTo(2, 2);
      expect(result.intercept).toBeCloseTo(0, 2);
      expect(result.r2).toBeCloseTo(1, 5);
    });
  });

  describe('growthRate', () => {
    it('should calculate growth rate', () => {
      expect(growthRate(120, 100)).toBe(20);
    });

    it('should return null for zero previous value', () => {
      expect(growthRate(100, 0)).toBeNull();
    });

    it('should handle negative growth', () => {
      expect(growthRate(80, 100)).toBe(-20);
    });
  });

  describe('normalize', () => {
    it('should normalize values to 0-1 range', () => {
      const result = normalize([0, 50, 100]);
      expect(result[0]).toBe(0);
      expect(result[1]).toBe(0.5);
      expect(result[2]).toBe(1);
    });

    it('should return 0.5 for constant values', () => {
      const result = normalize([5, 5, 5]);
      expect(result.every((v) => v === 0.5)).toBe(true);
    });
  });

  describe('standardize', () => {
    it('should standardize values (z-scores)', () => {
      const values = [2, 4, 6, 8, 10];
      const result = standardize(values);
      expect(mean(result)).toBeCloseTo(0, 5);
      expect(standardDeviation(result, false)).toBeCloseTo(1, 5);
    });
  });

  describe('weightedMean', () => {
    it('should calculate weighted mean', () => {
      const values = [80, 90];
      const weights = [0.4, 0.6];
      expect(weightedMean(values, weights)).toBeCloseTo(86, 2);
    });

    it('should return 0 for empty input', () => {
      expect(weightedMean([], [])).toBe(0);
    });
  });

  describe('compositeScore', () => {
    it('should calculate composite score', () => {
      const factors = [
        { value: 80, weight: 0.5, max: 100 },
        { value: 60, weight: 0.3, max: 100 },
        { value: 40, weight: 0.2, max: 100 },
      ];
      const result = compositeScore(factors);
      expect(result).toBeCloseTo(66, 0);
    });

    it('should clamp values to 0-100', () => {
      const factors = [{ value: 150, weight: 1, max: 100 }];
      expect(compositeScore(factors)).toBe(100);
    });
  });

  describe('describe', () => {
    it('should return comprehensive statistics', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = describeStats(values);

      expect(result.count).toBe(10);
      expect(result.sum).toBe(55);
      expect(result.mean).toBe(5.5);
      expect(result.median).toBe(5.5);
      expect(result.min).toBe(1);
      expect(result.max).toBe(10);
      expect(result.range).toBe(9);
    });

    it('should handle empty array', () => {
      const result = describeStats([]);
      expect(result.count).toBe(0);
      expect(result.sum).toBe(0);
    });
  });
});
