/**
 * AIVO Platform — Pilot District Load Test
 *
 * Simulates realistic pilot district traffic:
 *   - 50 concurrent teacher sessions
 *   - 200 concurrent parent sessions
 *   - Burst scenarios (morning login, IEP review day)
 *
 * Performance targets (PRD Phase 1):
 *   - API responses:     P95 < 500ms
 *   - Dashboard load:    P95 < 2s
 *   - Compliance report: P95 < 5s
 *   - IEP upload:        < 3 min
 *   - Error rate:        < 0.5%
 *   - Auth (login):      P95 < 1s
 *
 * Usage:
 *   k6 run tests/performance/pilot-load-test.k6.js
 *   k6 run --env API_BASE_URL=https://api.aivo.example tests/performance/pilot-load-test.k6.js
 *   k6 run --env SCENARIO=morning_rush tests/performance/pilot-load-test.k6.js
 */

import http from 'k6/http';
import { check, sleep, group, fail } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { randomString, randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { FormData } from 'https://jslib.k6.io/formdata/0.0.2/index.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';
const TENANT_ID = __ENV.TENANT_ID || 'a1b2c3d4-0000-4000-8000-000000000001';

// Pilot-scale seed data IDs (deterministic from pilot-generator.ts)
const TEACHER_COUNT = 50;
const PARENT_COUNT = 400;
const STUDENT_COUNT = 500;

// =============================================================================
// CUSTOM METRICS
// =============================================================================

// Latency metrics per endpoint category
const dashboardLatency = new Trend('dashboard_latency', true);
const iepListLatency = new Trend('iep_list_latency', true);
const iepDetailLatency = new Trend('iep_detail_latency', true);
const iepUploadLatency = new Trend('iep_upload_latency', true);
const complianceReportLatency = new Trend('compliance_report_latency', true);
const studentProfileLatency = new Trend('student_profile_latency', true);
const authLoginLatency = new Trend('auth_login_latency', true);
const aiTutorLatency = new Trend('ai_tutor_latency', true);
const progressWriteLatency = new Trend('progress_write_latency', true);
const analyticsQueryLatency = new Trend('analytics_query_latency', true);
const notificationLatency = new Trend('notification_latency', true);

// Functional metrics
const errorRate = new Rate('pilot_error_rate');
const iepComplianceCheckRate = new Rate('iep_compliance_check_rate');
const apiCalls = new Counter('pilot_api_calls');
const failedLogins = new Counter('failed_logins');
const slowResponses = new Counter('slow_responses_gt_500ms');

// =============================================================================
// SCENARIOS
// =============================================================================

const selectedScenario = __ENV.SCENARIO || 'all';

const allScenarios = {
  // Normal school day: 50 teachers + 200 parents concurrent
  normal_day: {
    executor: 'ramping-vus',
    exec: 'teacherWorkflow',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 25 }, // Morning ramp
      { duration: '5m', target: 50 }, // Full teacher load
      { duration: '10m', target: 50 }, // Sustained peak
      { duration: '3m', target: 10 }, // After-school wind-down
      { duration: '1m', target: 0 },
    ],
    tags: { scenario: 'normal_day', role: 'teacher' },
  },

  parent_access: {
    executor: 'ramping-vus',
    exec: 'parentWorkflow',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 50 }, // Gradual parent access
      { duration: '5m', target: 200 }, // Peak (evening check-in)
      { duration: '10m', target: 200 }, // Sustained
      { duration: '3m', target: 50 }, // Wind-down
      { duration: '1m', target: 0 },
    ],
    tags: { scenario: 'parent_access', role: 'parent' },
  },

  // Morning rush: all 50 teachers log in within 5 minutes
  morning_rush: {
    executor: 'ramping-arrival-rate',
    exec: 'teacherLoginBurst',
    startRate: 0,
    timeUnit: '1m',
    preAllocatedVUs: 60,
    maxVUs: 80,
    stages: [
      { duration: '1m', target: 30 }, // 7:30 AM early arrivals
      { duration: '3m', target: 50 }, // 7:45 AM rush
      { duration: '1m', target: 10 }, // Tapering
    ],
    tags: { scenario: 'morning_rush' },
  },

  // IEP review day: heavy IEP reads + compliance report generation
  iep_review_day: {
    executor: 'constant-vus',
    exec: 'iepReviewWorkflow',
    vus: 30,
    duration: '15m',
    tags: { scenario: 'iep_review_day' },
  },

  // Parent notification burst: push notification triggers 200 parents checking app
  parent_notification_burst: {
    executor: 'ramping-vus',
    exec: 'parentNotificationCheck',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 200 }, // All parents open app at once
      { duration: '3m', target: 200 }, // Browse for a few minutes
      { duration: '1m', target: 50 }, // Gradual exit
      { duration: '30s', target: 0 },
    ],
    tags: { scenario: 'parent_burst' },
  },

  // AI tutor concurrent sessions
  ai_tutor_load: {
    executor: 'constant-vus',
    exec: 'aiTutorSession',
    vus: 25,
    duration: '10m',
    tags: { scenario: 'ai_tutor' },
  },

  // End-of-day: compliance report generation for all 500 students
  compliance_reports: {
    executor: 'per-vu-iterations',
    exec: 'complianceReportGeneration',
    vus: 10,
    iterations: 50, // 10 VUs × 50 = 500 reports
    maxDuration: '30m',
    tags: { scenario: 'compliance_batch' },
  },
};

