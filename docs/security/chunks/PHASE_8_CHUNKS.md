# Phase 8: Security Automation & Documentation - Detailed Chunks

## Chunk 8.1: Vulnerability Scanning Integration

**Time Estimate:** 6-8 hours  
**Priority:** P2 - Medium  
**Dependencies:** CI/CD Pipeline

### Files to Create

#### 1. `.github/workflows/security-scan.yml`

```yaml
name: Security Scanning

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM

env:
  SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
  SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}

jobs:
  # ============================================================================
  # Dependency Scanning
  # ============================================================================
  dependency-scan:
    name: Dependency Vulnerability Scan
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run npm audit
        run: pnpm audit --audit-level=high
        continue-on-error: true

      - name: Run Snyk test
        uses: snyk/actions/node@master
        with:
          command: test
          args: --severity-threshold=high --all-projects

      - name: Run Snyk monitor
        uses: snyk/actions/node@master
        if: github.ref == 'refs/heads/main'
        with:
          command: monitor
          args: --all-projects

  # ============================================================================
  # SAST - Static Application Security Testing
  # ============================================================================
  sast-scan:
    name: SAST Scan
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: SonarCloud Scan
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
        with:
          args: >
            -Dsonar.projectKey=aivo-platform
            -Dsonar.organization=aivo-edu
            -Dsonar.sources=services,libs,apps
            -Dsonar.exclusions=**/*.test.ts,**/*.spec.ts,**/node_modules/**
            -Dsonar.typescript.lcov.reportPaths=coverage/lcov.info

      - name: Semgrep Scan
        uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/javascript
            p/typescript
            p/nodejs
            p/security-audit
            p/owasp-top-ten
            p/cwe-top-25

  # ============================================================================
  # Container Scanning
  # ============================================================================
  container-scan:
    name: Container Vulnerability Scan
    runs-on: ubuntu-latest
    needs: build
    strategy:
      matrix:
        service: [api-gateway, auth-svc, content-svc, assessment-svc]
    steps:
      - name: Download image artifact
        uses: actions/download-artifact@v4
        with:
          name: ${{ matrix.service }}-image

      - name: Load Docker image
        run: docker load < ${{ matrix.service }}.tar

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'aivo/${{ matrix.service }}:latest'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
          ignore-unfixed: true

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

  # ============================================================================
  # Secret Scanning
  # ============================================================================
  secret-scan:
    name: Secret Detection
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: TruffleHog Secret Scan
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD

      - name: Gitleaks Scan
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  # ============================================================================
  # Infrastructure Scanning
  # ============================================================================
  iac-scan:
    name: Infrastructure Security Scan
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Checkov
        uses: bridgecrewio/checkov-action@master
        with:
          directory: infrastructure/terraform
          framework: terraform
          output_format: sarif
          output_file_path: checkov-results.sarif
          skip_check: CKV_AWS_19  # Example skip

      - name: Upload Checkov results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'checkov-results.sarif'

      - name: Run tfsec
        uses: aquasecurity/tfsec-action@v1.0.0
        with:
          working_directory: infrastructure/terraform
          format: sarif
          out: tfsec-results.sarif

  # ============================================================================
  # DAST - Dynamic Application Security Testing
  # ============================================================================
  dast-scan:
    name: DAST Scan
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    needs: [dependency-scan, sast-scan]
    steps:
      - name: OWASP ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.10.0
        with:
          target: 'https://staging.aivo.edu'
          rules_file_name: '.zap/rules.tsv'
          allow_issue_writing: true
          fail_action: true

  # ============================================================================
  # Security Report
  # ============================================================================
  security-report:
    name: Generate Security Report
    runs-on: ubuntu-latest
    needs: [dependency-scan, sast-scan, container-scan, secret-scan, iac-scan]
    if: always()
    steps:
      - name: Download all scan results
        uses: actions/download-artifact@v4

      - name: Generate consolidated report
        run: |
          echo "# Security Scan Report" > security-report.md
          echo "Generated: $(date)" >> security-report.md
          # Consolidate results...

      - name: Upload security report
        uses: actions/upload-artifact@v4
        with:
          name: security-report
          path: security-report.md
```

### Acceptance Criteria
- [ ] Dependency scanning (Snyk, npm audit)
- [ ] SAST scanning (SonarCloud, Semgrep)
- [ ] Container scanning (Trivy)
- [ ] Secret detection (TruffleHog, Gitleaks)
- [ ] IaC scanning (Checkov, tfsec)
- [ ] DAST scanning (ZAP)
- [ ] Consolidated reporting

---

## Chunk 8.2: Security Test Suite

**Time Estimate:** 8-10 hours  
**Priority:** P2 - Medium  
**Dependencies:** Phase 1-5 completion

### Files to Create

#### 1. `services/api-gateway/test/security/auth.security.spec.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { TestingModule, Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';

