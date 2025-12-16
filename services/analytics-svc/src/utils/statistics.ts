/**
 * Statistics Utilities
 *
 * Provides statistical functions for analytics calculations.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// BASIC STATISTICS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate the sum of an array of numbers
 */
export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

/**
 * Calculate the mean (average) of an array of numbers
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return sum(values) / values.length;
}

/**
 * Calculate the median of an array of numbers
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}

/**
 * Calculate the mode (most frequent value) of an array of numbers
 */
export function mode(values: number[]): number[] {
  if (values.length === 0) return [];

  const frequency = new Map<number, number>();
  let maxFreq = 0;

  for (const value of values) {
    const freq = (frequency.get(value) ?? 0) + 1;
    frequency.set(value, freq);
    maxFreq = Math.max(maxFreq, freq);
  }

  const modes: number[] = [];
  for (const [value, freq] of frequency) {
    if (freq === maxFreq) {
      modes.push(value);
    }
  }

  return modes;
}

/**
 * Calculate the variance of an array of numbers
 */
export function variance(values: number[], sample = true): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return 0;

  const avg = mean(values);
  const squareDiffs = values.map((value) => Math.pow(value - avg, 2));
  const divisor = sample ? values.length - 1 : values.length;

  return sum(squareDiffs) / divisor;
}

/**
 * Calculate the standard deviation of an array of numbers
 */
export function standardDeviation(values: number[], sample = true): number {
  return Math.sqrt(variance(values, sample));
}

/**
 * Calculate the coefficient of variation (CV)
 */
export function coefficientOfVariation(values: number[]): number {
  const avg = mean(values);
  if (avg === 0) return 0;
  return (standardDeviation(values) / avg) * 100;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERCENTILES AND QUANTILES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate a specific percentile
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  if (p < 0 || p > 100) throw new Error('Percentile must be between 0 and 100');

  const sorted = [...values].sort((a, b) => a - b);

  if (p === 0) return sorted[0];
  if (p === 100) return sorted[sorted.length - 1];

  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const fraction = index - lower;

  if (lower === upper) return sorted[lower];

  return sorted[lower] * (1 - fraction) + sorted[upper] * fraction;
}

/**
 * Calculate quartiles (Q1, Q2/median, Q3)
 */
export function quartiles(values: number[]): { q1: number; q2: number; q3: number } {
  return {
    q1: percentile(values, 25),
    q2: percentile(values, 50),
    q3: percentile(values, 75),
  };
}

/**
 * Calculate interquartile range (IQR)
 */
export function interquartileRange(values: number[]): number {
  const q = quartiles(values);
  return q.q3 - q.q1;
}

/**
 * Identify outliers using IQR method
 */
