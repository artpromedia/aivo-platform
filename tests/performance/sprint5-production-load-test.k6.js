/**
 * Sprint 5: Production Load Testing - 500+ Concurrent Users
 * 
 * Critical Path Testing:
 * - Authentication (login, token refresh, session management)
 * - Content Delivery (lessons, curriculum, progress tracking)
 * - Session Management (active sessions, concurrent logins)
 * - Trust Score Calculation (new production endpoints)
 * - Payment Processing (subscription, billing)
 * 
 * Performance Targets:
 * - P50: <100ms
 * - P95: <200ms
 * - P99: <500ms
 * - Error rate: <0.5%
 * - Sustained load: 500+ VUs for 10+ minutes
 * 
 * Usage:
 *   k6 run tests/performance/sprint5-production-load-test.k6.js
 *   k6 run --out json=results.json tests/performance/sprint5-production-load-test.k6.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend, Gauge } from 'k6/metrics';
import { randomString, randomIntBetween, randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// =============================================================================
// ENVIRONMENT CONFIGURATION
// =============================================================================

const CONFIG = {
  auth: __ENV.AUTH_URL || 'http://localhost:4001',
  learner: __ENV.LEARNER_URL || 'http://localhost:3000',
  parent: __ENV.PARENT_URL || 'http://localhost:3001',
  teacher: __ENV.TEACHER_URL || 'http://localhost:3002',
  content: __ENV.CONTENT_URL || 'http://localhost:3010',
  session: __ENV.SESSION_URL || 'http://localhost:3021',
  profile: __ENV.PROFILE_URL || 'http://localhost:3003',
  subscription: __ENV.SUBSCRIPTION_URL || 'http://localhost:3015',
};

// =============================================================================
// CUSTOM METRICS
// =============================================================================

// Authentication metrics
const authLoginDuration = new Trend('auth_login_duration', true);
const authTokenRefreshDuration = new Trend('auth_token_refresh_duration', true);
const authTrustScoreDuration = new Trend('auth_trust_score_duration', true);
const authLoginErrors = new Rate('auth_login_errors');

// Content delivery metrics
const contentFetchDuration = new Trend('content_fetch_duration', true);
const contentCacheHitRate = new Rate('content_cache_hit_rate');
const contentErrors = new Rate('content_errors');

// Session management metrics
const sessionCreateDuration = new Trend('session_create_duration', true);
const sessionConcurrent = new Gauge('session_concurrent_count');
const sessionErrors = new Rate('session_errors');

// Database metrics (inferred from response times)
const dbQueryTime = new Trend('db_query_time_estimate', true);

// Payment metrics
const paymentProcessDuration = new Trend('payment_process_duration', true);
const paymentErrors = new Rate('payment_errors');

// Trust score metrics (new in Sprint 5)
const trustScoreCalculation = new Trend('trust_score_calculation_duration', true);
const trustScoreServiceCalls = new Counter('trust_score_service_calls');
const trustScoreErrors = new Rate('trust_score_errors');

// Overall metrics
const totalRequests = new Counter('total_requests');
const totalErrors = new Rate('total_errors');

// =============================================================================
// TEST SCENARIOS & LOAD PROFILES
// =============================================================================

export const options = {
  scenarios: {
    // 1. SMOKE TEST - Validate basic functionality (5 VUs)
    smoke_test: {
      executor: 'constant-vus',
      vus: 5,
      duration: '2m',
      startTime: '0s',
      tags: { test_type: 'smoke' },
      gracefulStop: '30s',
    },

    // 2. LOAD TEST - Normal production traffic (100-200 VUs)
    normal_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '3m', target: 100 },  // Ramp up to 100
        { duration: '10m', target: 100 }, // Hold at 100
        { duration: '3m', target: 200 },  // Ramp to 200
        { duration: '10m', target: 200 }, // Hold at 200
        { duration: '2m', target: 0 },    // Ramp down
      ],
      startTime: '2m',
      tags: { test_type: 'load' },
      gracefulStop: '30s',
    },

    // 3. STRESS TEST - High traffic (500+ VUs)
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 300 },  // Ramp to 300
        { duration: '5m', target: 500 },  // Ramp to 500
        { duration: '15m', target: 500 }, // Hold at 500 (critical test)
        { duration: '5m', target: 700 },  // Push to 700
        { duration: '5m', target: 700 },  // Hold at 700
        { duration: '3m', target: 0 },    // Ramp down
      ],
      startTime: '30m',
      tags: { test_type: 'stress' },
      gracefulStop: '30s',
    },

    // 4. SPIKE TEST - Sudden traffic surge (0 → 600 → 0)
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 600 },  // Sudden spike
        { duration: '3m', target: 600 },   // Hold spike
        { duration: '30s', target: 0 },    // Drop
      ],
      startTime: '68m',
      tags: { test_type: 'spike' },
      gracefulStop: '30s',
    },

    // 5. SOAK TEST - Endurance (200 VUs for 30 minutes)
    soak_test: {
      executor: 'constant-vus',
      vus: 200,
      duration: '30m',
      startTime: '73m',
      tags: { test_type: 'soak' },
      gracefulStop: '30s',
    },

    // 6. AUTHENTICATION FOCUSED - High auth load
    auth_focused: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 50,
      maxVUs: 150,
      exec: 'authenticationFlow',
      startTime: '105m',
      tags: { test_type: 'auth_focused' },
    },

    // 7. TRUST SCORE FOCUSED - Test new Sprint 5 feature
    trust_score_focused: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 30,
      maxVUs: 100,
      exec: 'trustScoreFlow',
      startTime: '110m',
      tags: { test_type: 'trust_score' },
    },
  },

  // Performance thresholds (test fails if exceeded)
  thresholds: {
    // Response time targets
    'http_req_duration': [
      'p(50)<100',   // P50 must be under 100ms
      'p(95)<200',   // P95 must be under 200ms
      'p(99)<500',   // P99 must be under 500ms
    ],

    // Error rate targets
    'http_req_failed': ['rate<0.005'], // <0.5% error rate

    // Auth-specific thresholds
    'auth_login_duration': ['p(95)<300'],
    'auth_token_refresh_duration': ['p(95)<100'],
    'auth_trust_score_duration': ['p(95)<900'], // Trust score allows 900ms (5 service calls)
    'auth_login_errors': ['rate<0.01'],

    // Content delivery thresholds
    'content_fetch_duration': ['p(95)<200'],
    'content_errors': ['rate<0.005'],

    // Session management thresholds
    'session_create_duration': ['p(95)<150'],
    'session_errors': ['rate<0.01'],

    // Trust score thresholds (new Sprint 5)
    'trust_score_calculation_duration': ['p(95)<900'],
    'trust_score_errors': ['rate<0.02'],

    // Overall error rate
    'total_errors': ['rate<0.005'],
  },

  // Load test configuration
  noConnectionReuse: false,
  userAgent: 'k6-load-test/sprint5-production',
  insecureSkipTLSVerify: true, // For local testing
  batch: 10, // Parallel requests per VU
  batchPerHost: 5,
};

// =============================================================================
// TEST DATA GENERATORS
// =============================================================================

const testUsers = {
  learners: Array.from({ length: 1000 }, (_, i) => ({
    email: `learner${i}@loadtest.com`,
    password: 'LoadTest123!',
    role: 'learner',
  })),
  parents: Array.from({ length: 500 }, (_, i) => ({
    email: `parent${i}@loadtest.com`,
    password: 'LoadTest123!',
    role: 'parent',
  })),
  teachers: Array.from({ length: 200 }, (_, i) => ({
    email: `teacher${i}@loadtest.com`,
    password: 'LoadTest123!',
    role: 'teacher',
  })),
};

function getRandomUser(role = null) {
  if (!role) {
    role = randomItem(['learner', 'parent', 'teacher']);
  }
  return randomItem(testUsers[role + 's']);
}

const sampleLessonIds = Array.from({ length: 100 }, (_, i) => `lesson-${i + 1}`);
const sampleCourseIds = Array.from({ length: 50 }, (_, i) => `course-${i + 1}`);

// =============================================================================
// AUTHENTICATION FLOWS
// =============================================================================

export function authenticationFlow() {
  const user = getRandomUser();

  group('Auth: Login Flow', () => {
    const loginStart = Date.now();
    const loginRes = http.post(
      `${CONFIG.auth}/api/auth/login`,
      JSON.stringify({
        email: user.email,
        password: user.password,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'auth_login' },
      }
    );

    const loginDuration = Date.now() - loginStart;
    authLoginDuration.add(loginDuration);
    totalRequests.add(1);

    const loginSuccess = check(loginRes, {
      'login status 200': (r) => r.status === 200,
      'login returns token': (r) => r.json('accessToken') !== undefined,
    });

    if (!loginSuccess) {
      authLoginErrors.add(1);
      totalErrors.add(1);
      return;
    }

    const token = loginRes.json('accessToken');
    sleep(1);

    // Token refresh
    const refreshStart = Date.now();
    const refreshRes = http.post(
      `${CONFIG.auth}/api/auth/refresh`,
      null,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        tags: { name: 'auth_token_refresh' },
      }
    );

    authTokenRefreshDuration.add(Date.now() - refreshStart);
    totalRequests.add(1);

    check(refreshRes, {
      'refresh status 200': (r) => r.status === 200,
    });
  });

  sleep(randomIntBetween(1, 3));
}

// =============================================================================
// TRUST SCORE FLOW (NEW IN SPRINT 5)
// =============================================================================

export function trustScoreFlow() {
  const user = getRandomUser();

  group('Trust Score: Calculate', () => {
    // Login first
    const loginRes = http.post(
      `${CONFIG.auth}/api/auth/login`,
      JSON.stringify({ email: user.email, password: user.password }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (loginRes.status !== 200) {
      trustScoreErrors.add(1);
      return;
    }

    const token = loginRes.json('accessToken');
    const userId = loginRes.json('userId');

    // Calculate trust score (calls 5 services internally)
    const trustScoreStart = Date.now();
    const trustScoreRes = http.get(
      `${CONFIG.auth}/api/trust-score/${userId}`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
        tags: { name: 'trust_score_calculate' },
      }
    );

    const trustScoreDuration = Date.now() - trustScoreStart;
    authTrustScoreDuration.add(trustScoreDuration);
    trustScoreCalculation.add(trustScoreDuration);
    trustScoreServiceCalls.add(1);
    totalRequests.add(2); // login + trust score

    const success = check(trustScoreRes, {
      'trust score status 200': (r) => r.status === 200,
      'trust score has value': (r) => r.json('trustScore') !== undefined,
      'trust score duration <900ms': () => trustScoreDuration < 900,
    });

    if (!success) {
      trustScoreErrors.add(1);
      totalErrors.add(1);
    }
  });

  sleep(randomIntBetween(2, 5));
}

// =============================================================================
// MAIN TEST FLOW (DEFAULT)
// =============================================================================

export default function () {
  const user = getRandomUser();
  let token = null;

  // 1. AUTHENTICATION
  group('1. User Login', () => {
    const loginStart = Date.now();
    const loginRes = http.post(
      `${CONFIG.auth}/api/auth/login`,
      JSON.stringify({
        email: user.email,
        password: user.password,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'login' },
      }
    );

    authLoginDuration.add(Date.now() - loginStart);
    totalRequests.add(1);

    const success = check(loginRes, {
      'login status 200': (r) => r.status === 200,
      'has access token': (r) => r.json('accessToken') !== undefined,
    });

    if (!success) {
      authLoginErrors.add(1);
      totalErrors.add(1);
      return; // Skip rest if login fails
    }

    token = loginRes.json('accessToken');
  });

  sleep(1);

  // 2. SESSION CREATION
  group('2. Session Management', () => {
    const sessionStart = Date.now();
    const sessionRes = http.post(
      `${CONFIG.session}/api/sessions`,
      JSON.stringify({ userAgent: 'k6-load-test' }),
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        tags: { name: 'session_create' },
      }
    );

    sessionCreateDuration.add(Date.now() - sessionStart);
    totalRequests.add(1);

    const success = check(sessionRes, {
      'session created': (r) => r.status === 201 || r.status === 200,
    });

    if (!success) {
      sessionErrors.add(1);
      totalErrors.add(1);
    }
  });

  sleep(0.5);

  // 3. CONTENT DELIVERY
  group('3. Content Fetching', () => {
    // Fetch lesson
    const lessonId = randomItem(sampleLessonIds);
    const contentStart = Date.now();
    const lessonRes = http.get(
      `${CONFIG.content}/api/lessons/${lessonId}`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
        tags: { name: 'content_lesson' },
      }
    );

    contentFetchDuration.add(Date.now() - contentStart);
    totalRequests.add(1);

    const success = check(lessonRes, {
      'lesson fetched': (r) => r.status === 200,
      'lesson has content': (r) => r.json('content') !== undefined,
    });

    // Check if cached (from headers)
    const isCached = lessonRes.headers['X-Cache-Hit'] === 'true';
    contentCacheHitRate.add(isCached ? 1 : 0);

    if (!success) {
      contentErrors.add(1);
      totalErrors.add(1);
    }
  });

  sleep(randomIntBetween(2, 5));

  // 4. PROGRESS TRACKING
  group('4. Progress Update', () => {
    const progressRes = http.post(
      `${CONFIG.learner}/api/progress`,
      JSON.stringify({
        lessonId: randomItem(sampleLessonIds),
        completed: true,
        score: randomIntBetween(70, 100),
      }),
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        tags: { name: 'progress_update' },
      }
    );

    totalRequests.add(1);

    check(progressRes, {
      'progress updated': (r) => r.status === 200 || r.status === 201,
    });
  });

  sleep(randomIntBetween(1, 3));

  // 5. TRUST SCORE CHECK (Sprint 5 feature)
  if (Math.random() < 0.3) { // 30% of users check trust score
    group('5. Trust Score Check', () => {
      const trustScoreStart = Date.now();
      const trustScoreRes = http.get(
        `${CONFIG.auth}/api/trust-score/me`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          tags: { name: 'trust_score' },
        }
      );

      const duration = Date.now() - trustScoreStart;
      authTrustScoreDuration.add(duration);
      trustScoreCalculation.add(duration);
      trustScoreServiceCalls.add(1);
      totalRequests.add(1);

      const success = check(trustScoreRes, {
        'trust score retrieved': (r) => r.status === 200,
      });

      if (!success) {
        trustScoreErrors.add(1);
        totalErrors.add(1);
      }
    });

    sleep(1);
  }

  // 6. SUBSCRIPTION CHECK (for parents)
  if (user.role === 'parent' && Math.random() < 0.2) {
    group('6. Subscription Check', () => {
      const subRes = http.get(
        `${CONFIG.subscription}/api/subscriptions/me`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          tags: { name: 'subscription_check' },
        }
      );

      totalRequests.add(1);

      check(subRes, {
        'subscription retrieved': (r) => r.status === 200,
      });
    });

    sleep(1);
  }

  // Think time between iterations
  sleep(randomIntBetween(3, 8));
}

// =============================================================================
// TEARDOWN
// =============================================================================

export function teardown(data) {
  console.log('='.repeat(80));
  console.log('SPRINT 5 LOAD TEST COMPLETE');
  console.log('='.repeat(80));
  console.log('📊 Check results above for performance metrics');
  console.log('📈 Key Metrics:');
  console.log('   - P95 Response Time: Should be <200ms');
  console.log('   - Error Rate: Should be <0.5%');
  console.log('   - Trust Score Calc: Should be <900ms');
  console.log('   - Concurrent Users: Target 500+ sustained');
  console.log('='.repeat(80));
}