// Select scenarios based on env variable
function buildScenarios() {
  if (selectedScenario === 'all') {
    return allScenarios;
  }
  if (allScenarios[selectedScenario]) {
    return { [selectedScenario]: allScenarios[selectedScenario] };
  }
  console.warn(`Unknown scenario "${selectedScenario}", running all`);
  return allScenarios;
}

export const options = {
  scenarios: buildScenarios(),
  thresholds: {
    // Core SLOs
    http_req_duration: ['p(95)<500'], // All APIs P95 < 500ms
    pilot_error_rate: ['rate<0.005'], // < 0.5% error rate
    http_req_failed: ['rate<0.005'],

    // Per-endpoint targets
    dashboard_latency: ['p(95)<2000'], // Dashboard < 2s
    compliance_report_latency: ['p(95)<5000'], // Compliance report < 5s
    auth_login_latency: ['p(95)<1000'], // Login < 1s
    iep_list_latency: ['p(95)<1000'], // IEP list < 1s
    iep_detail_latency: ['p(95)<500'], // IEP detail < 500ms
    student_profile_latency: ['p(95)<500'], // Student profile < 500ms
    ai_tutor_latency: ['p(95)<3000'], // AI tutor response < 3s
    progress_write_latency: ['p(95)<300'], // Progress writes < 300ms
    analytics_query_latency: ['p(95)<2000'], // Analytics < 2s
    notification_latency: ['p(95)<200'], // Notifications < 200ms
  },
};

// =============================================================================
// SETUP
// =============================================================================

