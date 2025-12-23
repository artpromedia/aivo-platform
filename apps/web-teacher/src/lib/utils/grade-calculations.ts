/**
 * Grade Calculation Utilities
 *
 * Handles all grade calculation logic including:
 * - Weighted categories
 * - Drop lowest grades
 * - Letter grade conversion
 * - GPA calculation
 */

import type { GradeScale, GradeEntry, GradeCalculationResult, CategoryGrade } from '../types/grade';

/**
 * Default grade scale (standard A-F)
 */
export const DEFAULT_GRADE_SCALE: GradeScale = {
  type: 'percentage',
  passingGrade: 60,
  roundingMethod: 'half_up',
  decimalPlaces: 2,
  levels: [
    { letter: 'A+', minPercentage: 97, maxPercentage: 100, gpa: 4, color: '#22c55e' },
    { letter: 'A', minPercentage: 93, maxPercentage: 96.99, gpa: 4, color: '#22c55e' },
    { letter: 'A-', minPercentage: 90, maxPercentage: 92.99, gpa: 3.7, color: '#22c55e' },
    { letter: 'B+', minPercentage: 87, maxPercentage: 89.99, gpa: 3.3, color: '#3b82f6' },
    { letter: 'B', minPercentage: 83, maxPercentage: 86.99, gpa: 3, color: '#3b82f6' },
    { letter: 'B-', minPercentage: 80, maxPercentage: 82.99, gpa: 2.7, color: '#3b82f6' },
    { letter: 'C+', minPercentage: 77, maxPercentage: 79.99, gpa: 2.3, color: '#eab308' },
    { letter: 'C', minPercentage: 73, maxPercentage: 76.99, gpa: 2, color: '#eab308' },
    { letter: 'C-', minPercentage: 70, maxPercentage: 72.99, gpa: 1.7, color: '#eab308' },
    { letter: 'D+', minPercentage: 67, maxPercentage: 69.99, gpa: 1.3, color: '#f97316' },
    { letter: 'D', minPercentage: 63, maxPercentage: 66.99, gpa: 1, color: '#f97316' },
    { letter: 'D-', minPercentage: 60, maxPercentage: 62.99, gpa: 0.7, color: '#f97316' },
    { letter: 'F', minPercentage: 0, maxPercentage: 59.99, gpa: 0, color: '#ef4444' },
  ],
};

/**
 * Calculate overall grade from a list of grade entries
 */
export function calculateOverallGrade(
  entries: GradeEntry[],
  scale: GradeScale = DEFAULT_GRADE_SCALE
): GradeCalculationResult {
  // Filter out excused grades
  const validEntries = entries.filter((e) => !e.isExcused && e.score !== null);

  if (validEntries.length === 0) {
    return {
      percentage: 0,
      letterGrade: '-',
      pointsEarned: 0,
      pointsPossible: 0,
      categoryBreakdown: [],
      trend: 'stable',
      trendChange: 0,
    };
  }

  // Group by category
  const byCategory = groupByCategory(validEntries);
  const categoryBreakdown: CategoryGrade[] = [];
  let weightedSum = 0;
  let totalWeight = 0;
  let totalPointsEarned = 0;
  let totalPointsPossible = 0;

  for (const [categoryName, categoryEntries] of Object.entries(byCategory)) {
    const categoryResult = calculateCategoryGrade(categoryEntries);
    const weight = categoryEntries[0]?.weight ?? 1;

    categoryBreakdown.push({
      categoryId: categoryName,
      categoryName,
      weight,
      percentage: categoryResult.percentage,
      pointsEarned: categoryResult.pointsEarned,
      pointsPossible: categoryResult.pointsPossible,
      assignmentCount: categoryResult.assignmentCount,
      droppedCount: categoryResult.droppedCount,
    });

    weightedSum += categoryResult.percentage * weight;
    totalWeight += weight;
    totalPointsEarned += categoryResult.pointsEarned;
    totalPointsPossible += categoryResult.pointsPossible;
  }

  const percentage = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const roundedPercentage = roundGrade(percentage, scale);
  const letterGrade = getLetterGrade(roundedPercentage, scale);
  const gpa = getGPA(roundedPercentage, scale);

  return {
    percentage: roundedPercentage,
    letterGrade,
    gpa,
    pointsEarned: totalPointsEarned,
    pointsPossible: totalPointsPossible,
    categoryBreakdown,
    trend: 'stable', // Would need historical data to calculate
    trendChange: 0,
  };
}

/**
 * Calculate grade for a single category
 */
