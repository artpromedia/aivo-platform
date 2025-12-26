/**
 * k6 API-Specific Load Tests
 *
 * Focused tests for individual API endpoints
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';

// Custom metrics per endpoint
const metrics = {
  auth: {
    duration: new Trend('auth_duration', true),
    errors: new Rate('auth_errors'),
  },
  courses: {
    duration: new Trend('courses_duration', true),
    errors: new Rate('courses_errors'),
  },
  lessons: {
    duration: new Trend('lessons_duration', true),
    errors: new Rate('lessons_errors'),
  },
  progress: {
    duration: new Trend('progress_duration', true),
    errors: new Rate('progress_errors'),
  },
  search: {
    duration: new Trend('search_duration', true),
    errors: new Rate('search_errors'),
  },
};

export const options = {
  scenarios: {
    auth_endpoints: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 20,
      maxVUs: 50,
      exec: 'testAuth',
      tags: { endpoint: 'auth' },
    },
    courses_endpoints: {
      executor: 'constant-arrival-rate',
      rate: 200,
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 50,
      maxVUs: 100,
      exec: 'testCourses',
      tags: { endpoint: 'courses' },
    },
    search_endpoints: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 30,
      maxVUs: 60,
      exec: 'testSearch',
      tags: { endpoint: 'search' },
    },
  },
  thresholds: {
    // Auth endpoints
    auth_duration: ['p(95)<300'],
    auth_errors: ['rate<0.02'],

    // Course endpoints
    courses_duration: ['p(95)<200'],
    courses_errors: ['rate<0.01'],

    // Search endpoints
    search_duration: ['p(95)<500'],
    search_errors: ['rate<0.01'],

    // Overall
    http_req_duration: ['p(95)<200'],
    http_req_failed: ['rate<0.01'],
  },
};

// =============================================================================
// AUTH ENDPOINT TESTS
// =============================================================================

export function testAuth() {
  // Login test
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: `user${Math.floor(Math.random() * 1000)}@test.com`,
      password: 'testpass123',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  metrics.auth.duration.add(loginRes.timings.duration);
  metrics.auth.errors.add(loginRes.status !== 200 && loginRes.status !== 401);

  check(loginRes, {
    'auth response status valid': (r) => r.status === 200 || r.status === 401,
    'auth response time ok': (r) => r.timings.duration < 300,
  });

  sleep(0.1);
}

// =============================================================================
// COURSES ENDPOINT TESTS
// =============================================================================

export function testCourses() {
  const params = {
    headers: {
      'Authorization': 'Bearer test-token',
      'Content-Type': 'application/json',
    },
  };

  // List courses
  const listRes = http.get(`${BASE_URL}/api/courses?page=1&limit=20`, params);

  metrics.courses.duration.add(listRes.timings.duration);
  metrics.courses.errors.add(listRes.status >= 400);

  check(listRes, {
    'courses list status ok': (r) => r.status === 200,
    'courses list response time ok': (r) => r.timings.duration < 200,
    'courses list has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body && (body.data || Array.isArray(body));
      } catch {
        return false;
      }
    },
  });

  // Get single course
  const courseId = 'test-course-' + Math.floor(Math.random() * 100);
  const detailRes = http.get(`${BASE_URL}/api/courses/${courseId}`, params);

  check(detailRes, {
    'course detail status valid': (r) => r.status === 200 || r.status === 404,
  });

  sleep(0.05);
}

// =============================================================================
// SEARCH ENDPOINT TESTS
// =============================================================================

export function testSearch() {
  const params = {
    headers: {
      'Authorization': 'Bearer test-token',
    },
  };

  const queries = [
    'mathematics',
    'programming',
    'science',
    'history',
    'algebra',
    'python',
    'javascript',
    'biology',
    'chemistry',
    'physics',
  ];

  const query = queries[Math.floor(Math.random() * queries.length)];
  const searchRes = http.get(`${BASE_URL}/api/search?q=${query}&limit=20`, params);

  metrics.search.duration.add(searchRes.timings.duration);
  metrics.search.errors.add(searchRes.status >= 400);

  check(searchRes, {
    'search status ok': (r) => r.status === 200,
    'search response time ok': (r) => r.timings.duration < 500,
  });

  sleep(0.1);
}

// =============================================================================
// PROGRESS ENDPOINT TESTS
// =============================================================================

export function testProgress() {
  const params = {
    headers: {
      'Authorization': 'Bearer test-token',
      'Content-Type': 'application/json',
    },
  };

  // Update progress
  const progressRes = http.post(
    `${BASE_URL}/api/progress`,
    JSON.stringify({
      lessonId: `lesson-${Math.floor(Math.random() * 1000)}`,
      progress: Math.floor(Math.random() * 100),
      timeSpent: Math.floor(Math.random() * 600),
      completed: Math.random() > 0.8,
    }),
    params
  );

  metrics.progress.duration.add(progressRes.timings.duration);
  metrics.progress.errors.add(progressRes.status >= 400);

  check(progressRes, {
    'progress update status ok': (r) => r.status === 200 || r.status === 201,
    'progress update response time ok': (r) => r.timings.duration < 150,
  });

  sleep(0.05);
}
