// ════════════════════════════════════════════════════════════════════════════
// Configuration
// ════════════════════════════════════════════════════════════════════════════

import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '3092', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',

  // S3
  s3: {
    bucket: process.env.S3_BUCKET || 'aivo-compliance-evidence',
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || undefined,
  },

  // Internal services
  authSvcUrl: process.env.AUTH_SVC_URL || 'http://localhost:3000',
  auditSvcUrl: process.env.AUDIT_SVC_URL || 'http://localhost:3004',
  complianceSvcUrl: process.env.COMPLIANCE_SVC_URL || 'http://localhost:3012',
  prometheusUrl: process.env.PROMETHEUS_URL || 'http://localhost:9090',

  // GitHub
  github: {
    token: process.env.GITHUB_TOKEN || '',
    owner: process.env.GITHUB_OWNER || 'artpromedia',
    repo: process.env.GITHUB_REPO || 'aivo-platform',
  },

  // Database
  databaseUrl: process.env.DATABASE_URL || '',

  // Evidence retention
  retentionDays: parseInt(process.env.EVIDENCE_RETENTION_DAYS || '2555', 10),
  immutableLockDays: parseInt(process.env.IMMUTABLE_LOCK_DAYS || '365', 10),
} as const;