describe('Authentication Security Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Brute Force Protection', () => {
    it('should block after 5 failed login attempts', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      // Attempt 5 failed logins
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/api/auth/login')
          .send(credentials);
      }

      // 6th attempt should be blocked
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(credentials);

      expect(response.status).toBe(429);
      expect(response.body.message).toContain('Too many login attempts');
    });

    it('should reset lockout after waiting period', async () => {
      // Wait for lockout to expire (test environment: 1 minute)
      await new Promise(resolve => setTimeout(resolve, 60000));

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      expect(response.status).not.toBe(429);
    });
  });

  describe('Session Security', () => {
    it('should invalidate old sessions on password change', async () => {
      // Login and get token
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: 'ValidP@ssword123' });

      const oldToken = loginRes.body.accessToken;

      // Change password
      await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${oldToken}`)
        .send({
          currentPassword: 'ValidP@ssword123',
          newPassword: 'NewValidP@ssword456',
        });

      // Old token should be invalid
      const response = await request(app.getHttpServer())
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${oldToken}`);

      expect(response.status).toBe(401);
    });

    it('should enforce single session per device', async () => {
      // Login from device 1
      const login1 = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('User-Agent', 'Device1')
        .send({ email: 'user@example.com', password: 'ValidP@ssword123' });

      const token1 = login1.body.accessToken;

      // Login from device 1 again (should invalidate first session)
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('User-Agent', 'Device1')
        .send({ email: 'user@example.com', password: 'ValidP@ssword123' });

      // First token should be invalid
      const response = await request(app.getHttpServer())
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(401);
    });
  });

  describe('Token Security', () => {
    it('should reject expired tokens', async () => {
      // Use a pre-generated expired token
      const expiredToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...';

      const response = await request(app.getHttpServer())
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Token expired');
    });

    it('should reject tampered tokens', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: 'ValidP@ssword123' });

      // Tamper with the token payload
      const tamperedToken = loginRes.body.accessToken.replace(
        /\.[^.]+\./,
        '.eyJ0YW1wZXJlZCI6dHJ1ZX0.'
      );

      const response = await request(app.getHttpServer())
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(response.status).toBe(401);
    });

    it('should not leak sensitive data in token', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: 'ValidP@ssword123' });

      const payload = JSON.parse(
        Buffer.from(loginRes.body.accessToken.split('.')[1], 'base64').toString()
      );

      // Sensitive fields should not be in token
      expect(payload).not.toHaveProperty('password');
      expect(payload).not.toHaveProperty('ssn');
      expect(payload).not.toHaveProperty('dateOfBirth');
    });
  });
});
```

#### 2. `services/api-gateway/test/security/injection.security.spec.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { setupTestApp } from '../test-utils';

describe('Injection Attack Prevention', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await setupTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('SQL Injection Prevention', () => {
    const sqlPayloads = [
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
      "1; SELECT * FROM users WHERE 1=1",
      "UNION SELECT username, password FROM users",
      "1' AND (SELECT COUNT(*) FROM users) > 0 --",
      "admin'--",
      "' OR EXISTS(SELECT * FROM users WHERE username='admin') --",
    ];

    it.each(sqlPayloads)('should reject SQL injection payload: %s', async (payload) => {
      const response = await request(app.getHttpServer())
        .get(`/api/users?search=${encodeURIComponent(payload)}`)
        .set('Authorization', 'Bearer valid-token');

      // Should either sanitize or reject
      expect(response.status).not.toBe(500);
      expect(response.body).not.toContain('SQL');
      expect(response.body).not.toContain('syntax error');
    });
  });

  describe('XSS Prevention', () => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      'javascript:alert("XSS")',
      '<svg onload=alert("XSS")>',
      '"><script>alert(String.fromCharCode(88,83,83))</script>',
      "'; alert('XSS');//",
      '<body onload=alert("XSS")>',
      '<iframe src="javascript:alert(\'XSS\')">',
    ];

    it.each(xssPayloads)('should sanitize XSS payload: %s', async (payload) => {
      const response = await request(app.getHttpServer())
        .post('/api/content')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: payload,
          description: payload,
        });

      // Should sanitize, not store raw payload
      if (response.status === 201) {
        expect(response.body.title).not.toContain('<script>');
        expect(response.body.title).not.toContain('onerror');
        expect(response.body.title).not.toContain('javascript:');
      }
    });
  });

  describe('NoSQL Injection Prevention', () => {
    const nosqlPayloads = [
      { $gt: '' },
      { $ne: null },
      { $where: 'this.password.length > 0' },
      { $regex: '.*' },
    ];

    it.each(nosqlPayloads)('should reject NoSQL injection: %j', async (payload) => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: payload,
          password: payload,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Path Traversal Prevention', () => {
    const pathPayloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '....//....//....//etc/passwd',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '..%252f..%252f..%252fetc/passwd',
    ];

    it.each(pathPayloads)('should block path traversal: %s', async (payload) => {
      const response = await request(app.getHttpServer())
        .get(`/api/files/${encodeURIComponent(payload)}`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
    });
  });

  describe('Command Injection Prevention', () => {
    const cmdPayloads = [
      '; ls -la',
      '| cat /etc/passwd',
      '`rm -rf /`',
      '$(whoami)',
      '& ping -c 10 attacker.com',
    ];

    it.each(cmdPayloads)('should block command injection: %s', async (payload) => {
      const response = await request(app.getHttpServer())
        .post('/api/export')
        .set('Authorization', 'Bearer valid-token')
        .send({
          filename: payload,
        });

      expect(response.status).toBe(400);
    });
  });
});
```

#### 3. `services/api-gateway/test/security/authorization.security.spec.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { setupTestApp, createTestUser, getAuthToken } from '../test-utils';

