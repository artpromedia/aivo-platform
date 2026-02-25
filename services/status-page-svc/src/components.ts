// ==============================================================================
// AIVO Status Page Service — Component Definitions
// ==============================================================================
// 16 components across 4 groups — matches the AIVO platform architecture.

import type { Component, ComponentGroup, ComponentGroupInfo, StatusLevel } from './types.js';

// ---------------------------------------------------------------------------
// Component Groups
// ---------------------------------------------------------------------------
export const COMPONENT_GROUPS: ComponentGroupInfo[] = [
  {
    id: 'core_platform',
    name: 'Core Platform',
    description: 'Authentication, API gateway, and primary user-facing portals',
    order: 1,
  },
  {
    id: 'learning_services',
    name: 'Learning Services',
    description: 'Content delivery, assessments, AI tutoring, and gamification',
    order: 2,
  },
  {
    id: 'administrative',
    name: 'Administrative',
    description: 'District admin, billing, reports, and messaging',
    order: 3,
  },
  {
    id: 'infrastructure',
    name: 'Infrastructure',
    description: 'Database, cache, and event bus',
    order: 4,
  },
];

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------
export const COMPONENTS: Component[] = [
  // ── Core Platform ──────────────────────────────────────────────────────
  {
    id: 'auth',
    name: 'Authentication & SSO',
    description: 'User login, registration, SSO, and session management',
    group: 'core_platform',
    status: 'operational',
    healthQuery: 'up{job="auth-svc"}',
    latencyQuery: 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job="auth-svc"}[5m]))',
    errorRateQuery: 'sum(rate(http_requests_total{job="auth-svc",status=~"5.."}[5m])) / sum(rate(http_requests_total{job="auth-svc"}[5m]))',
    order: 1,
  },
  {
    id: 'api-gateway',
    name: 'API Gateway',
    description: 'Central request routing and rate limiting',
    group: 'core_platform',
    status: 'operational',
    healthQuery: 'up{job="api-gateway"}',
    latencyQuery: 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job="api-gateway"}[5m]))',
    errorRateQuery: 'sum(rate(http_requests_total{job="api-gateway",status=~"5.."}[5m])) / sum(rate(http_requests_total{job="api-gateway"}[5m]))',
    order: 2,
  },
  {
    id: 'student-portal',
    name: 'Student Portal',
    description: 'Learner-facing web application',
    group: 'core_platform',
    status: 'operational',
    healthQuery: 'up{job="web-learner"}',
    order: 3,
  },
  {
    id: 'parent-dashboard',
    name: 'Parent Dashboard',
    description: 'Parent monitoring and family management',
    group: 'core_platform',
    status: 'operational',
    healthQuery: 'up{job="web-parent"}',
    order: 4,
  },
  {
    id: 'teacher-tools',
    name: 'Teacher Tools',
    description: 'Classroom management, grading, and lesson planning',
    group: 'core_platform',
    status: 'operational',
    healthQuery: 'up{job="web-teacher"}',
    order: 5,
  },

  // ── Learning Services ──────────────────────────────────────────────────
  {
    id: 'content-delivery',
    name: 'Content Delivery',
    description: 'Lesson content, media, and curriculum delivery',
    group: 'learning_services',
    status: 'operational',
    healthQuery: 'up{job="content-svc"}',
    latencyQuery: 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job="content-svc"}[5m]))',
    errorRateQuery: 'sum(rate(http_requests_total{job="content-svc",status=~"5.."}[5m])) / sum(rate(http_requests_total{job="content-svc"}[5m]))',
    order: 6,
  },
  {
    id: 'assessments',
    name: 'Assessments',
    description: 'Quizzes, tests, and auto-grading',
    group: 'learning_services',
    status: 'operational',
    healthQuery: 'up{job="assessment-svc"}',
    latencyQuery: 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job="assessment-svc"}[5m]))',
    errorRateQuery: 'sum(rate(http_requests_total{job="assessment-svc",status=~"5.."}[5m])) / sum(rate(http_requests_total{job="assessment-svc"}[5m]))',
    order: 7,
  },
  {
    id: 'ai-tutoring',
    name: 'AI Tutoring',
    description: 'AI-powered personalized tutoring engine',
    group: 'learning_services',
    status: 'operational',
    healthQuery: 'up{job="brain-engine"}',
    latencyQuery: 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job="brain-engine"}[5m]))',
    errorRateQuery: 'sum(rate(http_requests_total{job="brain-engine",status=~"5.."}[5m])) / sum(rate(http_requests_total{job="brain-engine"}[5m]))',
    order: 8,
  },
  {
    id: 'gamification',
    name: 'Gamification',
    description: 'Points, badges, leaderboards, and rewards',
    group: 'learning_services',
    status: 'operational',
    healthQuery: 'up{job="gamification-svc"}',
    order: 9,
  },

  // ── Administrative ─────────────────────────────────────────────────────
  {
    id: 'district-admin',
    name: 'District Admin',
    description: 'School and district management portal',
    group: 'administrative',
    status: 'operational',
    healthQuery: 'up{job="web-district"}',
    order: 10,
  },
  {
    id: 'billing',
    name: 'Billing',
    description: 'Subscription management, invoicing, and payments',
    group: 'administrative',
    status: 'operational',
    healthQuery: 'up{job="billing-svc"}',
    latencyQuery: 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job="billing-svc"}[5m]))',
    errorRateQuery: 'sum(rate(http_requests_total{job="billing-svc",status=~"5.."}[5m])) / sum(rate(http_requests_total{job="billing-svc"}[5m]))',
    order: 11,
  },
  {
    id: 'reports',
    name: 'Reports & Analytics',
    description: 'Academic reporting and usage analytics',
    group: 'administrative',
    status: 'operational',
    healthQuery: 'up{job="analytics-svc"}',
    order: 12,
  },
  {
    id: 'messaging',
    name: 'Messaging & Notifications',
    description: 'In-app messaging, email, and push notifications',
    group: 'administrative',
    status: 'operational',
    healthQuery: 'up{job="messaging-svc"}',
    order: 13,
  },

  // ── Infrastructure ─────────────────────────────────────────────────────
  {
    id: 'database',
    name: 'Database',
    description: 'Primary PostgreSQL database cluster',
    group: 'infrastructure',
    status: 'operational',
    healthQuery: 'pg_up',
    order: 14,
  },
  {
    id: 'cache',
    name: 'Cache',
    description: 'Redis cache and session store',
    group: 'infrastructure',
    status: 'operational',
    healthQuery: 'redis_up',
    order: 15,
  },
  {
    id: 'event-bus',
    name: 'Event Bus',
    description: 'NATS JetStream message broker',
    group: 'infrastructure',
    status: 'operational',
    healthQuery: 'nats_server_info',
    order: 16,
  },
];

/** Look up a component by ID */
export function getComponent(id: string): Component | undefined {
  return COMPONENTS.find((c) => c.id === id);
}

/** Get components in a specific group */
export function getComponentsByGroup(group: ComponentGroup): Component[] {
  return COMPONENTS.filter((c) => c.group === group).sort((a, b) => a.order - b.order);
}

/** Derive overall status from all component statuses */
export function deriveOverallStatus(components: Pick<Component, 'status'>[]): StatusLevel {
  const statuses = components.map((c) => c.status);

  if (statuses.includes('major_outage')) return 'major_outage';
  if (statuses.includes('partial_outage')) return 'partial_outage';
  if (statuses.includes('degraded')) return 'degraded';
  if (statuses.includes('maintenance')) return 'maintenance';
  return 'operational';
}