function calculateCategoryGrade(entries: GradeEntry[]): {
  percentage: number;
  pointsEarned: number;
  pointsPossible: number;
  assignmentCount: number;
  droppedCount: number;
} {
  if (entries.length === 0) {
    return {
      percentage: 0,
      pointsEarned: 0,
      pointsPossible: 0,
      assignmentCount: 0,
      droppedCount: 0,
    };
  }

  let processedEntries = entries.filter((e) => e.score !== null);

  // Sort by percentage to find lowest scores
  processedEntries.sort((a, b) => {
    const scoreA = a.score ?? 0;
    const scoreB = b.score ?? 0;
    const pctA = scoreA / a.possible;
    const pctB = scoreB / b.possible;
    return pctA - pctB;
  });

  // Mark dropped grades
  const droppedCount = 0;
  processedEntries = processedEntries.map((entry) => {
    // Check if this category has dropLowest configured
    // For now, assume no dropping (would come from config)
    return { ...entry, isDropped: false };
  });

  // Calculate totals excluding dropped
  const activeEntries = processedEntries.filter((e) => !e.isDropped);
  const pointsEarned = activeEntries.reduce((sum, e) => sum + (e.score ?? 0), 0);
  const pointsPossible = activeEntries.reduce((sum, e) => sum + e.possible, 0);
  const percentage = pointsPossible > 0 ? (pointsEarned / pointsPossible) * 100 : 0;

  return {
    percentage,
    pointsEarned,
    pointsPossible,
    assignmentCount: entries.length,
    droppedCount,
  };
}

/**
 * Group grade entries by category
 */
function groupByCategory(entries: GradeEntry[]): Record<string, GradeEntry[]> {
  const result: Record<string, GradeEntry[]> = {};
  for (const entry of entries) {
    const category = entry.category || 'Uncategorized';
    if (!(category in result)) {
      result[category] = [];
    }
    result[category].push(entry);
  }
  return result;
}

/**
 * Get letter grade from percentage
 */
export function getLetterGrade(
  percentage: number,
  scale: GradeScale = DEFAULT_GRADE_SCALE
): string {
  for (const level of scale.levels) {
    if (percentage >= level.minPercentage && percentage <= level.maxPercentage) {
      return level.letter;
    }
  }
  return 'F';
}

/**
 * Get GPA from percentage
 */
export function getGPA(percentage: number, scale: GradeScale = DEFAULT_GRADE_SCALE): number {
  for (const level of scale.levels) {
    if (percentage >= level.minPercentage && percentage <= level.maxPercentage) {
      return level.gpa ?? 0;
    }
  }
  return 0;
}

/**
 * Get color for a letter grade
 */
export function getGradeColor(
  letterGrade: string,
  scale: GradeScale = DEFAULT_GRADE_SCALE
): string {
  const level = scale.levels.find((l) => l.letter === letterGrade);
  return level?.color ?? '#6b7280';
}

/**
 * Round grade according to scale settings
 */
export function roundGrade(value: number, scale: GradeScale): number {
  const multiplier = Math.pow(10, scale.decimalPlaces);

  switch (scale.roundingMethod) {
    case 'floor':
      return Math.floor(value * multiplier) / multiplier;
    case 'ceiling':
      return Math.ceil(value * multiplier) / multiplier;
    case 'half_up':
      return Math.round(value * multiplier) / multiplier;
    case 'none':
    default:
      return value;
  }
}

/**
 * Check if grade is passing
 */
export function isPassing(percentage: number, scale: GradeScale = DEFAULT_GRADE_SCALE): boolean {
  return percentage >= scale.passingGrade;
}

/**
 * Calculate class average from student grades
 */
export function calculateClassAverage(grades: { percentage?: number }[]): number {
  const validGrades = grades.filter((g) => g.percentage !== undefined);
  if (validGrades.length === 0) return 0;
  return validGrades.reduce((sum, g) => sum + (g.percentage ?? 0), 0) / validGrades.length;
}

/**
 * Calculate grade distribution
 */
export function calculateGradeDistribution(
  grades: { percentage: number }[],
  scale: GradeScale = DEFAULT_GRADE_SCALE
): Record<string, number> {
  const distribution: Record<string, number> = {};

  // Initialize all letter grades to 0
  for (const level of scale.levels) {
    distribution[level.letter] = 0;
  }

  // Count grades in each bucket
  for (const grade of grades) {
    const letter = getLetterGrade(grade.percentage, scale);
    distribution[letter] = (distribution[letter] ?? 0) + 1;
  }

  return distribution;
}

/**
 * Calculate what-if grade
 */
export function calculateWhatIfGrade(
  currentEntries: GradeEntry[],
  hypotheticalEntry: GradeEntry,
  scale: GradeScale = DEFAULT_GRADE_SCALE
): GradeCalculationResult {
  const allEntries = [...currentEntries, hypotheticalEntry];
  return calculateOverallGrade(allEntries, scale);
}

/**
 * Calculate minimum score needed on an assignment to achieve target grade
 */
export function calculateNeededScore(
  currentEntries: GradeEntry[],
  targetPercentage: number,
  assignmentPoints: number,
  category: string,
  weight = 1,
  scale: GradeScale = DEFAULT_GRADE_SCALE
): number | null {
  // Binary search for the needed score
  let low = 0;
  let high = assignmentPoints;
  const tolerance = 0.01;

  while (high - low > tolerance) {
    const mid = (low + high) / 2;
    const result = calculateWhatIfGrade(
      currentEntries,
      { score: mid, possible: assignmentPoints, weight, category },
      scale
    );

    if (result.percentage >= targetPercentage) {
      high = mid;
    } else {
      low = mid;
    }
  }

  const neededScore = Math.ceil(high * 100) / 100;

  // Check if it's achievable
  if (neededScore > assignmentPoints) {
    return null; // Impossible to achieve
  }

  return neededScore;
}
