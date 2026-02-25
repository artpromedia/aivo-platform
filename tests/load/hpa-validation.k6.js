import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp to 50 users
    { duration: '5m', target: 200 },  // Ramp to 200 users (should trigger scaling)
    { duration: '5m', target: 200 },  // Sustain
    { duration: '2m', target: 0 },    // Ramp down (should trigger scale-down)
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],     // Less than 1% failure rate
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://staging.aivolearning.com';

export default function () {
  // Simulate learner portal access pattern
  const responses = http.batch([
    ['GET', `${BASE_URL}/api/health`],
    ['GET', `${BASE_URL}/api/content/subjects`],
    ['GET', `${BASE_URL}/api/session/current`],
  ]);
  
  for (const res of responses) {
    check(res, { 'status is 200': (r) => r.status === 200 });
  }
  
  sleep(1);
}