describe('Authorization Security Tests', () => {
  let app: INestApplication;
  let adminToken: string;
  let teacherToken: string;
  let studentToken: string;
  let parentToken: string;

  beforeAll(async () => {
    app = await setupTestApp();
    adminToken = await getAuthToken(app, 'admin');
    teacherToken = await getAuthToken(app, 'teacher');
    studentToken = await getAuthToken(app, 'student');
    parentToken = await getAuthToken(app, 'parent');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Horizontal Privilege Escalation', () => {
    it('should prevent student from accessing other student data', async () => {
      const otherStudentId = 'other-student-uuid';

      const response = await request(app.getHttpServer())
        .get(`/api/students/${otherStudentId}/grades`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
    });

    it('should prevent parent from accessing non-linked student data', async () => {
      const unlinkedStudentId = 'unlinked-student-uuid';

      const response = await request(app.getHttpServer())
        .get(`/api/students/${unlinkedStudentId}/progress`)
        .set('Authorization', `Bearer ${parentToken}`);

      expect(response.status).toBe(403);
    });

    it('should prevent teacher from accessing students outside their classes', async () => {
      const otherClassStudentId = 'other-class-student-uuid';

      const response = await request(app.getHttpServer())
        .get(`/api/students/${otherClassStudentId}/assessments`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Vertical Privilege Escalation', () => {
    it('should prevent student from accessing admin endpoints', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
    });

    it('should prevent teacher from modifying system settings', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/admin/settings')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ feature: 'enabled' });

      expect(response.status).toBe(403);
    });

    it('should prevent role escalation via API', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ role: 'admin' });

      expect([400, 403]).toContain(response.status);
    });
  });

  describe('IDOR Prevention', () => {
    it('should prevent enumeration of user IDs', async () => {
      const responses = await Promise.all(
        [1, 2, 3, 4, 5].map(id =>
          request(app.getHttpServer())
            .get(`/api/users/${id}`)
            .set('Authorization', `Bearer ${studentToken}`)
        )
      );

      // Should not reveal existence of resources
      responses.forEach(response => {
        if (response.status === 403) {
          expect(response.body.message).not.toContain('not found');
        }
      });
    });

    it('should use UUIDs not sequential IDs', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/content')
        .set('Authorization', `Bearer ${studentToken}`);

      if (response.body.items?.length > 0) {
        response.body.items.forEach((item: any) => {
          // UUID v4 pattern
          expect(item.id).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
          );
        });
      }
    });
  });

  describe('Resource Access Control', () => {
    it('should enforce organization boundaries', async () => {
      const otherOrgResourceId = 'other-org-resource-uuid';

      const response = await request(app.getHttpServer())
        .get(`/api/resources/${otherOrgResourceId}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(403);
    });

    it('should enforce district boundaries', async () => {
      const otherDistrictSchoolId = 'other-district-school-uuid';

      const response = await request(app.getHttpServer())
        .get(`/api/schools/${otherDistrictSchoolId}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(403);
    });
  });
});
```

### Acceptance Criteria
- [ ] Authentication security tests
- [ ] Injection prevention tests
- [ ] Authorization tests (horizontal/vertical)
- [ ] IDOR prevention tests
- [ ] Rate limiting tests
- [ ] Session security tests
- [ ] All tests passing in CI/CD

---

## Chunk 8.3: API Security Testing

**Time Estimate:** 6-8 hours  
**Priority:** P2 - Medium  
**Dependencies:** Chunk 8.2

### Files to Create

#### 1. `tests/security/api-fuzzing.spec.ts`

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';

describe('API Fuzzing Tests', () => {
  const baseUrl = process.env.API_URL || 'http://localhost:3000';

  describe('Input Fuzzing', () => {
    const fuzzPayloads = [
      // Boundary values
      '',
      ' ',
      '\n\r\t',
      'a'.repeat(10000),
      '0'.repeat(1000),
      
      // Null bytes
      '\x00',
      'test\x00hidden',
      
      // Unicode edge cases
      '🎉'.repeat(100),
      '\uFEFF', // BOM
      '\u0000', // Null
      '\u202E', // RTL override
      
      // Format strings
      '%s%s%s%s%s',
      '%n%n%n%n%n',
      '%x%x%x%x%x',
      
      // Special numbers
      -1,
      0,
      Number.MAX_SAFE_INTEGER,
      Number.MIN_SAFE_INTEGER,
      Infinity,
      -Infinity,
      NaN,
      1.7976931348623157e+308,
      
      // JSON edge cases
      null,
      undefined,
      [],
      {},
      [[[[[]]]]],
      { a: { b: { c: { d: { e: {} } } } } },
    ];

    it.each(fuzzPayloads)('should handle fuzz input gracefully: %p', async (payload) => {
      const response = await request(baseUrl)
        .post('/api/search')
        .send({ query: payload });

      // Should not crash (500) or reveal internal errors
      expect(response.status).not.toBe(500);
      expect(response.text).not.toContain('stack trace');
      expect(response.text).not.toContain('at Object.');
    });
  });

  describe('Header Fuzzing', () => {
    const headerPayloads = [
      { 'Content-Length': '-1' },
      { 'Content-Length': '999999999' },
      { 'Transfer-Encoding': 'chunked, identity' },
      { 'X-Forwarded-For': '127.0.0.1, ::1, localhost' },
      { 'Host': 'evil.com' },
      { 'X-Custom-Header': 'a'.repeat(10000) },
    ];

    it.each(headerPayloads)('should handle malformed header: %p', async (headers) => {
      const response = await request(baseUrl)
        .get('/api/health')
        .set(headers as any);

      expect(response.status).not.toBe(500);
    });
  });

  describe('Method Fuzzing', () => {
    const methods = ['OPTIONS', 'HEAD', 'TRACE', 'CONNECT', 'PATCH', 'INVALID'];

    it.each(methods)('should handle HTTP method: %s', async (method) => {
      const response = await request(baseUrl)[method.toLowerCase() as 'get']?.('/api/users');

      if (response) {
        // TRACE should be disabled
        if (method === 'TRACE') {
          expect([405, 501]).toContain(response.status);
        }
        // Should not reveal server internals
        expect(response.headers).not.toHaveProperty('x-powered-by');
      }
    });
  });
});
```

