/**
 * k6 Load Testing Script
 *
 * Performance targets:
 * - API: P50 <100ms, P95 <200ms, P99 <500ms
 * - Error rate: <1%
 * - Throughput: 1000 RPS
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend, Gauge } from 'k6/metrics';
import { randomString, randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';

// Custom metrics
const errorRate = new Rate('error_rate');
const p50Latency = new Trend('p50_latency', true);
const p95Latency = new Trend('p95_latency', true);
const p99Latency = new Trend('p99_latency', true);
const cacheHitRate = new Rate('cache_hit_rate');
const apiCalls = new Counter('api_calls');
const dbQueryTime = new Trend('db_query_time', true);

// Test options
export const options = {
  // Load profile scenarios
  scenarios: {
    // Smoke test - baseline
    smoke: {
      executor: 'constant-vus',
      vus: 5,
      duration: '1m',
      startTime: '0s',
      tags: { scenario: 'smoke' },
    },

    // Load test - normal traffic
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },  // Ramp up
        { duration: '5m', target: 50 },  // Steady state
        { duration: '2m', target: 100 }, // Peak load
        { duration: '5m', target: 100 }, // Steady at peak
        { duration: '2m', target: 0 },   // Ramp down
      ],
      startTime: '1m',
      tags: { scenario: 'load' },
    },

    // Stress test - breaking point
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 200 },
        { duration: '5m', target: 300 },
        { duration: '5m', target: 400 },
        { duration: '2m', target: 0 },
      ],
      startTime: '17m',
      tags: { scenario: 'stress' },
    },

    // Spike test - sudden traffic
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 500 }, // Sudden spike
        { duration: '1m', target: 500 },  // Hold
        { duration: '10s', target: 0 },   // Drop
      ],
      startTime: '36m',
      tags: { scenario: 'spike' },
    },

    // Soak test - endurance
    soak: {
      executor: 'constant-vus',
      vus: 50,
      duration: '30m',
      startTime: '38m',
      tags: { scenario: 'soak' },
    },
  },

  // Thresholds for pass/fail
  thresholds: {
    // Response time thresholds
    http_req_duration: [
      'p(50)<100',  // P50 < 100ms
      'p(95)<200',  // P95 < 200ms
      'p(99)<500',  // P99 < 500ms
    ],

    // Error rate thresholds
    http_req_failed: ['rate<0.01'], // <1% error rate
    error_rate: ['rate<0.01'],

    // Custom thresholds
    p50_latency: ['p(50)<100'],
    p95_latency: ['p(95)<200'],
    p99_latency: ['p(99)<500'],

    // Cache performance
    cache_hit_rate: ['rate>0.8'], // >80% cache hit rate

    // Database query time
    db_query_time: ['p(95)<50'], // P95 < 50ms
  },
};

// =============================================================================
// SETUP AND TEARDOWN
// =============================================================================

export function setup() {
  // Login to get auth token
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: 'loadtest@example.com',
    password: 'loadtest123',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(loginRes, {
    'login successful': (r) => r.status === 200,
  });

  const authToken = loginRes.json('accessToken');

  // Get test data
  const coursesRes = http.get(`${BASE_URL}/api/courses`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  const courses = coursesRes.json('data') || [];

  return {
    authToken,
    courses: courses.slice(0, 10), // Use first 10 courses for testing
  };
}

export function teardown(data) {
  // Cleanup if needed
  console.log('Load test completed');
}

// =============================================================================
// DEFAULT SCENARIO
// =============================================================================

export default function(data) {
  const params = {
    headers: {
      'Authorization': `Bearer ${data.authToken}`,
      'Content-Type': 'application/json',
    },
  };

  // Simulate realistic user behavior
  group('Homepage', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/dashboard`, params);
    const duration = Date.now() - start;

    apiCalls.add(1);
    p50Latency.add(duration);
    p95Latency.add(duration);
    p99Latency.add(duration);

    const success = check(res, {
      'dashboard status 200': (r) => r.status === 200,
      'dashboard response time': (r) => r.timings.duration < 200,
    });

    errorRate.add(!success);
    cacheHitRate.add(res.headers['X-Cache'] === 'HIT');
  });

  sleep(1);

  group('Browse Courses', () => {
    // List courses
    const listStart = Date.now();
    const listRes = http.get(`${BASE_URL}/api/courses?page=1&limit=20`, params);
    const listDuration = Date.now() - listStart;

    apiCalls.add(1);
    p50Latency.add(listDuration);

    check(listRes, {
      'courses list status 200': (r) => r.status === 200,
      'courses list response time': (r) => r.timings.duration < 200,
    });

    cacheHitRate.add(listRes.headers['X-Cache'] === 'HIT');

    // View a random course
    if (data.courses && data.courses.length > 0) {
      const course = randomItem(data.courses);
      const detailRes = http.get(`${BASE_URL}/api/courses/${course.id}`, params);

      apiCalls.add(1);

      check(detailRes, {
        'course detail status 200': (r) => r.status === 200,
        'course detail response time': (r) => r.timings.duration < 150,
      });

      cacheHitRate.add(detailRes.headers['X-Cache'] === 'HIT');
    }
  });

  sleep(2);

  group('Learning Activity', () => {
    // Get lesson content
    const lessonRes = http.get(`${BASE_URL}/api/lessons/current`, params);

    apiCalls.add(1);

    check(lessonRes, {
      'lesson status 200': (r) => r.status === 200,
    });

    // Submit progress
    const progressRes = http.post(`${BASE_URL}/api/progress`, JSON.stringify({
      lessonId: 'test-lesson',
      progress: Math.floor(Math.random() * 100),
      timeSpent: Math.floor(Math.random() * 300),
    }), params);

    apiCalls.add(1);

    check(progressRes, {
      'progress submit status 200/201': (r) => r.status === 200 || r.status === 201,
    });
  });

  sleep(3);

  group('Search', () => {
    const query = randomItem(['math', 'science', 'history', 'english', 'programming']);
    const searchRes = http.get(`${BASE_URL}/api/search?q=${query}`, params);

    apiCalls.add(1);

    check(searchRes, {
      'search status 200': (r) => r.status === 200,
      'search response time': (r) => r.timings.duration < 300,
    });
  });

  sleep(1);
}

// =============================================================================
// SPECIALIZED SCENARIOS
// =============================================================================

// High-frequency polling (notifications, updates)
export function pollingScenario(data) {
  const params = {
    headers: {
      'Authorization': `Bearer ${data.authToken}`,
    },
  };

  // Poll for notifications
  const res = http.get(`${BASE_URL}/api/notifications?unread=true`, params);

  check(res, {
    'polling status 200': (r) => r.status === 200,
    'polling response time': (r) => r.timings.duration < 50,
  });

  sleep(5); // Poll every 5 seconds
}

// Database-heavy operations
export function databaseScenario(data) {
  const params = {
    headers: {
      'Authorization': `Bearer ${data.authToken}`,
      'Content-Type': 'application/json',
    },
  };

  group('Database Heavy', () => {
    // Complex aggregation query
    const start = Date.now();
    const statsRes = http.get(`${BASE_URL}/api/analytics/learning-stats`, params);
    const duration = Date.now() - start;

    dbQueryTime.add(duration);

    check(statsRes, {
      'analytics status 200': (r) => r.status === 200,
      'analytics query time': (r) => r.timings.duration < 500,
    });

    // Leaderboard query
    const leaderboardRes = http.get(`${BASE_URL}/api/leaderboard?period=week`, params);

    check(leaderboardRes, {
      'leaderboard status 200': (r) => r.status === 200,
    });
  });

  sleep(10);
}

// Real-time features (WebSocket simulation via HTTP)
export function realtimeScenario(data) {
  const params = {
    headers: {
      'Authorization': `Bearer ${data.authToken}`,
      'Content-Type': 'application/json',
    },
  };

  // Simulate real-time collaboration
  const collabRes = http.post(`${BASE_URL}/api/collaboration/presence`, JSON.stringify({
    userId: 'test-user',
    documentId: 'test-doc',
    cursor: { line: Math.floor(Math.random() * 100), column: 0 },
  }), params);

  check(collabRes, {
    'presence update status': (r) => r.status === 200 || r.status === 204,
    'presence latency': (r) => r.timings.duration < 100,
  });

  sleep(0.5); // High frequency updates
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function handleSummary(data) {
  return {
    'tests/performance/results/k6-summary.json': JSON.stringify(data, null, 2),
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const { metrics, root_group } = data;
  const lines = [];

  lines.push('\n╔══════════════════════════════════════════════════════════════╗');
  lines.push('║                    K6 PERFORMANCE SUMMARY                     ║');
  lines.push('╠══════════════════════════════════════════════════════════════╣');

  // HTTP metrics
  const httpDuration = metrics.http_req_duration;
  if (httpDuration) {
    lines.push(`║ HTTP Request Duration:                                        ║`);
    lines.push(`║   P50: ${httpDuration.values['p(50)'].toFixed(2).padStart(8)}ms                                       ║`);
    lines.push(`║   P95: ${httpDuration.values['p(95)'].toFixed(2).padStart(8)}ms                                       ║`);
    lines.push(`║   P99: ${httpDuration.values['p(99)'].toFixed(2).padStart(8)}ms                                       ║`);
  }

  // Error rate
  const httpFailed = metrics.http_req_failed;
  if (httpFailed) {
    const rate = (httpFailed.values.rate * 100).toFixed(2);
    lines.push(`║ Error Rate: ${rate.padStart(6)}%                                         ║`);
  }

  // Requests
  const httpReqs = metrics.http_reqs;
  if (httpReqs) {
    lines.push(`║ Total Requests: ${httpReqs.values.count.toString().padStart(8)}                                ║`);
    lines.push(`║ Requests/sec: ${httpReqs.values.rate.toFixed(2).padStart(10)}                              ║`);
  }

  lines.push('╚══════════════════════════════════════════════════════════════╝\n');

  return lines.join('\n');
}
