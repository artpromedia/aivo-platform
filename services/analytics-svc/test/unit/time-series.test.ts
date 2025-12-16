/**
 * Time Series Utility Tests
 */

import { describe, it, expect } from 'vitest';
import {
  getStartOf,
  getEndOf,
  generateDateSequence,
  getDateRangeForPeriod,
  fillGaps,
  resample,
  movingAverage,
  exponentialMovingAverage,
  periodOverPeriodChange,
  bucketByTime,
  formatBucketLabel,
  getComparisonDateRange,
  calculateTrend,
} from '../../src/utils/time-series.js';
import type { TimeSeriesData, TimeSeriesPoint } from '../../src/utils/time-series.js';

describe('Time Series Utilities', () => {
  describe('getStartOf', () => {
    it('should get start of hour', () => {
      const date = new Date('2024-01-15T14:30:45.123Z');
      const result = getStartOf(date, 'hour');
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });

    it('should get start of day', () => {
      const date = new Date('2024-01-15T14:30:45.123Z');
      const result = getStartOf(date, 'day');
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
    });

    it('should get start of week (Monday)', () => {
      const date = new Date('2024-01-17T14:30:45.123Z'); // Wednesday
      const result = getStartOf(date, 'week');
      expect(result.getDay()).toBe(1); // Monday
    });

    it('should get start of month', () => {
      const date = new Date('2024-01-15T14:30:45.123Z');
      const result = getStartOf(date, 'month');
      expect(result.getDate()).toBe(1);
      expect(result.getHours()).toBe(0);
    });

    it('should get start of quarter', () => {
      const date = new Date('2024-05-15T14:30:45.123Z'); // Q2
      const result = getStartOf(date, 'quarter');
      expect(result.getMonth()).toBe(3); // April (Q2 start)
      expect(result.getDate()).toBe(1);
    });

    it('should get start of year', () => {
      const date = new Date('2024-06-15T14:30:45.123Z');
      const result = getStartOf(date, 'year');
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(1);
    });
  });

  describe('getEndOf', () => {
    it('should get end of day', () => {
      const date = new Date('2024-01-15T14:30:45.123Z');
      const result = getEndOf(date, 'day');
      const expected = new Date('2024-01-16T00:00:00.000Z');
      expect(result.toISOString().split('T')[0]).toBe(expected.toISOString().split('T')[0]);
    });

    it('should get end of month', () => {
      const date = new Date('2024-01-15T14:30:45.123Z');
      const result = getEndOf(date, 'month');
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(1);
    });
  });

  describe('generateDateSequence', () => {
    it('should generate daily sequence', () => {
      const start = new Date('2024-01-01T00:00:00.000Z');
      const end = new Date('2024-01-05T00:00:00.000Z');
      const result = generateDateSequence({ start, end }, 'day');
      expect(result.length).toBe(4); // 1st, 2nd, 3rd, 4th
    });

    it('should generate weekly sequence', () => {
      const start = new Date('2024-01-01T00:00:00.000Z');
      const end = new Date('2024-01-29T00:00:00.000Z');
      const result = generateDateSequence({ start, end }, 'week');
      expect(result.length).toBe(4);
    });
  });

  describe('getDateRangeForPeriod', () => {
    it('should get today range', () => {
      const result = getDateRangeForPeriod('today');
      const now = new Date();
      expect(result.start.getDate()).toBe(now.getDate());
    });

    it('should get last7Days range', () => {
      const result = getDateRangeForPeriod('last7Days');
      const diffDays = (result.end.getTime() - result.start.getTime()) / (24 * 60 * 60 * 1000);
      expect(diffDays).toBeCloseTo(7, 0);
    });

    it('should get last30Days range', () => {
      const result = getDateRangeForPeriod('last30Days');
      const diffDays = (result.end.getTime() - result.start.getTime()) / (24 * 60 * 60 * 1000);
      expect(diffDays).toBeCloseTo(30, 0);
    });
  });

  describe('fillGaps', () => {
    it('should fill gaps with zero values', () => {
      const data: TimeSeriesData = {
        points: [
          { timestamp: new Date('2024-01-01'), value: 10 },
          { timestamp: new Date('2024-01-03'), value: 20 },
        ],
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-05'),
        interval: 'day',
      };

      const result = fillGaps(data);
      expect(result.points.length).toBe(4);
    });
  });

  describe('resample', () => {
    it('should resample data with sum aggregation', () => {
      const data: TimeSeriesData = {
        points: [
          { timestamp: new Date('2024-01-01'), value: 10 },
          { timestamp: new Date('2024-01-02'), value: 20 },
          { timestamp: new Date('2024-01-08'), value: 30 },
          { timestamp: new Date('2024-01-09'), value: 40 },
        ],
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-15'),
        interval: 'day',
      };

      const result = resample(data, 'week', 'sum');
      expect(result.points.length).toBe(2);
    });

    it('should resample with average aggregation', () => {
      const data: TimeSeriesData = {
        points: [
          { timestamp: new Date('2024-01-01'), value: 10 },
          { timestamp: new Date('2024-01-02'), value: 20 },
        ],
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-07'),
        interval: 'day',
      };

      const result = resample(data, 'week', 'avg');
      expect(result.points[0].value).toBe(15);
    });
  });

  describe('movingAverage', () => {
    it('should calculate moving average', () => {
      const data: TimeSeriesPoint[] = [
        { timestamp: new Date(), value: 10 },
        { timestamp: new Date(), value: 20 },
        { timestamp: new Date(), value: 30 },
        { timestamp: new Date(), value: 40 },
        { timestamp: new Date(), value: 50 },
      ];

      const result = movingAverage(data, 3);
      expect(result.length).toBe(5);
      expect(result[2].value).toBeCloseTo(20, 1); // avg of 10, 20, 30
      expect(result[4].value).toBeCloseTo(40, 1); // avg of 30, 40, 50
    });

    it('should return empty for invalid window', () => {
      expect(movingAverage([], 3)).toEqual([]);
      expect(movingAverage([{ timestamp: new Date(), value: 10 }], 0)).toEqual([]);
    });
  });

  describe('exponentialMovingAverage', () => {
    it('should calculate EMA', () => {
      const data: TimeSeriesPoint[] = [
        { timestamp: new Date(), value: 10 },
        { timestamp: new Date(), value: 20 },
        { timestamp: new Date(), value: 30 },
      ];

      const result = exponentialMovingAverage(data, 3);
      expect(result.length).toBe(3);
      expect(result[0].value).toBe(10);
    });

    it('should return empty for invalid span', () => {
      expect(exponentialMovingAverage([], 3)).toEqual([]);
    });
  });

  describe('periodOverPeriodChange', () => {
    it('should calculate positive change', () => {
      const result = periodOverPeriodChange(120, 100);
      expect(result.absolute).toBe(20);
      expect(result.percentage).toBe(20);
    });

    it('should calculate negative change', () => {
      const result = periodOverPeriodChange(80, 100);
      expect(result.absolute).toBe(-20);
      expect(result.percentage).toBe(-20);
    });

    it('should return null percentage for zero previous', () => {
      const result = periodOverPeriodChange(100, 0);
      expect(result.absolute).toBe(100);
      expect(result.percentage).toBeNull();
    });
  });

  describe('bucketByTime', () => {
    it('should bucket data by day', () => {
      const data = [
        { timestamp: new Date('2024-01-01T10:00:00'), value: 1 },
        { timestamp: new Date('2024-01-01T14:00:00'), value: 2 },
        { timestamp: new Date('2024-01-02T10:00:00'), value: 3 },
      ];

      const result = bucketByTime(data, 'day');
      expect(result.length).toBe(2);
      expect(result[0].data.length).toBe(2);
      expect(result[1].data.length).toBe(1);
    });
  });

  describe('formatBucketLabel', () => {
    it('should format day label', () => {
      const date = new Date('2024-06-15');
      const result = formatBucketLabel(date, 'day');
      expect(result).toContain('15');
    });

    it('should format quarter label', () => {
      const date = new Date('2024-04-01'); // Q2
      const result = formatBucketLabel(date, 'quarter');
      expect(result).toBe('Q2 2024');
    });
  });

  describe('getComparisonDateRange', () => {
    it('should get previous period range', () => {
      const range = {
        start: new Date('2024-01-08'),
        end: new Date('2024-01-15'),
      };
      const result = getComparisonDateRange(range, 'previous');
      expect(result.end.getTime()).toBe(range.start.getTime());
    });

    it('should get year-over-year range', () => {
      const range = {
        start: new Date('2024-01-08'),
        end: new Date('2024-01-15'),
      };
      const result = getComparisonDateRange(range, 'yearOverYear');
      expect(result.start.getFullYear()).toBe(2023);
      expect(result.end.getFullYear()).toBe(2023);
    });
  });

  describe('calculateTrend', () => {
    it('should detect upward trend', () => {
      const data: TimeSeriesPoint[] = [
        { timestamp: new Date(), value: 10 },
        { timestamp: new Date(), value: 20 },
        { timestamp: new Date(), value: 30 },
        { timestamp: new Date(), value: 40 },
        { timestamp: new Date(), value: 50 },
      ];
      expect(calculateTrend(data)).toBe('up');
    });

    it('should detect downward trend', () => {
      const data: TimeSeriesPoint[] = [
        { timestamp: new Date(), value: 50 },
        { timestamp: new Date(), value: 40 },
        { timestamp: new Date(), value: 30 },
        { timestamp: new Date(), value: 20 },
        { timestamp: new Date(), value: 10 },
      ];
      expect(calculateTrend(data)).toBe('down');
    });

    it('should detect flat trend', () => {
      const data: TimeSeriesPoint[] = [
        { timestamp: new Date(), value: 100 },
        { timestamp: new Date(), value: 100 },
        { timestamp: new Date(), value: 100 },
        { timestamp: new Date(), value: 100 },
      ];
      expect(calculateTrend(data)).toBe('flat');
    });

    it('should return flat for insufficient data', () => {
      expect(calculateTrend([{ timestamp: new Date(), value: 10 }])).toBe('flat');
    });
  });
});
