/**
 * Embed Types Tests
 */

import { describe, it, expect } from 'vitest';

import {
  ToolScope,
  ToolSessionStatus,
  SessionEventType,
  isToolScope,
  isSessionEventType,
  isToolSessionStatus,
  type ToolLaunchTokenClaims,
  type LearnerContext,
  type AivoToToolMessage,
  type ToolToAivoMessage,
  type ThemeContext,
} from '../src/types/index.js';

describe('Embed Types', () => {
  describe('ToolScope enum', () => {
    it('should have all expected scope values', () => {
      expect(ToolScope.LEARNER_PROFILE_MIN).toBe('LEARNER_PROFILE_MIN');
      expect(ToolScope.LEARNER_PROFILE_EXTENDED).toBe('LEARNER_PROFILE_EXTENDED');
      expect(ToolScope.LEARNER_PSEUDONYM).toBe('LEARNER_PSEUDONYM');
      expect(ToolScope.CLASSROOM_CONTEXT).toBe('CLASSROOM_CONTEXT');
      expect(ToolScope.ASSIGNMENT_CONTEXT).toBe('ASSIGNMENT_CONTEXT');
      expect(ToolScope.SESSION_EVENTS_WRITE).toBe('SESSION_EVENTS_WRITE');
      expect(ToolScope.SESSION_EVENTS_READ).toBe('SESSION_EVENTS_READ');
      expect(ToolScope.PROGRESS_READ).toBe('PROGRESS_READ');
      expect(ToolScope.PROGRESS_WRITE).toBe('PROGRESS_WRITE');
      expect(ToolScope.THEME_READ).toBe('THEME_READ');
      expect(ToolScope.LEARNER_NAME_FULL).toBe('LEARNER_NAME_FULL');
      expect(ToolScope.LEARNER_GRADE_EXACT).toBe('LEARNER_GRADE_EXACT');
      expect(ToolScope.TEACHER_CONTEXT).toBe('TEACHER_CONTEXT');
    });

    it('should have exactly 13 scopes', () => {
      const scopeValues = Object.values(ToolScope);
      expect(scopeValues).toHaveLength(13);
    });
  });

  describe('ToolSessionStatus enum', () => {
    it('should have all expected status values', () => {
      expect(ToolSessionStatus.ACTIVE).toBe('ACTIVE');
      expect(ToolSessionStatus.COMPLETED).toBe('COMPLETED');
      expect(ToolSessionStatus.EXPIRED).toBe('EXPIRED');
      expect(ToolSessionStatus.REVOKED).toBe('REVOKED');
    });
  });

  describe('SessionEventType enum', () => {
    it('should have all expected event types', () => {
      expect(SessionEventType.SESSION_STARTED).toBe('SESSION_STARTED');
      expect(SessionEventType.SESSION_ENDED).toBe('SESSION_ENDED');
      expect(SessionEventType.ACTIVITY_STARTED).toBe('ACTIVITY_STARTED');
      expect(SessionEventType.ACTIVITY_COMPLETED).toBe('ACTIVITY_COMPLETED');
      expect(SessionEventType.ACTIVITY_PROGRESS).toBe('ACTIVITY_PROGRESS');
      expect(SessionEventType.SCORE_RECORDED).toBe('SCORE_RECORDED');
      expect(SessionEventType.TIME_SPENT).toBe('TIME_SPENT');
      expect(SessionEventType.BADGE_EARNED).toBe('BADGE_EARNED');
      expect(SessionEventType.INTERACTION).toBe('INTERACTION');
      expect(SessionEventType.HINT_REQUESTED).toBe('HINT_REQUESTED');
      expect(SessionEventType.HINT_VIEWED).toBe('HINT_VIEWED');
      expect(SessionEventType.TOOL_ERROR).toBe('TOOL_ERROR');
      expect(SessionEventType.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(SessionEventType.TOKEN_REFRESHED).toBe('TOKEN_REFRESHED');
      expect(SessionEventType.SCOPE_VIOLATION).toBe('SCOPE_VIOLATION');
    });
  });

  describe('isToolScope type guard', () => {
    it('should return true for valid scopes', () => {
      expect(isToolScope('LEARNER_PROFILE_MIN')).toBe(true);
      expect(isToolScope('SESSION_EVENTS_WRITE')).toBe(true);
      expect(isToolScope('TEACHER_CONTEXT')).toBe(true);
    });

    it('should return false for invalid scopes', () => {
      expect(isToolScope('INVALID_SCOPE')).toBe(false);
      expect(isToolScope('')).toBe(false);
      expect(isToolScope(null)).toBe(false);
      expect(isToolScope(undefined)).toBe(false);
      expect(isToolScope(123)).toBe(false);
    });
  });

  describe('isSessionEventType type guard', () => {
    it('should return true for valid event types', () => {
      expect(isSessionEventType('ACTIVITY_STARTED')).toBe(true);
      expect(isSessionEventType('SCORE_RECORDED')).toBe(true);
      expect(isSessionEventType('SESSION_ENDED')).toBe(true);
    });

    it('should return false for invalid event types', () => {
      expect(isSessionEventType('INVALID_EVENT')).toBe(false);
      expect(isSessionEventType('')).toBe(false);
      expect(isSessionEventType(null)).toBe(false);
    });
  });

  describe('isToolSessionStatus type guard', () => {
    it('should return true for valid statuses', () => {
      expect(isToolSessionStatus('ACTIVE')).toBe(true);
      expect(isToolSessionStatus('COMPLETED')).toBe(true);
      expect(isToolSessionStatus('EXPIRED')).toBe(true);
      expect(isToolSessionStatus('REVOKED')).toBe(true);
    });

    it('should return false for invalid statuses', () => {
      expect(isToolSessionStatus('INVALID')).toBe(false);
      expect(isToolSessionStatus('')).toBe(false);
      expect(isToolSessionStatus(null)).toBe(false);
    });
  });

  describe('ToolLaunchTokenClaims type', () => {
    it('should accept valid claims structure', () => {
      const claims: ToolLaunchTokenClaims = {
        jti: 'unique-jwt-id',
        iss: 'aivo-embedded-tools',
        aud: 'math-vendor',
        sub: 'session-uuid',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 900,
        nbf: Date.now() / 1000,
        aivo_tenant_id: 'tenant-uuid',
        aivo_item_id: 'item-uuid',
        aivo_item_version_id: 'version-uuid',
        aivo_installation_id: 'installation-uuid',
        aivo_scopes: [ToolScope.LEARNER_PROFILE_MIN, ToolScope.SESSION_EVENTS_WRITE],
      };

      expect(claims.iss).toBe('aivo-embedded-tools');
      expect(claims.aivo_scopes).toContain(ToolScope.LEARNER_PROFILE_MIN);
    });
  });

  describe('LearnerContext type', () => {
    it('should accept minimal learner context', () => {
      const context: LearnerContext = {
        pseudonymousId: 'pseudo-abc123',
      };

      expect(context.pseudonymousId).toBe('pseudo-abc123');
    });

    it('should accept full learner context', () => {
      const context: LearnerContext = {
        pseudonymousId: 'pseudo-abc123',
        initials: 'J.',
        gradeBand: 'G3_5',
        subject: 'MATH',
        firstName: 'John',
        gradeLevel: 4,
      };

      expect(context.initials).toBe('J.');
      expect(context.gradeBand).toBe('G3_5');
    });
  });

  describe('ThemeContext type', () => {
    it('should accept theme context', () => {
      const theme: ThemeContext = {
        mode: 'dark',
        primaryColor: '#6366f1',
        accentColor: '#10b981',
        gradeBandStyle: 'elementary',
      };

      expect(theme.mode).toBe('dark');
      expect(theme.primaryColor).toBe('#6366f1');
    });
  });
});
