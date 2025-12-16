/**
 * Time Series Utilities
 *
 * Provides functions for working with time-series data in analytics.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
}

export interface TimeSeriesData {
  points: TimeSeriesPoint[];
  startDate: Date;
  endDate: Date;
  interval: TimeInterval;
}

export type TimeInterval = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface BucketedData<T> {
  bucket: Date;
  label: string;
  data: T[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATE UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get the start of a time period
 */
export function getStartOf(date: Date, interval: TimeInterval): Date {
  const result = new Date(date);

  switch (interval) {
    case 'hour':
      result.setMinutes(0, 0, 0);
      break;
    case 'day':
      result.setHours(0, 0, 0, 0);
      break;
    case 'week': {
      result.setHours(0, 0, 0, 0);
      const day = result.getDay();
      const diff = day === 0 ? 6 : day - 1; // Monday is start of week
      result.setDate(result.getDate() - diff);
      break;
    }
    case 'month':
      result.setHours(0, 0, 0, 0);
      result.setDate(1);
      break;
    case 'quarter':
      result.setHours(0, 0, 0, 0);
      result.setDate(1);
      result.setMonth(Math.floor(result.getMonth() / 3) * 3);
      break;
    case 'year':
      result.setHours(0, 0, 0, 0);
      result.setMonth(0, 1);
      break;
  }

  return result;
}

/**
 * Get the end of a time period
 */
export function getEndOf(date: Date, interval: TimeInterval): Date {
  const start = getStartOf(date, interval);
  const result = new Date(start);

  switch (interval) {
    case 'hour':
      result.setHours(result.getHours() + 1);
      break;
    case 'day':
      result.setDate(result.getDate() + 1);
      break;
    case 'week':
      result.setDate(result.getDate() + 7);
      break;
    case 'month':
      result.setMonth(result.getMonth() + 1);
      break;
    case 'quarter':
      result.setMonth(result.getMonth() + 3);
      break;
    case 'year':
      result.setFullYear(result.getFullYear() + 1);
      break;
  }

  return result;
}

/**
 * Generate a sequence of dates for a given range and interval
 */
export function generateDateSequence(range: DateRange, interval: TimeInterval): Date[] {
  const dates: Date[] = [];
  let current = getStartOf(range.start, interval);

  while (current < range.end) {
    dates.push(new Date(current));
    current = getEndOf(current, interval);
  }

  return dates;
}

/**
 * Get date range for common periods
 */
