import { describe, it, expect } from 'vitest';
import {
  isApiProgressReport,
  isProgressReportData,
} from '@/src/lib/adapters/progress-report.adapter';

describe('progress-report.adapter', () => {
  describe('isApiProgressReport', () => {
    it('returns true for valid ProgressReport shape', () => {
      const data = {
        overview: { lessonsCompleted: 10, totalLearningTime: 120 },
        subjectPerformance: [],
        weeklyProgress: [],
      };
      expect(isApiProgressReport(data)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isApiProgressReport(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isApiProgressReport(undefined)).toBe(false);
    });

    it('returns false for non-object', () => {
      expect(isApiProgressReport('string')).toBe(false);
      expect(isApiProgressReport(123)).toBe(false);
    });

    it('returns false when overview is missing', () => {
      const data = { subjectPerformance: [], weeklyProgress: [] };
      expect(isApiProgressReport(data)).toBe(false);
    });

    it('returns false when subjectPerformance is missing', () => {
      const data = { overview: {}, weeklyProgress: [] };
      expect(isApiProgressReport(data)).toBe(false);
    });

    it('returns false when weeklyProgress is missing', () => {
      const data = { overview: {}, subjectPerformance: [] };
      expect(isApiProgressReport(data)).toBe(false);
    });
  });

  describe('isProgressReportData', () => {
    it('returns true for valid ProgressReportData shape', () => {
      const data = {
        progress: {},
        assessments: {},
        analysis: {},
      };
      expect(isProgressReportData(data)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isProgressReportData(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isProgressReportData(undefined)).toBe(false);
    });

    it('returns false for non-object', () => {
      expect(isProgressReportData('string')).toBe(false);
      expect(isProgressReportData(42)).toBe(false);
    });

    it('returns false when progress is missing', () => {
      const data = { assessments: {}, analysis: {} };
      expect(isProgressReportData(data)).toBe(false);
    });

    it('returns false when assessments is missing', () => {
      const data = { progress: {}, analysis: {} };
      expect(isProgressReportData(data)).toBe(false);
    });

    it('returns false when analysis is missing', () => {
      const data = { progress: {}, assessments: {} };
      expect(isProgressReportData(data)).toBe(false);
    });
  });

  describe('type guard mutual exclusivity', () => {
    it('API report is not ProgressReportData', () => {
      const apiData = {
        overview: {},
        subjectPerformance: [],
        weeklyProgress: [],
      };
      expect(isApiProgressReport(apiData)).toBe(true);
      expect(isProgressReportData(apiData)).toBe(false);
    });

    it('ProgressReportData is not API report', () => {
      const reportData = {
        progress: {},
        assessments: {},
        analysis: {},
      };
      expect(isProgressReportData(reportData)).toBe(true);
      expect(isApiProgressReport(reportData)).toBe(false);
    });

    it('both return false for empty object', () => {
      expect(isApiProgressReport({})).toBe(false);
      expect(isProgressReportData({})).toBe(false);
    });
  });
});
