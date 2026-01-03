import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import { randomItem, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

/**
 * k6 Load Testing Suite for AIVO Learner App
 *
 * Performance testing scenarios:
 * - Smoke test: Verify system works under minimal load
 * - Load test: Normal expected load (100-200 concurrent users)
 * - Stress test: Beyond normal capacity (1000+ users)
 * - Spike test: Sudden traffic spikes
 * - Soak test: Extended duration testing
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const BASE_URL = __ENV.BASE_URL || 'https://staging-api.aivo.edu';
const WEB_URL = __ENV.WEB_URL || 'https://staging.aivo.edu';

// Test users from file
const TEST_USERS = new SharedArray('users', function () {
  try {
    return JSON.parse(open('./test-users.json'));
  } catch (e) {
    // Default test users if file not found
    return [
      { email: 'loadtest1@test.aivo.edu', password: 'TestPassword123!' },
      { email: 'loadtest2@test.aivo.edu', password: 'TestPassword123!' },
      { email: 'loadtest3@test.aivo.edu', password: 'TestPassword123!' },
      { email: 'loadtest4@test.aivo.edu', password: 'TestPassword123!' },
      { email: 'loadtest5@test.aivo.edu', password: 'TestPassword123!' },
    ];
  }
});

// Custom metrics
const loginDuration = new Trend('login_duration', true);
const dashboardDuration = new Trend('dashboard_load_duration', true);
const lessonLoadDuration = new Trend('lesson_load_duration', true);
const questionSubmitDuration = new Trend('question_submit_duration', true);
const apiErrorRate = new Rate('api_errors');
const requestCount = new Counter('total_requests');
const activeUsers = new Gauge('active_users');

// ============================================================================
// TEST OPTIONS
// ============================================================================

export const options = {
  scenarios: {
    // Smoke test - basic functionality verification
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      tags: { test_type: 'smoke' },
      exec: 'smokeTest',
    },

    // Load test - normal expected load
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 }, // Ramp up to 50 users
        { duration: '5m', target: 100 }, // Stay at 100 users
        { duration: '3m', target: 200 }, // Ramp to 200 users
        { duration: '5m', target: 200 }, // Stay at 200 users
        { duration: '3m', target: 0 }, // Ramp down
      ],
      tags: { test_type: 'load' },
      exec: 'loadTest',
    },

    // Stress test - beyond normal capacity
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 200 },
        { duration: '5m', target: 500 },
        { duration: '5m', target: 1000 },
        { duration: '5m', target: 2000 },
        { duration: '5m', target: 0 },
      ],
      tags: { test_type: 'stress' },
      exec: 'stressTest',
    },

    // Spike test - sudden traffic increase
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '10s', target: 1000 }, // Spike!
        { duration: '3m', target: 1000 },
        { duration: '10s', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '30s', target: 0 },
      ],
      tags: { test_type: 'spike' },
      exec: 'spikeTest',
    },

    // Soak test - extended duration
    soak: {
      executor: 'constant-vus',
      vus: 100,
      duration: '2h',
      tags: { test_type: 'soak' },
      exec: 'soakTest',
    },

    // API endpoint specific tests
    apiEndpoints: {
      executor: 'constant-arrival-rate',
      rate: 100, // 100 requests per second
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 50,
      maxVUs: 200,
      tags: { test_type: 'api' },
      exec: 'apiEndpointTest',
    },
  },

  // Performance thresholds
  thresholds: {
    // HTTP request duration
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    'http_req_duration{name:login}': ['p(95)<1000'],
    'http_req_duration{name:dashboard}': ['p(95)<2000'],
    'http_req_duration{name:lesson}': ['p(95)<1500'],

    // Custom metrics thresholds
    login_duration: ['p(95)<1000', 'avg<500'],
    dashboard_load_duration: ['p(95)<2000', 'avg<1000'],
    lesson_load_duration: ['p(95)<1500', 'avg<800'],
    question_submit_duration: ['p(95)<500', 'avg<200'],

    // Error rates
    api_errors: ['rate<0.01'], // Less than 1% errors
    http_req_failed: ['rate<0.01'],

    // Throughput
    http_reqs: ['rate>50'], // At least 50 req/s
  },

  // Tags for all requests
  tags: {
    project: 'aivo-learner',
    environment: __ENV.ENVIRONMENT || 'staging',
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getAuthHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

function login(user) {
  const startTime = Date.now();

  const response = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      email: user.email,
      password: user.password,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'login' },
    }
  );

  loginDuration.add(Date.now() - startTime);
  requestCount.add(1);

  const success = check(response, {
    'login status is 200': (r) => r.status === 200,
    'login has access token': (r) => r.json('accessToken') !== undefined,
  });

  if (!success) {
    apiErrorRate.add(1);
    console.error(`Login failed for ${user.email}: ${response.status} ${response.body}`);
    return null;
  }

  apiErrorRate.add(0);
  return response.json('accessToken');
}

function getDashboard(token) {
  const startTime = Date.now();

  const responses = http.batch([
    [
      'GET',
      `${BASE_URL}/users/me`,
      null,
      { headers: getAuthHeaders(token), tags: { name: 'user_profile' } },
    ],
    [
      'GET',
      `${BASE_URL}/users/me/progress`,
      null,
      { headers: getAuthHeaders(token), tags: { name: 'user_progress' } },
    ],
    [
      'GET',
      `${BASE_URL}/lessons/recommended`,
      null,
      { headers: getAuthHeaders(token), tags: { name: 'recommended_lessons' } },
    ],
    [
      'GET',
      `${BASE_URL}/lessons/today`,
      null,
      { headers: getAuthHeaders(token), tags: { name: 'todays_lessons' } },
    ],
  ]);

  dashboardDuration.add(Date.now() - startTime);
  requestCount.add(4);

  let success = true;
  for (const response of responses) {
    if (!check(response, { 'dashboard request succeeded': (r) => r.status === 200 })) {
      success = false;
      apiErrorRate.add(1);
    } else {
      apiErrorRate.add(0);
    }
  }

  return success ? responses : null;
}

function getLessons(token) {
  const response = http.get(`${BASE_URL}/lessons`, {
    headers: getAuthHeaders(token),
    tags: { name: 'lessons_list' },
  });

  requestCount.add(1);

  const success = check(response, {
    'get lessons status is 200': (r) => r.status === 200,
    'lessons array exists': (r) => Array.isArray(r.json('data')),
  });

  if (!success) {
    apiErrorRate.add(1);
    return [];
  }

  apiErrorRate.add(0);
  return response.json('data') || [];
}

function getLesson(token, lessonId) {
  const startTime = Date.now();

  const response = http.get(`${BASE_URL}/lessons/${lessonId}`, {
    headers: getAuthHeaders(token),
    tags: { name: 'lesson' },
  });

  lessonLoadDuration.add(Date.now() - startTime);
  requestCount.add(1);

  const success = check(response, {
    'get lesson status is 200': (r) => r.status === 200,
    'lesson has blocks': (r) => Array.isArray(r.json('blocks')),
  });

  if (!success) {
    apiErrorRate.add(1);
    return null;
  }

  apiErrorRate.add(0);
  return response.json();
}

function submitAnswer(token, lessonId, blockId, answer) {
  const startTime = Date.now();

  const response = http.post(
    `${BASE_URL}/lessons/${lessonId}/blocks/${blockId}/answer`,
    JSON.stringify({ answer }),
    {
      headers: getAuthHeaders(token),
      tags: { name: 'submit_answer' },
    }
  );

  questionSubmitDuration.add(Date.now() - startTime);
  requestCount.add(1);

  const success = check(response, {
    'submit answer status is 200': (r) => r.status === 200,
    'answer has result': (r) => r.json('correct') !== undefined,
  });

  if (!success) {
    apiErrorRate.add(1);
  } else {
    apiErrorRate.add(0);
  }

  return response;
}

function completeLesson(token, lessonId) {
  const response = http.post(`${BASE_URL}/lessons/${lessonId}/complete`, JSON.stringify({}), {
    headers: getAuthHeaders(token),
    tags: { name: 'complete_lesson' },
  });

  requestCount.add(1);

  check(response, {
    'complete lesson status is 200': (r) => r.status === 200,
  });

  return response;
}

function getProgress(token) {
  const response = http.get(`${BASE_URL}/users/me/progress`, {
    headers: getAuthHeaders(token),
    tags: { name: 'progress' },
  });

  requestCount.add(1);

  return check(response, {
    'get progress status is 200': (r) => r.status === 200,
  });
}

function getAchievements(token) {
  const response = http.get(`${BASE_URL}/achievements`, {
    headers: getAuthHeaders(token),
    tags: { name: 'achievements' },
  });

  requestCount.add(1);

  return check(response, {
    'get achievements status is 200': (r) => r.status === 200,
  });
}

// ============================================================================
// TEST SCENARIOS
// ============================================================================

/**
 * Smoke Test - Basic functionality verification
 */
export function smokeTest() {
  const user = randomItem(TEST_USERS);
  activeUsers.add(1);

  group('smoke_login', () => {
    const token = login(user);
    if (!token) {
      activeUsers.add(-1);
      return;
    }

    group('smoke_dashboard', () => {
      getDashboard(token);
      sleep(1);
    });

    group('smoke_lessons', () => {
      const lessons = getLessons(token);
      if (lessons.length > 0) {
        getLesson(token, lessons[0].id);
      }
    });
  });

  activeUsers.add(-1);
  sleep(1);
}

/**
 * Load Test - Normal user behavior simulation
 */
export function loadTest() {
  const user = randomItem(TEST_USERS);
  activeUsers.add(1);

  group('user_session', () => {
    // Login
    const token = login(user);
    if (!token) {
      activeUsers.add(-1);
      return;
    }

    sleep(randomIntBetween(1, 3));

    // Load dashboard
    group('dashboard', () => {
      getDashboard(token);
    });

    sleep(randomIntBetween(2, 5));

    // Browse and take a lesson
    group('lesson_session', () => {
      const lessons = getLessons(token);
      if (lessons.length === 0) return;

      const lesson = getLesson(token, randomItem(lessons).id);
      if (!lesson) return;

      // Simulate going through lesson blocks
      const blocksToProcess = Math.min(5, lesson.blocks?.length || 0);
      for (let i = 0; i < blocksToProcess; i++) {
        const block = lesson.blocks[i];
        sleep(randomIntBetween(3, 10)); // Reading/viewing time

        if (block.type === 'question' && block.data?.options?.length > 0) {
          const answer = randomItem(block.data.options).id;
          submitAnswer(token, lesson.id, block.id, answer);
          sleep(randomIntBetween(1, 3));
        }
      }

      // Complete lesson
      completeLesson(token, lesson.id);
    });

    // Check progress
    group('check_progress', () => {
      getProgress(token);
      getAchievements(token);
    });
  });

  activeUsers.add(-1);
  sleep(randomIntBetween(1, 5));
}

/**
 * Stress Test - Push system to limits
 */
export function stressTest() {
  const user = randomItem(TEST_USERS);
  activeUsers.add(1);

  const token = login(user);
  if (!token) {
    activeUsers.add(-1);
    return;
  }

  // Rapid-fire requests to stress the system
  for (let i = 0; i < 10; i++) {
    http.batch([
      ['GET', `${BASE_URL}/lessons`, null, { headers: getAuthHeaders(token) }],
      ['GET', `${BASE_URL}/users/me/progress`, null, { headers: getAuthHeaders(token) }],
      ['GET', `${BASE_URL}/achievements`, null, { headers: getAuthHeaders(token) }],
      ['GET', `${BASE_URL}/lessons/recommended`, null, { headers: getAuthHeaders(token) }],
    ]);
    requestCount.add(4);
  }

  activeUsers.add(-1);
  sleep(0.5);
}

/**
 * Spike Test - Handle sudden traffic increase
 */
export function spikeTest() {
  const user = randomItem(TEST_USERS);
  activeUsers.add(1);

  const token = login(user);
  if (!token) {
    activeUsers.add(-1);
    return;
  }

  // Quick session simulation
  getDashboard(token);

  const lessons = getLessons(token);
  if (lessons.length > 0) {
    getLesson(token, randomItem(lessons).id);
  }

  activeUsers.add(-1);
  sleep(1);
}

/**
 * Soak Test - Extended duration testing
 */
export function soakTest() {
  const user = randomItem(TEST_USERS);
  activeUsers.add(1);

  group('extended_session', () => {
    const token = login(user);
    if (!token) {
      activeUsers.add(-1);
      return;
    }

    // Simulate realistic user session over time
    for (let i = 0; i < 5; i++) {
      getDashboard(token);
      sleep(randomIntBetween(5, 10));

      const lessons = getLessons(token);
      if (lessons.length > 0) {
        getLesson(token, randomItem(lessons).id);
      }
      sleep(randomIntBetween(10, 20));

      getProgress(token);
      sleep(randomIntBetween(5, 15));
    }
  });

  activeUsers.add(-1);
  sleep(randomIntBetween(10, 30));
}

/**
 * API Endpoint Test - Specific endpoint testing
 */
export function apiEndpointTest() {
  const user = randomItem(TEST_USERS);

  const token = login(user);
  if (!token) return;

  // Test various API endpoints
  const endpoints = [
    { path: '/lessons', name: 'lessons' },
    { path: '/users/me', name: 'user_profile' },
    { path: '/users/me/progress', name: 'progress' },
    { path: '/achievements', name: 'achievements' },
    { path: '/lessons/recommended', name: 'recommended' },
  ];

  const endpoint = randomItem(endpoints);

  const response = http.get(`${BASE_URL}${endpoint.path}`, {
    headers: getAuthHeaders(token),
    tags: { name: endpoint.name },
  });

  requestCount.add(1);

  check(response, {
    [`${endpoint.name} status is 200`]: (r) => r.status === 200,
    [`${endpoint.name} response time < 500ms`]: (r) => r.timings.duration < 500,
  });
}

// ============================================================================
// LIFECYCLE HOOKS
// ============================================================================

export function setup() {
  console.log(`Starting load test against ${BASE_URL}`);

  // Verify API is accessible
  const response = http.get(`${BASE_URL}/health`);
  if (response.status !== 200) {
    throw new Error(`API health check failed: ${response.status}`);
  }

  console.log('API health check passed');

  return {
    startTime: new Date().toISOString(),
    baseUrl: BASE_URL,
    webUrl: WEB_URL,
  };
}

export function teardown(data) {
  console.log(`Load test completed. Started at: ${data.startTime}`);
  console.log(`Tested against: ${data.baseUrl}`);
}

// ============================================================================
// CUSTOM SUMMARY HANDLER
// ============================================================================

export function handleSummary(data) {
  const summary = generateSummary(data);

  return {
    stdout: summary.text,
    'results/summary.json': JSON.stringify(data, null, 2),
    'results/summary.html': summary.html,
  };
}

function generateSummary(data) {
  const metrics = data.metrics;

  const text = `
==================== AIVO LOAD TEST SUMMARY ====================

Total Requests: ${metrics.http_reqs?.values?.count || 0}
Failed Requests: ${metrics.http_req_failed?.values?.passes || 0}
Error Rate: ${((metrics.api_errors?.values?.rate || 0) * 100).toFixed(2)}%

Response Times:
  - Average: ${(metrics.http_req_duration?.values?.avg || 0).toFixed(2)}ms
  - P50: ${(metrics.http_req_duration?.values?.['p(50)'] || 0).toFixed(2)}ms
  - P95: ${(metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2)}ms
  - P99: ${(metrics.http_req_duration?.values?.['p(99)'] || 0).toFixed(2)}ms

Custom Metrics:
  - Login Duration (avg): ${(metrics.login_duration?.values?.avg || 0).toFixed(2)}ms
  - Dashboard Load (avg): ${(metrics.dashboard_load_duration?.values?.avg || 0).toFixed(2)}ms
  - Lesson Load (avg): ${(metrics.lesson_load_duration?.values?.avg || 0).toFixed(2)}ms
  - Question Submit (avg): ${(metrics.question_submit_duration?.values?.avg || 0).toFixed(2)}ms

Thresholds:
${Object.entries(data.root_group?.checks || {})
  .map(([name, check]) => `  - ${name}: ${check.passes}/${check.passes + check.fails} passed`)
  .join('\n')}

================================================================
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>AIVO Load Test Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #333; }
    .card { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .metric { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .metric:last-child { border-bottom: none; }
    .metric-name { font-weight: 500; color: #666; }
    .metric-value { font-weight: bold; color: #333; }
    .pass { color: #22c55e; }
    .fail { color: #ef4444; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>AIVO Load Test Report</h1>
    <p>Generated: ${new Date().toISOString()}</p>

    <div class="grid">
      <div class="card">
        <h3>Request Summary</h3>
        <div class="metric">
          <span class="metric-name">Total Requests</span>
          <span class="metric-value">${metrics.http_reqs?.values?.count || 0}</span>
        </div>
        <div class="metric">
          <span class="metric-name">Failed Requests</span>
          <span class="metric-value">${metrics.http_req_failed?.values?.passes || 0}</span>
        </div>
        <div class="metric">
          <span class="metric-name">Error Rate</span>
          <span class="metric-value">${((metrics.api_errors?.values?.rate || 0) * 100).toFixed(2)}%</span>
        </div>
      </div>

      <div class="card">
        <h3>Response Times</h3>
        <div class="metric">
          <span class="metric-name">Average</span>
          <span class="metric-value">${(metrics.http_req_duration?.values?.avg || 0).toFixed(2)}ms</span>
        </div>
        <div class="metric">
          <span class="metric-name">P95</span>
          <span class="metric-value">${(metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2)}ms</span>
        </div>
        <div class="metric">
          <span class="metric-name">P99</span>
          <span class="metric-value">${(metrics.http_req_duration?.values?.['p(99)'] || 0).toFixed(2)}ms</span>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>Custom Metrics</h3>
      <div class="metric">
        <span class="metric-name">Login Duration (avg)</span>
        <span class="metric-value">${(metrics.login_duration?.values?.avg || 0).toFixed(2)}ms</span>
      </div>
      <div class="metric">
        <span class="metric-name">Dashboard Load (avg)</span>
        <span class="metric-value">${(metrics.dashboard_load_duration?.values?.avg || 0).toFixed(2)}ms</span>
      </div>
      <div class="metric">
        <span class="metric-name">Lesson Load (avg)</span>
        <span class="metric-value">${(metrics.lesson_load_duration?.values?.avg || 0).toFixed(2)}ms</span>
      </div>
      <div class="metric">
        <span class="metric-name">Question Submit (avg)</span>
        <span class="metric-value">${(metrics.question_submit_duration?.values?.avg || 0).toFixed(2)}ms</span>
      </div>
    </div>
  </div>
</body>
</html>
`;

  return { text, html };
}
