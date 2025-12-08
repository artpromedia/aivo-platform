import { describe, it, expect } from 'vitest';

import { detectFocusLoss } from '../src/engine/focusDetection.js';
import type { FocusPing } from '../src/types/telemetry.js';

describe('Focus Loss Detection Engine', () => {
  const basePing: FocusPing = {
    sessionId: 'session-123',
    learnerId: 'learner-123',
    timestamp: new Date().toISOString(),
    activityId: 'activity-1',
    idleMs: 0,
    appInBackground: false,
  };

  describe('Extended Idle Detection', () => {
    it('should not detect focus loss with low idle times', () => {
      const pings: FocusPing[] = [
        { ...basePing, idleMs: 5000 },
        { ...basePing, idleMs: 3000 },
        { ...basePing, idleMs: 2000 },
        { ...basePing, idleMs: 1000 },
      ];

      const result = detectFocusLoss(pings);

      expect(result.detected).toBe(false);
      expect(result.reasons).not.toContain('extended_idle');
    });

    it('should detect focus loss with consecutive high idle times', () => {
      const pings: FocusPing[] = [
        { ...basePing, idleMs: 35000 },
        { ...basePing, idleMs: 40000 },
        { ...basePing, idleMs: 32000 },
        { ...basePing, idleMs: 5000 },
      ];

      const result = detectFocusLoss(pings, {
        idleThresholdMs: 30000,
        consecutiveIdlePingsThreshold: 2,
      });

      expect(result.detected).toBe(true);
      expect(result.reasons).toContain('extended_idle');
    });

    it('should detect focus loss when majority of pings are high idle', () => {
      const pings: FocusPing[] = [
        { ...basePing, idleMs: 35000 },
        { ...basePing, idleMs: 5000 },
        { ...basePing, idleMs: 40000 },
        { ...basePing, idleMs: 32000 },
        { ...basePing, idleMs: 38000 },
      ];

      const result = detectFocusLoss(pings, { idleThresholdMs: 30000 });

      expect(result.detected).toBe(true);
      expect(result.reasons).toContain('extended_idle');
    });
  });

  describe('Rapid Switching Detection', () => {
    it('should not detect rapid switching with same activity', () => {
      const now = Date.now();
      const pings: FocusPing[] = [
        { ...basePing, activityId: 'activity-1', timestamp: new Date(now).toISOString() },
        { ...basePing, activityId: 'activity-1', timestamp: new Date(now - 10000).toISOString() },
        { ...basePing, activityId: 'activity-1', timestamp: new Date(now - 20000).toISOString() },
      ];

      const result = detectFocusLoss(pings);

      expect(result.reasons).not.toContain('rapid_switching');
    });

    it('should detect rapid switching with many activity changes', () => {
      const now = Date.now();
      const pings: FocusPing[] = [
        { ...basePing, activityId: 'activity-1', timestamp: new Date(now).toISOString() },
        { ...basePing, activityId: 'activity-2', timestamp: new Date(now - 10000).toISOString() },
        { ...basePing, activityId: 'activity-3', timestamp: new Date(now - 20000).toISOString() },
        { ...basePing, activityId: 'activity-4', timestamp: new Date(now - 30000).toISOString() },
      ];

      const result = detectFocusLoss(pings, {
        rapidSwitchThreshold: 3,
        rapidSwitchWindowMs: 60000,
      });

      expect(result.detected).toBe(true);
      expect(result.reasons).toContain('rapid_switching');
    });
  });

  describe('Self-Reported Mood Detection', () => {
    it('should detect frustrated mood', () => {
      const pings: FocusPing[] = [
        { ...basePing, selfReportedMood: 'frustrated' },
        { ...basePing },
        { ...basePing },
      ];

      const result = detectFocusLoss(pings);

      expect(result.detected).toBe(true);
      expect(result.reasons).toContain('self_reported_frustrated');
    });

    it('should detect tired mood', () => {
      const pings: FocusPing[] = [
        { ...basePing, selfReportedMood: 'tired' },
        { ...basePing },
        { ...basePing },
      ];

      const result = detectFocusLoss(pings);

      expect(result.detected).toBe(true);
      expect(result.reasons).toContain('self_reported_tired');
    });

    it('should not trigger on happy or okay mood', () => {
      const pings: FocusPing[] = [
        { ...basePing, selfReportedMood: 'happy' },
        { ...basePing, selfReportedMood: 'okay' },
        { ...basePing },
      ];

      const result = detectFocusLoss(pings);

      expect(result.reasons).not.toContain('self_reported_frustrated');
      expect(result.reasons).not.toContain('self_reported_tired');
    });
  });

  describe('App Backgrounding Detection', () => {
    it('should detect frequent app backgrounding', () => {
      const pings: FocusPing[] = [
        { ...basePing, appInBackground: true },
        { ...basePing, appInBackground: true },
        { ...basePing, appInBackground: true },
        { ...basePing, appInBackground: true },
        { ...basePing, appInBackground: false },
      ];

      const result = detectFocusLoss(pings);

      expect(result.detected).toBe(true);
      expect(result.reasons).toContain('app_backgrounded');
    });

    it('should not trigger with occasional backgrounding', () => {
      const pings: FocusPing[] = [
        { ...basePing, appInBackground: false },
        { ...basePing, appInBackground: true },
        { ...basePing, appInBackground: false },
        { ...basePing, appInBackground: false },
        { ...basePing, appInBackground: false },
      ];

      const result = detectFocusLoss(pings);

      expect(result.reasons).not.toContain('app_backgrounded');
    });
  });

  describe('Rapid Exit Detection', () => {
    it('should detect multiple rapid exits', () => {
      const pings: FocusPing[] = [
        { ...basePing, rapidExit: true },
        { ...basePing, rapidExit: true },
        { ...basePing },
      ];

      const result = detectFocusLoss(pings);

      expect(result.detected).toBe(true);
      expect(result.reasons).toContain('rapid_exit');
    });

    it('should not trigger on single rapid exit', () => {
      const pings: FocusPing[] = [
        { ...basePing, rapidExit: true },
        { ...basePing },
        { ...basePing },
      ];

      const result = detectFocusLoss(pings);

      expect(result.reasons).not.toContain('rapid_exit');
    });
  });

  describe('Combined Triggers', () => {
    it('should suggest regulation_break for high confidence detections', () => {
      const pings: FocusPing[] = [
        { ...basePing, selfReportedMood: 'frustrated', idleMs: 35000 },
        { ...basePing, idleMs: 40000 },
        { ...basePing, idleMs: 32000 },
      ];

      const result = detectFocusLoss(pings, { idleThresholdMs: 30000 });

      expect(result.detected).toBe(true);
      expect(result.suggestedIntervention).toBe('regulation_break');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should suggest light_prompt for low confidence detections', () => {
      const pings: FocusPing[] = [
        { ...basePing, selfReportedMood: 'tired' },
        { ...basePing },
        { ...basePing },
      ];

      const result = detectFocusLoss(pings);

      expect(result.detected).toBe(true);
      expect(result.suggestedIntervention).toBe('light_prompt');
    });
  });

  describe('Minimum Pings Requirement', () => {
    it('should not detect with too few pings', () => {
      const pings: FocusPing[] = [{ ...basePing, selfReportedMood: 'frustrated' }];

      const result = detectFocusLoss(pings);

      expect(result.detected).toBe(false);
      expect(result.confidence).toBe(0);
    });

    it('should analyze when minimum pings are met', () => {
      const pings: FocusPing[] = [
        { ...basePing, selfReportedMood: 'frustrated' },
        { ...basePing },
        { ...basePing },
      ];

      const result = detectFocusLoss(pings);

      expect(result.detected).toBe(true);
    });
  });
});
