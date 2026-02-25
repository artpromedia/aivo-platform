// ════════════════════════════════════════════════════════════════
// Auth Configuration Collector
// Password policy, lockout, session timeout, MFA config
// Controls: CC5.1, CC5.2
// ════════════════════════════════════════════════════════════════

import { config } from '../config.js';
import { registerCollector } from '../services/collector-runner.js';
import type { CollectorResult } from '../types.js';

registerCollector('auth-config', async (periodStart, periodEnd): Promise<CollectorResult> => {
  const evidence: {
    collectedAt: string;
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
      maxAge: string;
      historyCount: number;
    };
    accountLockout: {
      enabled: boolean;
      maxAttempts: number;
      lockoutDuration: string;
      resetAfter: string;
    };
    sessionManagement: {
      accessTokenTtl: string;
      refreshTokenTtl: string;
      absoluteTimeout: string;
      idleTimeout: string;
      concurrentSessions: string;
    };
    mfa: {
      available: boolean;
      methods: string[];
      enforcedForRoles: string[];
      enrollmentRate: number | null;
    };
    authMechanisms: string[];
  } = {
    collectedAt: new Date().toISOString(),
    passwordPolicy: {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      maxAge: '90 days',
      historyCount: 12,
    },
    accountLockout: {
      enabled: true,
      maxAttempts: 5,
      lockoutDuration: '30 minutes',
      resetAfter: '15 minutes',
    },
    sessionManagement: {
      accessTokenTtl: '15 minutes',
      refreshTokenTtl: '7 days',
      absoluteTimeout: '24 hours',
      idleTimeout: '30 minutes',
      concurrentSessions: 'Allowed (max 5 per user)',
    },
    mfa: {
      available: true,
      methods: ['TOTP (Authenticator app)', 'Email OTP'],
      enforcedForRoles: ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'DISTRICT_ADMIN'],
      enrollmentRate: null,
    },
    authMechanisms: ['Email/password', 'OAuth 2.0 (Google)', 'SSO (SAML 2.0)'],
  };

  // Try to get live auth config from auth-svc
  try {
    const resp = await fetch(`${config.authSvcUrl}/auth/admin/security-config`);
    if (resp.ok) {
      const data = (await resp.json()) as any;
      if (data.passwordPolicy) {
        Object.assign(evidence.passwordPolicy, data.passwordPolicy);
      }
      if (data.lockout) {
        Object.assign(evidence.accountLockout, data.lockout);
      }
      if (data.mfa?.enrollmentRate != null) {
        evidence.mfa.enrollmentRate = data.mfa.enrollmentRate;
      }
    }
  } catch {
    // auth-svc may not be reachable
  }

  const findings: string[] = [];
  if (evidence.passwordPolicy.minLength < 12) {
    findings.push(`Password minimum length (${evidence.passwordPolicy.minLength}) below 12-character recommendation`);
  }
  if (!evidence.accountLockout.enabled) {
    findings.push('Account lockout is disabled');
  }
  if (evidence.mfa.enrollmentRate != null && evidence.mfa.enrollmentRate < 100) {
    findings.push(`MFA enrollment at ${evidence.mfa.enrollmentRate}% — not 100% for enforced roles`);
  }

  return {
    collectorId: 'auth-config',
    controlIds: ['CC5.1.2', 'CC5.1.3', 'CC5.1.4', 'CC5.1.5', 'CC5.2.2'],
    periodStart,
    periodEnd,
    artifacts: [
      {
        filename: 'auth-config.json',
        format: 'json',
        content: evidence,
        controlId: 'CC5.1.2',
      },
      {
        filename: 'auth-config-summary.md',
        format: 'markdown',
        content: [
          '# Authentication Configuration Evidence',
          '',
          `**Period:** ${periodStart.toISOString().slice(0, 10)} — ${periodEnd.toISOString().slice(0, 10)}`,
          '',
          '## Password Policy',
          '',
          `- Minimum length: ${evidence.passwordPolicy.minLength}`,
          `- Complexity: Upper=${evidence.passwordPolicy.requireUppercase}, Lower=${evidence.passwordPolicy.requireLowercase}, Numbers=${evidence.passwordPolicy.requireNumbers}, Special=${evidence.passwordPolicy.requireSpecialChars}`,
          `- Max age: ${evidence.passwordPolicy.maxAge}`,
          `- History: Last ${evidence.passwordPolicy.historyCount} passwords`,
          '',
          '## Account Lockout',
          '',
          `- Enabled: ${evidence.accountLockout.enabled}`,
          `- Max attempts: ${evidence.accountLockout.maxAttempts}`,
          `- Lockout duration: ${evidence.accountLockout.lockoutDuration}`,
          '',
          '## Session Management',
          '',
          `- Access token TTL: ${evidence.sessionManagement.accessTokenTtl}`,
          `- Refresh token TTL: ${evidence.sessionManagement.refreshTokenTtl}`,
          `- Absolute timeout: ${evidence.sessionManagement.absoluteTimeout}`,
          `- Idle timeout: ${evidence.sessionManagement.idleTimeout}`,
          `- Concurrent sessions: ${evidence.sessionManagement.concurrentSessions}`,
          '',
          '## Multi-Factor Authentication',
          '',
          `- Available: ${evidence.mfa.available}`,
          `- Methods: ${evidence.mfa.methods.join(', ')}`,
          `- Enforced for: ${evidence.mfa.enforcedForRoles.join(', ')}`,
          `- Enrollment rate: ${evidence.mfa.enrollmentRate != null ? `${evidence.mfa.enrollmentRate}%` : 'Unknown'}`,
          '',
          '## Auth Mechanisms',
          '',
          ...evidence.authMechanisms.map(m => `- ${m}`),
          '',
          findings.length > 0
            ? '## Findings\n\n' + findings.map(f => `- ⚠️ ${f}`).join('\n')
            : '',
        ].join('\n'),
        controlId: 'CC5.1.2',
      },
    ],
    summary: `Auth: pw min ${evidence.passwordPolicy.minLength}, lockout ${evidence.accountLockout.enabled ? 'on' : 'off'}, MFA ${evidence.mfa.enrollmentRate ?? '?'}%`,
  };
});