export function findOutliers(values: number[], multiplier = 1.5): { lower: number[]; upper: number[] } {
  const q = quartiles(values);
  const iqr = q.q3 - q.q1;
  const lowerBound = q.q1 - multiplier * iqr;
  const upperBound = q.q3 + multiplier * iqr;

  return {
    lower: values.filter((v) => v < lowerBound),
    upper: values.filter((v) => v > upperBound),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISTRIBUTION ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate skewness (measure of asymmetry)
 */
export function skewness(values: number[]): number {
  if (values.length < 3) return 0;

  const n = values.length;
  const avg = mean(values);
  const stdDev = standardDeviation(values, false);

  if (stdDev === 0) return 0;

  const cubedDiffs = values.map((v) => Math.pow((v - avg) / stdDev, 3));
  return sum(cubedDiffs) / n;
}

/**
 * Calculate kurtosis (measure of "tailedness")
 */
export function kurtosis(values: number[]): number {
  if (values.length < 4) return 0;

  const n = values.length;
  const avg = mean(values);
  const stdDev = standardDeviation(values, false);

  if (stdDev === 0) return 0;

  const fourthPowerDiffs = values.map((v) => Math.pow((v - avg) / stdDev, 4));
  return sum(fourthPowerDiffs) / n - 3; // Excess kurtosis
}

/**
 * Create a histogram from values
 */
export function histogram(
  values: number[],
  bins: number,
): Array<{ min: number; max: number; count: number; percentage: number }> {
  if (values.length === 0 || bins <= 0) return [];

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const binWidth = (maxVal - minVal) / bins;

  const result: Array<{ min: number; max: number; count: number; percentage: number }> = [];

  for (let i = 0; i < bins; i++) {
    const binMin = minVal + i * binWidth;
    const binMax = i === bins - 1 ? maxVal + 0.001 : minVal + (i + 1) * binWidth;

    const count = values.filter((v) => v >= binMin && v < binMax).length;

    result.push({
      min: Math.round(binMin * 100) / 100,
      max: Math.round(binMax * 100) / 100,
      count,
      percentage: Math.round((count / values.length) * 10000) / 100,
    });
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORRELATION AND REGRESSION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate Pearson correlation coefficient
 */
export function pearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;

  const n = x.length;
  const meanX = mean(x);
  const meanY = mean(y);
  const stdDevX = standardDeviation(x, false);
  const stdDevY = standardDeviation(y, false);

  if (stdDevX === 0 || stdDevY === 0) return 0;

  let covariance = 0;
  for (let i = 0; i < n; i++) {
    covariance += (x[i] - meanX) * (y[i] - meanY);
  }
  covariance /= n;

  return covariance / (stdDevX * stdDevY);
}

/**
 * Calculate linear regression coefficients
 */
export function linearRegression(x: number[], y: number[]): { slope: number; intercept: number; r2: number } {
  if (x.length !== y.length || x.length === 0) {
    return { slope: 0, intercept: 0, r2: 0 };
  }

  const n = x.length;
  const meanX = mean(x);
  const meanY = mean(y);

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (x[i] - meanX) * (y[i] - meanY);
    denominator += Math.pow(x[i] - meanX, 2);
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = meanY - slope * meanX;

  // Calculate R-squared
  const r = pearsonCorrelation(x, y);
  const r2 = r * r;

  return {
    slope: Math.round(slope * 10000) / 10000,
    intercept: Math.round(intercept * 10000) / 10000,
    r2: Math.round(r2 * 10000) / 10000,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GROWTH AND RATE CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate growth rate between two values
 */
export function growthRate(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/**
 * Calculate compound annual growth rate (CAGR)
 */
export function cagr(startValue: number, endValue: number, years: number): number | null {
  if (startValue <= 0 || years <= 0) return null;
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
}

/**
 * Calculate simple moving average for rate calculations
 */
export function movingAverageRate(values: number[], period: number): number[] {
  if (period <= 0 || values.length < period) return [];

  const result: number[] = [];

  for (let i = period - 1; i < values.length; i++) {
    const window = values.slice(i - period + 1, i + 1);
    result.push(mean(window));
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING AND NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalize values to 0-1 range (min-max normalization)
 */
export function normalize(values: number[]): number[] {
  if (values.length === 0) return [];

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal;

  if (range === 0) return values.map(() => 0.5);

  return values.map((v) => (v - minVal) / range);
}

/**
 * Standardize values (z-score normalization)
 */
export function standardize(values: number[]): number[] {
  if (values.length === 0) return [];

  const avg = mean(values);
  const stdDev = standardDeviation(values, false);

  if (stdDev === 0) return values.map(() => 0);

  return values.map((v) => (v - avg) / stdDev);
}

/**
 * Calculate weighted average
 */
export function weightedMean(values: number[], weights: number[]): number {
  if (values.length !== weights.length || values.length === 0) return 0;

  const weightedSum = values.reduce((acc, val, i) => acc + val * weights[i], 0);
  const totalWeight = sum(weights);

  return totalWeight !== 0 ? weightedSum / totalWeight : 0;
}

/**
 * Create a score based on multiple factors
 */
export function compositeScore(
  factors: Array<{ value: number; weight: number; max: number }>,
): number {
  if (factors.length === 0) return 0;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const factor of factors) {
    // Normalize to 0-100 scale
    const normalized = factor.max > 0 ? (factor.value / factor.max) * 100 : 0;
    // Clamp to 0-100
    const clamped = Math.max(0, Math.min(100, normalized));
    weightedSum += clamped * factor.weight;
    totalWeight += factor.weight;
  }

  return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY STATISTICS
// ═══════════════════════════════════════════════════════════════════════════════

export interface DescriptiveStats {
  count: number;
  sum: number;
  mean: number;
  median: number;
  mode: number[];
  min: number;
  max: number;
  range: number;
  variance: number;
  standardDeviation: number;
  coefficientOfVariation: number;
  skewness: number;
  kurtosis: number;
  quartiles: { q1: number; q2: number; q3: number };
  iqr: number;
}

/**
 * Calculate comprehensive descriptive statistics
 */
export function describe(values: number[]): DescriptiveStats {
  if (values.length === 0) {
    return {
      count: 0,
      sum: 0,
      mean: 0,
      median: 0,
      mode: [],
      min: 0,
      max: 0,
      range: 0,
      variance: 0,
      standardDeviation: 0,
      coefficientOfVariation: 0,
      skewness: 0,
      kurtosis: 0,
      quartiles: { q1: 0, q2: 0, q3: 0 },
      iqr: 0,
    };
  }

  const q = quartiles(values);

  return {
    count: values.length,
    sum: sum(values),
    mean: mean(values),
    median: median(values),
    mode: mode(values),
    min: Math.min(...values),
    max: Math.max(...values),
    range: Math.max(...values) - Math.min(...values),
    variance: variance(values),
    standardDeviation: standardDeviation(values),
    coefficientOfVariation: coefficientOfVariation(values),
    skewness: skewness(values),
    kurtosis: kurtosis(values),
    quartiles: q,
    iqr: q.q3 - q.q1,
  };
}
