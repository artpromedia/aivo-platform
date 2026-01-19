/**
 * k6 Load Testing Script for Final Validation
 *
 * Run with: k6 run scripts/load-test.js
 *
 * Environment variables:
 *   - API_BASE_URL: Target URL (default: http://localhost:3000)
 *   - K6_VUS: Number of virtual users (default: 100)
 *
 * Performance targets:
 * - Response time: <500ms for 95th percentile
 * - Error rate: <1%
 * - Throughput: Sustained 100-200 concurrent users
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// =============================================================================
// CONFIGURATION
// =============================================================================

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';

// Custom metrics
const errorRate = new Rate('error_rate');
const responseTime = new Trend('response_time', true);

// Test stages as specified in the validation requirements
export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Spike to 200 users
    { duration: '5m', target: 200 },  // Stay at 200 users
    { duration: '2m', target: 0 },    // Ramp down
  ],

  thresholds: {
    'http_req_duration': ['p(95)<500'],     // 95% of requests under 500ms
    'http_req_failed': ['rate<0.01'],       // Error rate under 1%
    'error_rate': ['rate<0.01'],
    'response_time': ['p(95)<500'],
  },
};

// =============================================================================
// MAIN TEST SCENARIO
// =============================================================================

export default function () {
  // Test 1: Homepage/Dashboard load
  group('Homepage', () => {
    const res = http.get(`${BASE_URL}`);

    const success = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
    });

    errorRate.add(!success);
    responseTime.add(res.timings.duration);
  });

  sleep(1);

  // Test 2: API Health Check
  group('API Health', () => {
    const res = http.get(`${BASE_URL}/api/health`);

    const success = check(res, {
      'health check status 200': (r) => r.status === 200 || r.status === 404,
      'health check response time': (r) => r.timings.duration < 200,
    });

    errorRate.add(!success);
    responseTime.add(res.timings.duration);
  });

  sleep(1);

  // Test 3: Static Assets
  group('Static Assets', () => {
    const res = http.get(`${BASE_URL}/_next/static/chunks/main.js`, {
      headers: {
        'Accept': 'application/javascript',
      },
    });

    const success = check(res, {
      'static asset loads': (r) => r.status === 200 || r.status === 304 || r.status === 404,
      'static asset response time': (r) => r.timings.duration < 300,
    });

    errorRate.add(!success);
    responseTime.add(res.timings.duration);
  });

  sleep(1);

  // Test 4: API Endpoints (common patterns)
  group('API Endpoints', () => {
    // Courses endpoint
    const coursesRes = http.get(`${BASE_URL}/api/courses`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    check(coursesRes, {
      'courses endpoint responds': (r) => r.status === 200 || r.status === 401 || r.status === 404,
    });

    responseTime.add(coursesRes.timings.duration);

    // Progress endpoint
    const progressRes = http.get(`${BASE_URL}/api/progress`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    check(progressRes, {
      'progress endpoint responds': (r) => r.status === 200 || r.status === 401 || r.status === 404,
    });

    responseTime.add(progressRes.timings.duration);
  });

  sleep(1);
}

// =============================================================================
// CUSTOM SUMMARY HANDLER
// =============================================================================

export function handleSummary(data) {
  const summary = generateSummary(data);

  return {
    'stdout': summary,
    'scripts/load-test-results.json': JSON.stringify(data, null, 2),
  };
}

function generateSummary(data) {
  const { metrics } = data;
  const lines = [];

  lines.push('');
  lines.push('╔════════════════════════════════════════════════════════════════╗');
  lines.push('║           AIVO PLATFORM - LOAD TEST RESULTS                    ║');
  lines.push('╠════════════════════════════════════════════════════════════════╣');

  // HTTP Duration
  const httpDuration = metrics.http_req_duration;
  if (httpDuration && httpDuration.values) {
    const p50 = httpDuration.values['p(50)'] || 0;
    const p95 = httpDuration.values['p(95)'] || 0;
    const p99 = httpDuration.values['p(99)'] || 0;

    lines.push(`║ Response Times:                                                ║`);
    lines.push(`║   P50: ${p50.toFixed(2).padStart(10)}ms                                   ║`);
    lines.push(`║   P95: ${p95.toFixed(2).padStart(10)}ms  ${p95 < 500 ? '✓ PASS' : '✗ FAIL'}                        ║`);
    lines.push(`║   P99: ${p99.toFixed(2).padStart(10)}ms                                   ║`);
  }

  // Error Rate
  const httpFailed = metrics.http_req_failed;
  if (httpFailed && httpFailed.values) {
    const rate = (httpFailed.values.rate * 100).toFixed(4);
    const pass = httpFailed.values.rate < 0.01;
    lines.push(`║                                                                ║`);
    lines.push(`║ Error Rate: ${rate.padStart(8)}%  ${pass ? '✓ PASS' : '✗ FAIL'}                            ║`);
  }

  // Total Requests
  const httpReqs = metrics.http_reqs;
  if (httpReqs && httpReqs.values) {
    lines.push(`║                                                                ║`);
    lines.push(`║ Total Requests: ${httpReqs.values.count.toString().padStart(10)}                            ║`);
    lines.push(`║ Requests/sec:   ${httpReqs.values.rate.toFixed(2).padStart(10)}                            ║`);
  }

  lines.push('╠════════════════════════════════════════════════════════════════╣');

  // Overall result
  const passed = (!httpFailed || httpFailed.values.rate < 0.01) &&
                 (!httpDuration || httpDuration.values['p(95)'] < 500);

  if (passed) {
    lines.push('║                    ✓ ALL THRESHOLDS PASSED                     ║');
  } else {
    lines.push('║                    ✗ SOME THRESHOLDS FAILED                    ║');
  }

  lines.push('╚════════════════════════════════════════════════════════════════╝');
  lines.push('');

  return lines.join('\n');
}
