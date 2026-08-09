// k6 load test — hits the public login/landing page only (no auth, no writes,
// no WhatsApp/Google API calls triggered). Safe to run at full load.
//
// Usage:
//   docker run --rm -i grafana/k6 run - < scripts/load-test-login.js
//
// Override the target with -e BASE_URL=https://app.roee.fyi if needed.

import http from 'k6/http'
import { check, sleep } from 'k6'

const BASE_URL = __ENV.BASE_URL || 'https://app.roee.fyi'

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // warm up
    { duration: '30s', target: 150 },
    { duration: '30s', target: 300 },
    { duration: '1m', target: 500 },   // hold at 500 concurrent VUs
    { duration: '30s', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],     // fail the test if >5% of requests error
    http_req_duration: ['p(95)<2000'],  // flag if p95 latency exceeds 2s
  },
}

export default function () {
  const res = http.get(BASE_URL + '/')
  check(res, {
    'status is 200 or 307': (r) => r.status === 200 || r.status === 307,
  })
  sleep(1)
}
