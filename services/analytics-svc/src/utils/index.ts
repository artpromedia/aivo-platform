/**
 * Utils Index
 *
 * Exports all utility functions.
 */

// Time Series
export {
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
} from './time-series.js';

export type {
  TimeSeriesPoint,
  TimeSeriesData,
  TimeInterval,
  DateRange,
  BucketedData,
} from './time-series.js';

// Statistics
export {
  sum,
  mean,
  median,
  mode,
  variance,
  standardDeviation,
  coefficientOfVariation,
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
  cagr,
  movingAverageRate,
  normalize,
  standardize,
  weightedMean,
  compositeScore,
  describe,
} from './statistics.js';

export type { DescriptiveStats } from './statistics.js';