#### 2. `tests/security/rate-limit.spec.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';

describe('Rate Limiting Tests', () => {
  const baseUrl = process.env.API_URL || 'http://localhost:3000';

  beforeEach(async () => {
    // Wait for rate limit to reset between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('Global Rate Limiting', () => {
    it('should enforce global rate limit', async () => {
      const requests = Array(110).fill(null).map(() =>
        request(baseUrl).get('/api/health')
      );

      const responses = await Promise.all(requests);
      const tooManyRequests = responses.filter(r => r.status === 429);

      expect(tooManyRequests.length).toBeGreaterThan(0);
    });

    it('should include rate limit headers', async () => {
      const response = await request(baseUrl).get('/api/health');

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });
  });

  describe('Auth Rate Limiting', () => {
    it('should have stricter limits on auth endpoints', async () => {
      const requests = Array(15).fill(null).map(() =>
        request(baseUrl)
          .post('/api/auth/login')
          .send({ email: 'test@test.com', password: 'wrong' })
      );

      const responses = await Promise.all(requests);
      const blocked = responses.filter(r => r.status === 429);

      expect(blocked.length).toBeGreaterThan(0);
    });

    it('should enforce per-IP limits', async () => {
      // Simulate different IPs
      const response = await request(baseUrl)
        .post('/api/auth/login')
        .set('X-Forwarded-For', '1.2.3.4')
        .send({ email: 'test@test.com', password: 'wrong' });

      // First request from new IP should not be rate limited
      expect(response.status).not.toBe(429);
    });
  });

  describe('Expensive Operations Rate Limiting', () => {
    it('should limit export operations', async () => {
      const token = 'valid-test-token';

      const requests = Array(5).fill(null).map(() =>
        request(baseUrl)
          .post('/api/export/report')
          .set('Authorization', `Bearer ${token}`)
          .send({ type: 'full' })
      );

      const responses = await Promise.all(requests);
      const blocked = responses.filter(r => r.status === 429);

      expect(blocked.length).toBeGreaterThan(0);
    });
  });
});
```

### Acceptance Criteria
- [ ] API fuzzing test suite
- [ ] Header manipulation tests
- [ ] Rate limit validation
- [ ] Method handling tests
- [ ] Error response validation
- [ ] Integration with CI/CD

---

## Chunk 8.4: Incident Response Playbooks

**Time Estimate:** 6-8 hours  
**Priority:** P2 - Medium  
**Dependencies:** Phase 6

### Files to Create

#### 1. `docs/security/playbooks/incident-response-main.md`

```markdown
# Incident Response Playbook

## Overview

This document outlines the incident response procedures for the AIVO platform.

## Severity Classification

| Severity | Response Time | Examples |
|----------|---------------|----------|
| P1 - Critical | 15 minutes | Data breach, complete service outage |
| P2 - High | 1 hour | Security vulnerability exploited, partial outage |
| P3 - Medium | 4 hours | Suspected breach, degraded service |
| P4 - Low | 24 hours | Security policy violation, minor issues |

## Incident Response Phases

### Phase 1: Detection & Triage (0-15 minutes)

1. **Verify the incident**
   - Check monitoring dashboards
   - Review alerts and logs
   - Confirm impact scope

2. **Classify severity**
   - Use classification matrix
   - Consider data sensitivity
   - Assess user impact

3. **Notify response team**
   - Page on-call engineer (P1/P2)
   - Send Slack alert
   - Update status page

### Phase 2: Containment (15-60 minutes)

1. **Immediate containment**
   - Block malicious IPs
   - Revoke compromised credentials
   - Isolate affected systems

2. **Short-term containment**
   - Apply emergency patches
   - Enable additional logging
   - Preserve evidence

3. **Document actions**
   - Log all containment steps
   - Record timestamps
   - Note decision rationale

### Phase 3: Eradication (1-4 hours)

1. **Root cause analysis**
   - Review logs and traces
   - Identify attack vector
   - Map affected systems

2. **Remove threat**
   - Delete malicious files
   - Close security gaps
   - Reset credentials

3. **Verify eradication**
   - Scan for persistence
   - Check for backdoors
   - Validate fixes

### Phase 4: Recovery (4-24 hours)

1. **System restoration**
   - Restore from clean backups
   - Redeploy services
   - Verify integrity

2. **Validation**
   - Run security scans
   - Test functionality
   - Monitor closely

3. **Return to normal**
   - Lift emergency measures
   - Resume normal operations
   - Update status page

### Phase 5: Post-Incident (24-72 hours)

1. **Post-mortem**
   - Conduct blameless review
   - Document timeline
   - Identify improvements

2. **Reporting**
   - Internal report
   - Regulatory notifications (if required)
   - Customer communication

3. **Process improvement**
   - Update playbooks
   - Implement fixes
   - Schedule training

## Contact Information

| Role | Primary | Secondary |
|------|---------|-----------|
| Security Lead | [Name] | [Name] |
| On-Call Engineer | PagerDuty | [Backup] |
| Legal Counsel | [Name] | [Firm] |
| Communications | [Name] | [Backup] |
| Executive Sponsor | [Name] | [Backup] |

## Escalation Matrix

| Condition | Escalate To |
|-----------|-------------|
| P1 incident confirmed | CTO, Security Lead |
| Data breach suspected | Legal, Privacy Officer |
| Student data involved | FERPA Officer |
| Child data (<13) involved | COPPA Officer |
| EU resident data | DPO |
```

#### 2. `docs/security/playbooks/data-breach-playbook.md`

```markdown
# Data Breach Response Playbook

