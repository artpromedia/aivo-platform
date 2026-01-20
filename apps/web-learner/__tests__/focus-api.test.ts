import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  sendFocusPing,
  getBreakRecommendation,
  reportBreakStarted,
  reportBreakComplete,
  reportMoodChange,
  getRegulationActivities,
  type FocusTelemetry,
  type RecommendationContext,
} from '../lib/focus/focus-api';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Focus API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('sendFocusPing', () => {
    it('should send a focus ping with telemetry data', async () => {
      const mockResponse = {
        received: true,
        detection: {
          focusLossDetected: false,
          reasons: [],
          suggestedIntervention: 'none',
          confidence: 0,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const telemetry: FocusTelemetry = {
        idleMs: 5000,
        appInBackground: false,
        selfReportedMood: 'okay',
      };

      const result = await sendFocusPing(
        'session-123',
        'learner-456',
        'activity-789',
        telemetry
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/focus/ping'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('session-123'),
        })
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body).toMatchObject({
        sessionId: 'session-123',
        learnerId: 'learner-456',
        activityId: 'activity-789',
        idleMs: 5000,
        appInBackground: false,
        selfReportedMood: 'okay',
      });
      expect(body.timestamp).toBeDefined();

      expect(result).toEqual(mockResponse);
    });

    it('should handle focus loss detection response', async () => {
      const mockResponse = {
        received: true,
        detection: {
          focusLossDetected: true,
          reasons: ['extended_idle', 'self_reported_tired'],
          suggestedIntervention: 'regulation_break',
          confidence: 0.85,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await sendFocusPing('session-123', 'learner-456', 'activity-789', {
        idleMs: 120000,
        appInBackground: false,
        selfReportedMood: 'tired',
      });

      expect(result.detection.focusLossDetected).toBe(true);
      expect(result.detection.reasons).toContain('extended_idle');
      expect(result.detection.suggestedIntervention).toBe('regulation_break');
    });

    it('should include rapidExit flag when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ received: true, detection: {} }),
      });

      await sendFocusPing('session-123', 'learner-456', 'activity-789', {
        idleMs: 1000,
        appInBackground: false,
        rapidExit: true,
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.rapidExit).toBe(true);
    });

    it('should throw an error on failed ping', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('Server error'),
      });

      await expect(
        sendFocusPing('session-123', 'learner-456', 'activity-789', {
          idleMs: 1000,
          appInBackground: false,
        })
      ).rejects.toThrow('Focus ping failed: Server error');
    });
  });

  describe('getBreakRecommendation', () => {
    it('should fetch a break recommendation', async () => {
      const mockRecommendation = {
        activityType: 'breathing',
        title: 'Balloon Breaths',
        description: 'Take slow, deep breaths like blowing up a balloon',
        estimatedDurationSeconds: 60,
        instructions: ['Breathe in slowly', 'Hold for a moment', 'Breathe out slowly'],
        source: 'static',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ recommendation: mockRecommendation }),
      });

      const context: RecommendationContext = {
        currentActivityId: 'activity-789',
        gradeBand: 'K5',
        mood: 'frustrated',
        focusLossReasons: ['extended_idle'],
      };

      const result = await getBreakRecommendation('session-123', 'learner-456', context);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/focus/recommendation'),
        expect.objectContaining({
          method: 'POST',
        })
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body).toMatchObject({
        sessionId: 'session-123',
        learnerId: 'learner-456',
        context: {
          currentActivityId: 'activity-789',
          gradeBand: 'K5',
          mood: 'frustrated',
          focusLossReasons: ['extended_idle'],
        },
      });

      expect(result).toEqual(mockRecommendation);
    });

    it('should throw on failed recommendation fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('Not found'),
      });

      await expect(
        getBreakRecommendation('session-123', 'learner-456', {
          gradeBand: 'G6_8',
        })
      ).rejects.toThrow('Failed to get recommendation');
    });
  });

  describe('reportBreakStarted', () => {
    it('should report break started', async () => {
      const mockResponse = {
        success: true,
        eventId: 'event-123',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await reportBreakStarted('session-123', 'learner-456', 'breathing');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/focus/break-started'),
        expect.objectContaining({
          method: 'POST',
        })
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body).toMatchObject({
        sessionId: 'session-123',
        learnerId: 'learner-456',
        activityType: 'breathing',
      });
      expect(body.startedAt).toBeDefined();

      expect(result).toEqual(mockResponse);
    });
  });

  describe('reportBreakComplete', () => {
    it('should report break completion with rating', async () => {
      const mockResponse = {
        success: true,
        eventId: 'event-456',
        message: 'Great job taking a break!',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await reportBreakComplete(
        'session-123',
        'learner-456',
        'stretching',
        120,
        true,
        4
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body).toMatchObject({
        sessionId: 'session-123',
        learnerId: 'learner-456',
        activityType: 'stretching',
        actualDurationSeconds: 120,
        completedFully: true,
        helpfulnessRating: 4,
      });

      expect(result).toEqual(mockResponse);
    });

    it('should report incomplete break without rating', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, message: 'Break ended' }),
      });

      await reportBreakComplete('session-123', 'learner-456', 'movement', 30, false);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.completedFully).toBe(false);
      expect(body.helpfulnessRating).toBeUndefined();
    });
  });

  describe('reportMoodChange', () => {
    it('should report mood change', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await reportMoodChange('session-123', 'learner-456', 'happy', {
        activityId: 'activity-789',
        triggeredBy: 'user',
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body).toMatchObject({
        sessionId: 'session-123',
        learnerId: 'learner-456',
        mood: 'happy',
        context: {
          activityId: 'activity-789',
          triggeredBy: 'user',
        },
      });
    });
  });

  describe('getRegulationActivities', () => {
    it('should fetch activities for a grade band', async () => {
      const mockActivities = [
        {
          activityType: 'breathing',
          title: 'Balloon Breaths',
          description: 'Fun breathing exercise',
          estimatedDurationSeconds: 60,
          source: 'static',
        },
        {
          activityType: 'movement',
          title: 'Wiggle Break',
          description: 'Quick movement activity',
          estimatedDurationSeconds: 90,
          source: 'static',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: mockActivities }),
      });

      const result = await getRegulationActivities('K5');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/focus/activities/K5')
      );
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Balloon Breaths');
    });
  });
});