export function setup() {
  console.log(`\n🏫 AIVO Pilot District Load Test`);
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Tenant:   ${TENANT_ID}`);
  console.log(`   Scenario: ${selectedScenario}\n`);

  // Authenticate as a teacher and parent to get tokens
  const teacherToken = loginUser('pilot-teacher-001@aivo.test', 'PilotTest2025!');
  const parentToken = loginUser('pilot-parent-001@aivo.test', 'PilotTest2025!');
  const adminToken = loginUser('admin@anoka-hennepin.k12.mn.us', 'PilotTest2025!');

  return {
    teacherToken,
    parentToken,
    adminToken,
    startTime: Date.now(),
  };
}

function loginUser(email, password) {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email,
      password,
      tenantId: TENANT_ID,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'auth_login' },
    }
  );

  if (res.status === 200) {
    return res.json('accessToken') || res.json('token');
  }

  console.warn(`Setup login failed for ${email}: ${res.status}`);
  return 'setup-token-placeholder';
}

function authHeaders(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Tenant-ID': TENANT_ID,
    },
  };
}

// =============================================================================
// TEACHER WORKFLOW — Simulates a teacher's typical session
// =============================================================================

export function teacherWorkflow(data) {
  const params = authHeaders(data.teacherToken);
  const teacherIdx = (__VU % TEACHER_COUNT) + 1;
  const paddedIdx = String(teacherIdx).padStart(3, '0');

  // 1. Login
  group('Teacher Login', () => {
    const start = Date.now();
    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({
        email: `pilot-teacher-${paddedIdx}@aivo.test`,
        password: 'PilotTest2025!',
        tenantId: TENANT_ID,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    authLoginLatency.add(Date.now() - start);
    apiCalls.add(1);
    const ok = check(res, { 'teacher login ok': (r) => r.status === 200 });
    errorRate.add(!ok);
    if (!ok) failedLogins.add(1);
  });

  sleep(randomItem([1, 2, 3])); // Reading dashboard

  // 2. Dashboard
  group('Teacher Dashboard', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/dashboard/teacher`, params);
    const dur = Date.now() - start;

    dashboardLatency.add(dur);
    apiCalls.add(1);
    if (dur > 500) slowResponses.add(1);
    const ok = check(res, {
      'dashboard loaded': (r) => r.status === 200,
      'dashboard < 2s': (r) => r.timings.duration < 2000,
    });
    errorRate.add(!ok);
  });

  sleep(randomItem([2, 3, 5]));

  // 3. View caseload (IEP list)
  group('Teacher Caseload', () => {
    const start = Date.now();
    const res = http.get(
      `${BASE_URL}/api/ieps?caseManager=teacher-${paddedIdx}&status=ACTIVE&page=1&limit=20`,
      params
    );
    iepListLatency.add(Date.now() - start);
    apiCalls.add(1);
    const ok = check(res, {
      'caseload loaded': (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  sleep(randomItem([1, 2]));

  // 4. View a specific student's IEP
  group('View Student IEP', () => {
    const studentIdx = String(Math.floor(Math.random() * STUDENT_COUNT) + 1).padStart(4, '0');
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/ieps/student/${studentIdx}`, params);
    iepDetailLatency.add(Date.now() - start);
    apiCalls.add(1);
    const ok = check(res, {
      'IEP detail loaded': (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  sleep(randomItem([3, 5, 8]));

  // 5. Record student progress
  group('Record Progress', () => {
    const start = Date.now();
    const res = http.post(
      `${BASE_URL}/api/progress`,
      JSON.stringify({
        studentId: `pilot-student-${String(Math.floor(Math.random() * STUDENT_COUNT) + 1).padStart(4, '0')}`,
        goalId: `goal-${Math.floor(Math.random() * 1000) + 1}`,
        score: Math.floor(Math.random() * 100),
        notes: `Progress note from load test - ${randomString(20)}`,
        date: new Date().toISOString().split('T')[0],
      }),
      params
    );

    progressWriteLatency.add(Date.now() - start);
    apiCalls.add(1);
    const ok = check(res, {
      'progress recorded': (r) => r.status === 200 || r.status === 201,
    });
    errorRate.add(!ok);
  });

  sleep(randomItem([2, 4]));

  // 6. View student profile
  group('Student Profile', () => {
    const studentIdx = String(Math.floor(Math.random() * STUDENT_COUNT) + 1).padStart(4, '0');
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/students/${studentIdx}/profile`, params);
    studentProfileLatency.add(Date.now() - start);
    apiCalls.add(1);
    const ok = check(res, {
      'student profile ok': (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  sleep(randomItem([5, 10, 15])); // Teacher works on something else
}

// =============================================================================
// PARENT WORKFLOW — Simulates a parent checking their child's progress
// =============================================================================

export function parentWorkflow(data) {
  const params = authHeaders(data.parentToken);
  const parentIdx = (__VU % PARENT_COUNT) + 1;
  const paddedIdx = String(parentIdx).padStart(4, '0');

  // 1. Login
  group('Parent Login', () => {
    const start = Date.now();
    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({
        email: `pilot-parent-${paddedIdx}@aivo.test`,
        password: 'PilotTest2025!',
        tenantId: TENANT_ID,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    authLoginLatency.add(Date.now() - start);
    apiCalls.add(1);
    const ok = check(res, { 'parent login ok': (r) => r.status === 200 });
    errorRate.add(!ok);
  });

  sleep(randomItem([1, 2]));

  // 2. Parent Dashboard
  group('Parent Dashboard', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/dashboard/parent`, params);
    dashboardLatency.add(Date.now() - start);
    apiCalls.add(1);
    const ok = check(res, {
      'parent dashboard ok': (r) => r.status === 200,
      'parent dashboard < 2s': (r) => r.timings.duration < 2000,
    });
    errorRate.add(!ok);
  });

  sleep(randomItem([2, 3, 5]));

  // 3. Check child's IEP
  group('Parent View IEP', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/parent/children/ieps`, params);
    iepDetailLatency.add(Date.now() - start);
    apiCalls.add(1);
    const ok = check(res, {
      'parent IEP view ok': (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  sleep(randomItem([3, 5]));

  // 4. Check notifications
  group('Parent Notifications', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/notifications?unread=true`, params);
    notificationLatency.add(Date.now() - start);
    apiCalls.add(1);
    const ok = check(res, {
      'notifications ok': (r) => r.status === 200,
      'notifications fast': (r) => r.timings.duration < 200,
    });
    errorRate.add(!ok);
  });

  sleep(randomItem([2, 5]));

  // 5. View child's progress
  group('Parent Progress View', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/parent/children/progress`, params);
    analyticsQueryLatency.add(Date.now() - start);
    apiCalls.add(1);
    const ok = check(res, {
      'progress view ok': (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  sleep(randomItem([5, 10, 20])); // Parent session is usually short
}

// =============================================================================
// MORNING RUSH — All teachers log in simultaneously
// =============================================================================

export function teacherLoginBurst(data) {
  const teacherIdx = Math.floor(Math.random() * TEACHER_COUNT) + 1;
  const paddedIdx = String(teacherIdx).padStart(3, '0');

  const start = Date.now();
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: `pilot-teacher-${paddedIdx}@aivo.test`,
      password: 'PilotTest2025!',
      tenantId: TENANT_ID,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  authLoginLatency.add(Date.now() - start);
  apiCalls.add(1);

  const ok = check(res, {
    'burst login ok': (r) => r.status === 200,
    'burst login < 1s': (r) => r.timings.duration < 1000,
  });
  errorRate.add(!ok);
  if (!ok) failedLogins.add(1);

  // After login, immediately load dashboard
  if (res.status === 200) {
    const token = res.json('accessToken') || res.json('token');
    const dashRes = http.get(`${BASE_URL}/api/dashboard/teacher`, authHeaders(token));
    dashboardLatency.add(Date.now() - start);
    apiCalls.add(1);
    check(dashRes, { 'post-login dashboard': (r) => r.status === 200 });
  }
}

// =============================================================================
// IEP REVIEW DAY — Heavy IEP reading + compliance checks
// =============================================================================

export function iepReviewWorkflow(data) {
  const params = authHeaders(data.teacherToken);

  // 1. Load IEP list with filters
  group('IEP Review - List', () => {
    const start = Date.now();
    const res = http.get(
      `${BASE_URL}/api/ieps?status=ACTIVE&reviewDue=true&page=1&limit=50`,
      params
    );
    iepListLatency.add(Date.now() - start);
    apiCalls.add(1);
    check(res, { 'IEP review list ok': (r) => r.status === 200 });
  });

  sleep(2);

  // 2. View 5 IEPs in sequence (reading through caseload)
  for (let i = 0; i < 5; i++) {
    group('IEP Review - Detail', () => {
      const studentIdx = String(Math.floor(Math.random() * STUDENT_COUNT) + 1).padStart(4, '0');
      const start = Date.now();
      const res = http.get(`${BASE_URL}/api/ieps/student/${studentIdx}`, params);
      iepDetailLatency.add(Date.now() - start);
      apiCalls.add(1);
      const ok = check(res, {
        'IEP detail ok': (r) => r.status === 200,
        'IEP detail < 500ms': (r) => r.timings.duration < 500,
      });
      errorRate.add(!ok);
    });
    sleep(randomItem([3, 5, 8])); // Reading time
  }

  // 3. Run compliance check
  group('IEP Review - Compliance', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/compliance/check?scope=district`, params);
    complianceReportLatency.add(Date.now() - start);
    apiCalls.add(1);
    const ok = check(res, {
      'compliance check ok': (r) => r.status === 200,
      'compliance < 5s': (r) => r.timings.duration < 5000,
    });
    iepComplianceCheckRate.add(ok);
    errorRate.add(!ok);
  });

  sleep(5);
}

// =============================================================================
// PARENT NOTIFICATION BURST
// =============================================================================

export function parentNotificationCheck(data) {
  const params = authHeaders(data.parentToken);

  // Quick login + notification check
  group('Notification Burst', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/notifications?unread=true&limit=20`, params);
    notificationLatency.add(Date.now() - start);
    apiCalls.add(1);
    const ok = check(res, {
      'notification check ok': (r) => r.status === 200,
      'notification < 200ms': (r) => r.timings.duration < 200,
    });
    errorRate.add(!ok);
  });

  sleep(1);

  // View child dashboard
  group('Quick Dashboard', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/dashboard/parent`, params);
    dashboardLatency.add(Date.now() - start);
    apiCalls.add(1);
    check(res, { 'quick dash ok': (r) => r.status === 200 });
  });

  sleep(randomItem([3, 5, 10]));
}

// =============================================================================
// AI TUTOR SESSION — Simulates student working with AI tutor
// =============================================================================

export function aiTutorSession(data) {
  const params = authHeaders(data.teacherToken); // Teachers testing AI tutor
  const studentIdx = String(Math.floor(Math.random() * STUDENT_COUNT) + 1).padStart(4, '0');

  // Start session
  group('AI Tutor - Start', () => {
    const start = Date.now();
    const res = http.post(
      `${BASE_URL}/api/ai/tutor/session`,
      JSON.stringify({
        studentId: `pilot-student-${studentIdx}`,
        subject: randomItem(['math', 'reading', 'writing', 'science']),
        gradeLevel: randomItem([
          'K',
          '1',
          '2',
          '3',
          '4',
          '5',
          '6',
          '7',
          '8',
          '9',
          '10',
          '11',
          '12',
        ]),
      }),
      params
    );

    aiTutorLatency.add(Date.now() - start);
    apiCalls.add(1);
    check(res, { 'tutor session started': (r) => r.status === 200 || r.status === 201 });
  });

  sleep(2);

  // Simulate 3 conversation turns
  for (let turn = 0; turn < 3; turn++) {
    group('AI Tutor - Chat', () => {
      const start = Date.now();
      const res = http.post(
        `${BASE_URL}/api/ai/tutor/chat`,
        JSON.stringify({
          studentId: `pilot-student-${studentIdx}`,
          message: randomItem([
            'Can you explain this problem?',
            "I don't understand fractions.",
            'What does this word mean?',
            'Can you give me a hint?',
            'Is my answer correct?',
          ]),
        }),
        params
      );

      aiTutorLatency.add(Date.now() - start);
      apiCalls.add(1);
      const ok = check(res, {
        'tutor response ok': (r) => r.status === 200,
        'tutor response < 3s': (r) => r.timings.duration < 3000,
      });
      errorRate.add(!ok);
    });

    sleep(randomItem([5, 10, 15])); // Student thinking time
  }
}

// =============================================================================
// COMPLIANCE REPORT BATCH — Generate reports for all 500 students
// =============================================================================

export function complianceReportGeneration(data) {
  const params = authHeaders(data.adminToken);

  // Each VU generates reports for 10 students per iteration
  const baseIdx = (__VU - 1) * 50 + __ITER * 10;

  for (let i = 0; i < 10; i++) {
    const studentIdx = String(baseIdx + i + 1).padStart(4, '0');

    group('Compliance Report Gen', () => {
      const start = Date.now();
      const res = http.post(
        `${BASE_URL}/api/compliance/report`,
        JSON.stringify({
          studentId: `pilot-student-${studentIdx}`,
          reportType: 'annual_review',
          format: 'pdf',
        }),
        params
      );

      complianceReportLatency.add(Date.now() - start);
      apiCalls.add(1);
      const ok = check(res, {
        'report generated': (r) => r.status === 200 || r.status === 202,
        'report < 5s': (r) => r.timings.duration < 5000,
      });
      errorRate.add(!ok);
    });

    sleep(0.5); // Small pause between reports
  }
}

// =============================================================================
// TEARDOWN AND REPORTING
// =============================================================================

export function teardown(data) {
  const duration = ((Date.now() - data.startTime) / 1000 / 60).toFixed(1);
  console.log(`\n🏁 Pilot load test completed in ${duration} minutes`);
}

export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  return {
    [`tests/performance/results/pilot-${timestamp}.json`]: JSON.stringify(data, null, 2),
    stdout: pilotSummary(data),
  };
}

function pilotSummary(data) {
  const m = data.metrics;
  const lines = [];

  lines.push('');
  lines.push('╔══════════════════════════════════════════════════════════════════╗');
  lines.push('║         AIVO PILOT DISTRICT — PERFORMANCE TEST RESULTS          ║');
  lines.push('╠══════════════════════════════════════════════════════════════════╣');
  lines.push('');

  const fmt = (metric, label, threshold) => {
    const val = metric?.values?.['p(95)'];
    if (val === undefined) return;
    const pass = val < threshold;
    const icon = pass ? '✅' : '❌';
    lines.push(
      `  ${icon} ${label.padEnd(28)} P95: ${val.toFixed(0).padStart(6)}ms  (target: <${threshold}ms)`
    );
  };

  lines.push('  ENDPOINT LATENCY (P95):');
  lines.push('  ─────────────────────────────────────────────────────────────');
  fmt(m.dashboard_latency, 'Dashboard', 2000);
  fmt(m.auth_login_latency, 'Login', 1000);
  fmt(m.iep_list_latency, 'IEP List', 1000);
  fmt(m.iep_detail_latency, 'IEP Detail', 500);
  fmt(m.compliance_report_latency, 'Compliance Report', 5000);
  fmt(m.student_profile_latency, 'Student Profile', 500);
  fmt(m.ai_tutor_latency, 'AI Tutor Response', 3000);
  fmt(m.progress_write_latency, 'Progress Write', 300);
  fmt(m.analytics_query_latency, 'Analytics Query', 2000);
  fmt(m.notification_latency, 'Notifications', 200);

  lines.push('');
  lines.push('  OVERALL:');
  lines.push('  ─────────────────────────────────────────────────────────────');

  const errorVal = m.pilot_error_rate?.values?.rate;
  if (errorVal !== undefined) {
    const errorPct = (errorVal * 100).toFixed(3);
    const pass = errorVal < 0.005;
    lines.push(`  ${pass ? '✅' : '❌'} Error Rate:              ${errorPct}%  (target: <0.5%)`);
  }

  const totalReqs = m.http_reqs?.values?.count;
  if (totalReqs) {
    lines.push(`     Total Requests:          ${totalReqs}`);
    lines.push(`     Requests/sec:            ${m.http_reqs.values.rate?.toFixed(1)}`);
  }

  const slowCount = m.slow_responses_gt_500ms?.values?.count;
  if (slowCount) {
    lines.push(`     Slow Responses (>500ms): ${slowCount}`);
  }

  lines.push('');
  lines.push('╚══════════════════════════════════════════════════════════════════╝');
  lines.push('');

  return lines.join('\n');
}