## Immediate Actions (0-4 hours)

### Step 1: Confirm the Breach
- [ ] Verify data was actually accessed/exfiltrated
- [ ] Identify type of data compromised
- [ ] Determine number of affected records
- [ ] Identify affected user populations

### Step 2: Contain the Breach
- [ ] Revoke access tokens: `./scripts/security/revoke-all-tokens.sh`
- [ ] Block suspicious IPs: `./scripts/security/block-ips.sh [IPs]`
- [ ] Disable compromised accounts
- [ ] Rotate all secrets: `./scripts/security/rotate-secrets.sh`

### Step 3: Preserve Evidence
- [ ] Capture system snapshots
- [ ] Export relevant logs
- [ ] Document chain of custody
- [ ] Engage forensics team (if needed)

## Classification & Notification (4-24 hours)

### Data Classification Impact

| Data Type | Notification Required |
|-----------|----------------------|
| Student educational records | FERPA: Institution + DOE |
| Child PII (<13 years) | COPPA: FTC within 24 hours |
| EU resident data | GDPR: DPA within 72 hours |
| California resident data | CCPA: AG notification |
| Financial data | PCI-DSS: Card brands |
| Health data | HIPAA: HHS within 60 days |

### Notification Templates

See `/docs/security/templates/breach-notification-*.md`

## Remediation (24-72 hours)

### Technical Remediation
- [ ] Patch vulnerability that allowed breach
- [ ] Implement additional monitoring
- [ ] Enhanced logging on sensitive data
- [ ] Review and update access controls

### User Remediation
- [ ] Force password resets for affected users
- [ ] Provide identity monitoring (if applicable)
- [ ] Clear communication to affected users
- [ ] Support hotline for questions

## Regulatory Compliance

### FERPA Notification Requirements
1. Notify affected parents/eligible students
2. Document notification in student records
3. Report to Department of Education if applicable

### COPPA Notification Requirements
1. Notify FTC immediately for breaches involving children
2. Notify parents of affected children
3. Provide details of remediation steps

### GDPR Notification Requirements
1. Notify supervisory authority within 72 hours
2. Document the breach internally
3. Notify affected data subjects if high risk
4. Provide details per Article 33

## Documentation Checklist

- [ ] Incident timeline
- [ ] Systems affected
- [ ] Data types compromised
- [ ] Number of affected individuals
- [ ] Root cause analysis
- [ ] Remediation actions taken
- [ ] Notifications sent
- [ ] Lessons learned
```

### Acceptance Criteria
- [ ] Main incident response playbook
- [ ] Data breach specific playbook
- [ ] DDoS response playbook
- [ ] Ransomware response playbook
- [ ] Account compromise playbook
- [ ] Contact and escalation information
- [ ] Notification templates

---

## Chunk 8.5: Compliance Documentation

**Time Estimate:** 8-10 hours  
**Priority:** P2 - Medium  
**Dependencies:** Phases 1-5

### Files to Create

#### 1. `docs/security/compliance/ferpa-controls.md`

```markdown
# FERPA Compliance Controls

## Overview

FERPA (Family Educational Rights and Privacy Act) protects the privacy of student education records.

## Control Mapping

### Access Control (20 U.S.C. § 1232g(b))

| Requirement | Control | Implementation |
|-------------|---------|----------------|
| Legitimate educational interest | Role-Based Access Control | AuthorizationGuard |
| Parent/student consent | Consent management | ConsentService |
| Directory information opt-out | Privacy preferences | ConsentService |
| Access logging | Audit trail | AuditLogService |

### Data Protection

| Requirement | Control | Implementation |
|-------------|---------|----------------|
| Record security | Encryption at rest | AES-256-GCM |
| Transmission security | TLS 1.3 | HTTPS enforcement |
| Access authentication | MFA for staff | AuthService |
| Minimum necessary | Data classification | DataClassificationService |

### Rights Management

| Right | Control | Endpoint |
|-------|---------|----------|
| Inspect records | Self-service portal | GET /api/student/records |
| Request amendments | Amendment workflow | POST /api/student/records/amendment |
| Consent to disclosure | Consent management | POST /api/consent |
| File complaints | Complaint workflow | POST /api/compliance/complaint |

## Technical Implementation

### Access Control
- Teacher access limited to enrolled students
- Parent access limited to linked children
- Admin access logged and auditable
- Third-party access requires consent

### Audit Logging
- All access to education records logged
- Logs retained for 5 years minimum
- Tamper-evident logging
- Searchable by student, date, accessor

### Data Handling
- PII masked in logs
- Encryption keys managed via KMS
- Secure deletion procedures
- Annual access reviews

## Audit Checklist

- [ ] Access controls verified
- [ ] Consent records complete
- [ ] Audit logs accessible
- [ ] Directory information procedures
- [ ] Third-party agreements current
- [ ] Training records up to date
- [ ] Complaint procedures documented
```

#### 2. `docs/security/compliance/coppa-controls.md`

```markdown
# COPPA Compliance Controls

## Overview