export function getDateRangeForPeriod(period: 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'last7Days' | 'last30Days' | 'last90Days' | 'thisYear'): DateRange {
  const now = new Date();
  const today = getStartOf(now, 'day');

  switch (period) {
    case 'today':
      return { start: today, end: getEndOf(today, 'day') };

    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: yesterday, end: today };
    }

    case 'thisWeek':
      return { start: getStartOf(now, 'week'), end: getEndOf(now, 'week') };

    case 'lastWeek': {
      const weekStart = getStartOf(now, 'week');
      const lastWeekStart = new Date(weekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      return { start: lastWeekStart, end: weekStart };
    }

    case 'thisMonth':
      return { start: getStartOf(now, 'month'), end: getEndOf(now, 'month') };

    case 'lastMonth': {
      const monthStart = getStartOf(now, 'month');
      const lastMonthStart = new Date(monthStart);
      lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
      return { start: lastMonthStart, end: monthStart };
    }

    case 'last7Days': {
      const start = new Date(today);
      start.setDate(start.getDate() - 7);
      return { start, end: getEndOf(today, 'day') };
    }

    case 'last30Days': {
      const start = new Date(today);
      start.setDate(start.getDate() - 30);
      return { start, end: getEndOf(today, 'day') };
    }

    case 'last90Days': {
      const start = new Date(today);
      start.setDate(start.getDate() - 90);
      return { start, end: getEndOf(today, 'day') };
    }

    case 'thisYear':
      return { start: getStartOf(now, 'year'), end: getEndOf(now, 'year') };

    default:
      return { start: today, end: getEndOf(today, 'day') };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIME SERIES OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fill gaps in time series data with zero values
 */
export function fillGaps(data: TimeSeriesData): TimeSeriesData {
  const allDates = generateDateSequence(
    { start: data.startDate, end: data.endDate },
    data.interval,
  );

  const valueMap = new Map<string, number>();
  for (const point of data.points) {
    valueMap.set(point.timestamp.toISOString(), point.value);
  }

  const filledPoints: TimeSeriesPoint[] = allDates.map((date) => ({
    timestamp: date,
    value: valueMap.get(date.toISOString()) ?? 0,
  }));

  return {
    ...data,
    points: filledPoints,
  };
}

/**
 * Resample time series to a different interval
 */
export function resample(
  data: TimeSeriesData,
  targetInterval: TimeInterval,
  aggregator: 'sum' | 'avg' | 'max' | 'min' = 'sum',
): TimeSeriesData {
  const buckets = new Map<string, number[]>();

  for (const point of data.points) {
    const bucketDate = getStartOf(point.timestamp, targetInterval);
    const key = bucketDate.toISOString();

    if (!buckets.has(key)) {
      buckets.set(key, []);
    }
    const bucket = buckets.get(key);
    if (bucket) bucket.push(point.value);
  }

  const points: TimeSeriesPoint[] = [];

  for (const [key, values] of buckets) {
    let aggregatedValue: number;

    switch (aggregator) {
      case 'sum':
        aggregatedValue = values.reduce((a, b) => a + b, 0);
        break;
      case 'avg':
        aggregatedValue = values.reduce((a, b) => a + b, 0) / values.length;
        break;
      case 'max':
        aggregatedValue = Math.max(...values);
        break;
      case 'min':
        aggregatedValue = Math.min(...values);
        break;
    }

    points.push({
      timestamp: new Date(key),
      value: aggregatedValue,
    });
  }

  // Sort by timestamp
  points.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return {
    points,
    startDate: getStartOf(data.startDate, targetInterval),
    endDate: data.endDate,
    interval: targetInterval,
  };
}

/**
 * Calculate moving average
 */
export function movingAverage(data: TimeSeriesPoint[], windowSize: number): TimeSeriesPoint[] {
  if (windowSize <= 0 || data.length === 0) return [];

  const result: TimeSeriesPoint[] = [];

  for (let i = 0; i < data.length; i++) {
    const windowStart = Math.max(0, i - windowSize + 1);
    const window = data.slice(windowStart, i + 1);
    const avg = window.reduce((sum, p) => sum + p.value, 0) / window.length;

    result.push({
      timestamp: data[i].timestamp,
      value: Math.round(avg * 100) / 100,
    });
  }

  return result;
}

/**
 * Calculate exponential moving average
 */
export function exponentialMovingAverage(
  data: TimeSeriesPoint[],
  span: number,
): TimeSeriesPoint[] {
  if (span <= 0 || data.length === 0) return [];

  const alpha = 2 / (span + 1);
  const result: TimeSeriesPoint[] = [];

  let ema = data[0].value;
  result.push({ timestamp: data[0].timestamp, value: ema });

  for (let i = 1; i < data.length; i++) {
    ema = alpha * data[i].value + (1 - alpha) * ema;
    result.push({
      timestamp: data[i].timestamp,
      value: Math.round(ema * 100) / 100,
    });
  }

  return result;
}

/**
 * Calculate period-over-period change
 */
export function periodOverPeriodChange(
  current: number,
  previous: number,
): { absolute: number; percentage: number | null } {
  const absolute = current - previous;
  const percentage = previous !== 0 ? ((current - previous) / previous) * 100 : null;

  return {
    absolute,
    percentage: percentage !== null ? Math.round(percentage * 100) / 100 : null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUCKETING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Bucket data by time interval
 */
export function bucketByTime<T extends { timestamp: Date }>(
  data: T[],
  interval: TimeInterval,
): BucketedData<T>[] {
  const buckets = new Map<string, { bucket: Date; data: T[] }>();

  for (const item of data) {
    const bucketDate = getStartOf(item.timestamp, interval);
    const key = bucketDate.toISOString();

    if (!buckets.has(key)) {
      buckets.set(key, { bucket: bucketDate, data: [] });
    }
    const bucketEntry = buckets.get(key);
    if (bucketEntry) bucketEntry.data.push(item);
  }

  const result: BucketedData<T>[] = [];

  for (const [, bucket] of buckets) {
    result.push({
      bucket: bucket.bucket,
      label: formatBucketLabel(bucket.bucket, interval),
      data: bucket.data,
    });
  }

  // Sort by bucket date
  result.sort((a, b) => a.bucket.getTime() - b.bucket.getTime());

  return result;
}

/**
 * Format bucket label for display
 */
export function formatBucketLabel(date: Date, interval: TimeInterval): string {
  const options: Intl.DateTimeFormatOptions = {};

  switch (interval) {
    case 'hour':
      options.hour = 'numeric';
      options.minute = '2-digit';
      break;
    case 'day':
      options.month = 'short';
      options.day = 'numeric';
      break;
    case 'week':
      options.month = 'short';
      options.day = 'numeric';
      break;
    case 'month':
      options.month = 'long';
      options.year = 'numeric';
      break;
    case 'quarter': {
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `Q${quarter} ${date.getFullYear()}`;
    }
    case 'year':
      options.year = 'numeric';
      break;
  }

  return date.toLocaleDateString('en-US', options);
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPARISON UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get comparison date range for period-over-period analysis
 */
export function getComparisonDateRange(
  range: DateRange,
  comparisonType: 'previous' | 'yearOverYear',
): DateRange {
  const duration = range.end.getTime() - range.start.getTime();

  if (comparisonType === 'previous') {
    const start = new Date(range.start.getTime() - duration);
    const end = new Date(range.start);
    return { start, end };
  }

  // Year over year
  const start = new Date(range.start);
  start.setFullYear(start.getFullYear() - 1);
  const end = new Date(range.end);
  end.setFullYear(end.getFullYear() - 1);

  return { start, end };
}

/**
 * Calculate trend direction
 */
export function calculateTrend(
  data: TimeSeriesPoint[],
): 'up' | 'down' | 'flat' {
  if (data.length < 2) return 'flat';

  // Simple linear regression
  const n = data.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i].value;
    sumXY += i * data[i].value;
    sumXX += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

  // Threshold for "flat" - less than 1% of average
  const avgValue = sumY / n;
  const threshold = avgValue * 0.01;

  if (Math.abs(slope) < threshold) return 'flat';
  return slope > 0 ? 'up' : 'down';
}