COPPA (Children's Online Privacy Protection Act) protects children under 13.

## Control Mapping

### Verifiable Parental Consent (16 CFR § 312.5)

| Requirement | Control | Implementation |
|-------------|---------|----------------|
| Notice to parents | Consent workflow | ConsentService |
| Consent before collection | Pre-registration check | AgeVerificationGuard |
| Consent verification | Multi-factor verification | ConsentVerificationService |
| Consent records | Audit trail | Prisma schema |

### Information Collection

| Requirement | Control | Implementation |
|-------------|---------|----------------|
| Limit collection | Minimum necessary | DataClassificationService |
| No behavioral ads | Ad blocking | Policy enforcement |
| No conditioning | Equal access | Feature flags |
| Security measures | Encryption + access control | Security module |

### Parental Rights

| Right | Control | Endpoint |
|-------|---------|----------|
| Review information | Self-service portal | GET /api/parent/child/:id/data |
| Delete information | Deletion workflow | POST /api/consent/revoke |
| Refuse further collection | Consent withdrawal | DELETE /api/consent/:id |
| Consent to operators | Operator consent | POST /api/consent/operator |

## Age Verification Flow

```
1. User provides birth date
2. If age < 13:
   a. Restrict data collection
   b. Initiate parental consent flow
   c. Verify parent identity
   d. Obtain verifiable consent
3. Log verification result
4. Proceed or block based on consent
```

## Data Collection Limits (Under 13)

### Allowed with Consent
- Name (first only for students)
- School/grade information
- Learning progress data
- Content submissions

### Never Collected
- Home address
- Personal phone number
- Photos without consent
- Location data
- Persistent identifiers for ads

## Operator Requirements

| Requirement | Implementation |
|-------------|----------------|
| Direct notice | Email to parents |
| Privacy policy link | Included in all notices |
| Consent form | Digital signature |
| Operator list | Published at /privacy/operators |

## Audit Checklist

- [ ] Age gates functioning
- [ ] Parental consent records complete
- [ ] Notice content current
- [ ] Consent mechanisms working
- [ ] Parent portal accessible
- [ ] Data deletion procedures tested
- [ ] Operator list current
- [ ] Staff training complete
```

#### 3. `docs/security/compliance/soc2-controls.md`

```markdown
# SOC 2 Type II Control Matrix

## Trust Service Criteria

### CC1: Control Environment

| Control | Description | Evidence |
|---------|-------------|----------|
| CC1.1 | Commitment to integrity | Code of conduct, security policies |
| CC1.2 | Board oversight | Board minutes, risk reviews |
| CC1.3 | Management structure | Org chart, job descriptions |
| CC1.4 | Competence commitment | Training records, certifications |
| CC1.5 | Accountability | Performance reviews, security roles |

### CC2: Communication & Information

| Control | Description | Evidence |
|---------|-------------|----------|
| CC2.1 | Information quality | Data validation, integrity checks |
| CC2.2 | Internal communication | Security bulletins, team meetings |
| CC2.3 | External communication | Privacy policy, security page |

### CC3: Risk Assessment

| Control | Description | Evidence |
|---------|-------------|----------|
| CC3.1 | Risk objectives | Risk register, risk appetite |
| CC3.2 | Risk identification | Threat modeling, pen tests |
| CC3.3 | Fraud consideration | Fraud risk assessment |
| CC3.4 | Change management | Change control process |

### CC4: Monitoring Activities

| Control | Description | Evidence |
|---------|-------------|----------|
| CC4.1 | Ongoing monitoring | CloudWatch, security dashboards |
| CC4.2 | Deficiency evaluation | Vulnerability management |

### CC5: Control Activities

| Control | Description | Evidence |
|---------|-------------|----------|
| CC5.1 | Risk mitigation | Security controls, WAF |
| CC5.2 | Technology controls | Automated deployments |
| CC5.3 | Policy deployment | Policy as code |

### CC6: Logical & Physical Access

| Control | Description | Evidence |
|---------|-------------|----------|
| CC6.1 | Access management | IAM policies, RBAC |
| CC6.2 | Access registration | User provisioning |
| CC6.3 | Access removal | Offboarding procedures |
| CC6.4 | Access review | Quarterly access reviews |
| CC6.5 | Physical access | AWS SOC report |
| CC6.6 | Physical security | AWS SOC report |
| CC6.7 | Data transmission | TLS 1.3, encryption |
| CC6.8 | Data destruction | Secure deletion |

### CC7: System Operations

| Control | Description | Evidence |
|---------|-------------|----------|
| CC7.1 | Vulnerability detection | Scanning, GuardDuty |
| CC7.2 | Anomaly detection | Threat detection service |
| CC7.3 | Security events | Incident response |
| CC7.4 | Incident response | Playbooks, runbooks |
| CC7.5 | Recovery | Backup, DR procedures |

### CC8: Change Management

| Control | Description | Evidence |
|---------|-------------|----------|
| CC8.1 | Change process | PR review, CI/CD |

### CC9: Risk Mitigation

| Control | Description | Evidence |
|---------|-------------|----------|
| CC9.1 | Vendor management | Vendor assessments |
| CC9.2 | Business continuity | DR plan, RTO/RPO |

## Evidence Collection

### Automated Evidence
- CloudWatch dashboards
- CI/CD pipeline logs
- Security scan results
- Access logs

### Manual Evidence
- Training records
- Policy documents
- Risk assessments
- Incident reports
```

### Acceptance Criteria
- [ ] FERPA controls documented
- [ ] COPPA controls documented
- [ ] GDPR controls documented
- [ ] SOC 2 control matrix
- [ ] ISO 27001 mapping
- [ ] Evidence collection procedures
- [ ] Audit preparation guide

---

## Chunk 8.6: Security Policies & Procedures

**Time Estimate:** 6-8 hours  
**Priority:** P2 - Medium  
**Dependencies:** None

### Files to Create

#### 1. `docs/security/policies/information-security-policy.md`

```markdown
# Information Security Policy

**Version:** 1.0  
**Effective Date:** [Date]  
**Review Date:** Annual  
**Owner:** Chief Information Security Officer

## 1. Purpose

This policy establishes the framework for protecting AIVO's information assets.

## 2. Scope

This policy applies to:
- All employees, contractors, and third parties
- All systems, networks, and data
- All locations and remote work

## 3. Policy Statements

### 3.1 Asset Management
- All information assets must be inventoried
- Assets must be classified by sensitivity
- Owners must be assigned for all assets

### 3.2 Access Control
- Access based on least privilege
- Role-based access control required
- Multi-factor authentication for sensitive systems
- Quarterly access reviews

### 3.3 Cryptography
- Encryption required for data at rest (AES-256)
- Encryption required in transit (TLS 1.3)
- Key management via AWS KMS
- Annual key rotation

### 3.4 Physical Security
- AWS physical security (SOC 2 certified)
- Office security procedures
- Visitor management

### 3.5 Operations Security
- Change management required
- Separation of environments
- Logging and monitoring
- Malware protection

### 3.6 Communications Security
- Network segmentation
- Firewall rules
- VPN for remote access
- Email security

### 3.7 Supplier Relationships
- Security requirements in contracts
- Annual vendor assessments
- Data processing agreements

### 3.8 Incident Management
- Incident response plan
- Reporting requirements
- Post-incident review

### 3.9 Business Continuity
- Business impact analysis
- Disaster recovery plan
- Annual DR testing

### 3.10 Compliance
- Regulatory requirements identified
- Compliance monitoring
- Internal audits

## 4. Enforcement

Violations may result in disciplinary action up to and including termination.

## 5. Exceptions

Exceptions require written approval from the CISO and must be documented.

## 6. Review

This policy will be reviewed annually and updated as needed.
```

#### 2. `docs/security/policies/acceptable-use-policy.md`

```markdown
# Acceptable Use Policy

**Version:** 1.0  
**Effective Date:** [Date]  

## 1. Purpose

Defines acceptable use of AIVO technology resources.

## 2. Acceptable Use

Users may:
- Use systems for authorized business purposes
- Access data required for their role
- Store business data in approved locations

## 3. Prohibited Activities

Users must not:
- Share credentials with others
- Access systems without authorization
- Install unauthorized software
- Transmit malware or malicious code
- Attempt to bypass security controls
- Use systems for personal gain
- Store sensitive data on personal devices

## 4. Data Handling

- Classify data appropriately
- Store data in approved locations
- Encrypt sensitive data
- Report data incidents immediately

## 5. Password Requirements

- Minimum 14 characters
- Mix of character types
- No password reuse (24 history)
- Password manager required

## 6. Remote Work

- Use VPN for access
- Secure home networks
- Lock screens when away
- No public Wi-Fi for sensitive work

## 7. Reporting

Report security concerns to security@aivo.edu
```

### Acceptance Criteria
- [ ] Information Security Policy
- [ ] Acceptable Use Policy
- [ ] Data Classification Policy
- [ ] Access Control Policy
- [ ] Incident Response Policy
- [ ] Business Continuity Policy
- [ ] Password Policy
- [ ] Remote Work Policy

---

## Chunk 8.7: Developer Security Training

**Time Estimate:** 8-10 hours  
**Priority:** P2 - Medium  
**Dependencies:** None

### Files to Create

#### 1. `docs/security/training/secure-coding-guide.md`

```markdown
# Secure Coding Guidelines for AIVO

## Introduction

This guide provides security best practices for AIVO developers.

## Authentication & Sessions

### Do
```typescript
// Use the AuthService for all authentication
const user = await this.authService.validateCredentials(email, password);

// Always hash passwords with Argon2id
const hash = await this.hashingService.hash(password);

// Use short-lived tokens
const token = await this.tokenService.generateToken(user, { expiresIn: '15m' });
```

### Don't
```typescript
// Never compare passwords directly
if (user.password === inputPassword) { } // WRONG

// Never log credentials
logger.log(`Login attempt: ${email}:${password}`); // WRONG

// Never expose tokens in URLs
redirect(`/callback?token=${token}`); // WRONG
```

## Input Validation

### Do
```typescript
// Use DTOs with class-validator
class CreateUserDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @MinLength(14)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  password: string;
}

// Sanitize output
const sanitized = this.sanitizer.sanitize(userInput);
```

### Don't
```typescript
// Never trust user input
const query = `SELECT * FROM users WHERE id = ${userId}`; // SQL Injection!

// Never render unsanitized HTML
res.send(`<div>${userInput}</div>`); // XSS!
```

## Authorization

### Do
```typescript
// Always check authorization
@Permissions(['read:student'])
async getStudent(@Param('id') id: string, @Request() req) {
  // Verify user has access to this specific student
  await this.authzService.verifyAccess(req.user, 'student', id);
  return this.studentService.findOne(id);
}
```

### Don't
```typescript
// Never skip authorization checks
async getStudent(@Param('id') id: string) {
  return this.studentService.findOne(id); // Missing authz!
}
```

## Data Protection

### Do
```typescript
// Encrypt sensitive data
const encrypted = await this.encryptionService.encrypt(sensitiveData);

// Mask PII in logs
logger.log(`User created: ${maskEmail(user.email)}`);

// Use parameterized queries
await prisma.user.findMany({
  where: { email: { equals: email } }
});
```

### Don't
```typescript
// Never log sensitive data
logger.log(`Credit card: ${cardNumber}`); // WRONG

// Never store plaintext secrets
const apiKey = 'sk_live_abc123'; // WRONG
```

## Error Handling

### Do
```typescript
// Return generic error messages
throw new UnauthorizedException('Invalid credentials');

// Log detailed errors internally
this.logger.error('Login failed', { 
  userId: user?.id,
  error: error.message,
  // Never log passwords
});
```

### Don't
```typescript
// Never expose internal errors
throw new Error(`Database error: ${dbError.message}`); // WRONG

// Never include stack traces in responses
res.status(500).json({ stack: error.stack }); // WRONG
```

## Dependencies

### Do
```typescript
// Keep dependencies updated
// Run: pnpm audit fix

// Use lockfiles
// Commit: pnpm-lock.yaml

// Review new dependencies
// Check: npm.io, Snyk advisories
```

### Don't
```typescript
// Never use vulnerable packages
// Never disable security audits
// Never ignore security warnings
```

## Code Review Security Checklist

- [ ] Input validated and sanitized
- [ ] Output encoded properly
- [ ] Authentication required where needed
- [ ] Authorization checks in place
- [ ] Sensitive data encrypted
- [ ] Logging doesn't include PII
- [ ] Error handling is secure
- [ ] Dependencies are current
- [ ] Tests include security cases
```

#### 2. `docs/security/training/owasp-top-10-guide.md`

```markdown
# OWASP Top 10 Guide for AIVO

## A01: Broken Access Control

**Risk:** Users acting outside intended permissions

**Prevention in AIVO:**
- Use `@Permissions()` decorator on all endpoints
- Implement `AuthorizationGuard` for resource access
- Verify ownership before operations
- Log access control failures

## A02: Cryptographic Failures

**Risk:** Exposure of sensitive data

**Prevention in AIVO:**
- Encrypt PII with AES-256-GCM
- Use TLS 1.3 for all connections
- Hash passwords with Argon2id
- Manage keys with AWS KMS

## A03: Injection

**Risk:** Hostile data sent to interpreter

**Prevention in AIVO:**
- Use Prisma ORM (parameterized queries)
- Validate all input with class-validator
- Sanitize user content with DOMPurify
- Use `RequestSanitizationMiddleware`

## A04: Insecure Design

**Risk:** Missing security controls by design

**Prevention in AIVO:**
- Security in architecture reviews
- Threat modeling for new features
- Secure defaults in frameworks
- Defense in depth approach

## A05: Security Misconfiguration

**Risk:** Insecure default configurations

**Prevention in AIVO:**
- Security headers via Helmet
- Disable debug in production
- Remove default credentials
- Automated security scanning

## A06: Vulnerable Components

**Risk:** Using vulnerable libraries

**Prevention in AIVO:**
- Daily Snyk scans
- pnpm audit in CI/CD
- Dependabot updates
- Component inventory

## A07: Authentication Failures

**Risk:** Compromised user identity

**Prevention in AIVO:**
- Rate limiting on auth endpoints
- Account lockout after failures
- MFA for sensitive operations
- Secure session management

## A08: Software & Data Integrity

**Risk:** Code and data modifications

**Prevention in AIVO:**
- Code signing in CI/CD
- Integrity checks on assets
- Secure update mechanism
- CSP headers

## A09: Security Logging & Monitoring

**Risk:** Insufficient logging for detection

**Prevention in AIVO:**
- Structured audit logging
- Real-time alerting
- Log integrity protection
- Incident detection rules

## A10: Server-Side Request Forgery

**Risk:** Server making unintended requests

**Prevention in AIVO:**
- URL validation and allowlisting
- Network segmentation
- Disable unnecessary protocols
- Validate redirect URLs
```

### Acceptance Criteria
- [ ] Secure coding guide
- [ ] OWASP Top 10 guide
- [ ] Security onboarding checklist
- [ ] Code review security checklist
- [ ] Vulnerability reporting guide
- [ ] Security testing guide
- [ ] Incident response training
- [ ] Compliance training materials

---

## Phase 8 Summary

| Chunk | Description | Time | Priority |
|-------|-------------|------|----------|
| 8.1 | Vulnerability Scanning | 6-8h | P2 |
| 8.2 | Security Test Suite | 8-10h | P2 |
| 8.3 | API Security Testing | 6-8h | P2 |
| 8.4 | Incident Playbooks | 6-8h | P2 |
| 8.5 | Compliance Docs | 8-10h | P2 |
| 8.6 | Security Policies | 6-8h | P2 |
| 8.7 | Developer Training | 8-10h | P2 |

**Total Phase 8 Time:** 48-62 hours

---

## Complete Implementation Timeline

| Phase | Duration | Team Size | Dependencies |
|-------|----------|-----------|--------------|
| 1 | 16-22h | 1-2 devs | None |
| 2 | 20-28h | 2 devs | Phase 1 |
| 3 | 18-26h | 2 devs | Phase 1 |
| 4 | 16-22h | 1-2 devs | Phase 3 |
| 5 | 18-26h | 2 devs | Phase 1-3 |
| 6 | 18-24h | 2 devs | Phase 1-3 |
| 7 | 24-31h | 1-2 devs | None (infra) |
| 8 | 48-62h | 2-3 devs | Phases 1-5 |

**Total:** ~178-241 hours (~5-7 weeks with 2-3 developers)

**Parallelization Options:**
- Phases 1, 7 can run in parallel
- Phases 2-3 can run in parallel (after Phase 1)
- Phases 4-6 can run in parallel (after Phases 1-3)
- Phase 8 runs throughout, documentation updated as phases complete
