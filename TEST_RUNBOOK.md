# AIVO Platform - Test Runbook

**Version:** 1.0  
**Last Updated:** February 2, 2026  
**Purpose:** Practical guide for running, debugging, and maintaining tests  
**Audience:** Developers, QA Engineers, DevOps

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Running Unit Tests](#running-unit-tests)
3. [Running Integration Tests](#running-integration-tests)
4. [Running E2E Tests](#running-e2e-tests)
5. [Running Security Tests](#running-security-tests)
6. [Running Compliance Tests](#running-compliance-tests)
7. [Running Performance Tests](#running-performance-tests)
8. [Debugging Test Failures](#debugging-test-failures)
9. [Adding New Tests](#adding-new-tests)
10. [CI/CD Test Execution](#cicd-test-execution)
11. [Coverage Reports](#coverage-reports)
12. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.example .env.test

# Generate Prisma clients (if needed)
./scripts/prisma-generate-all.sh

# Start local services (optional for integration tests)
docker-compose -f docker-compose.services.yml up -d
```

### Run All Tests

```bash
# Run all tests (unit + integration)
pnpm run test

# Run with coverage
pnpm run test:coverage

# Run in watch mode (during development)
pnpm run test:watch
```

---

## Running Unit Tests

### Node.js/TypeScript Services

#### Run all unit tests for all Node services

```bash
pnpm run test
```

#### Run tests for a specific service

```bash
# Using pnpm filter
pnpm --filter @aivo/auth-svc test

# From service directory
cd services/auth-svc
pnpm test
```

#### Run specific test file

```bash
# Using pnpm filter
pnpm --filter @aivo/auth-svc test -- src/services/authService.test.ts

# From service directory
cd services/auth-svc
pnpm test src/services/authService.test.ts
```

#### Run tests matching a pattern

```bash
# Test files matching pattern
pnpm --filter @aivo/auth-svc test -- --grep "login"

# Run only tests with "should authenticate" in description
pnpm test -- --grep "should authenticate"
```

#### Watch mode (auto-rerun on file changes)

```bash
pnpm --filter @aivo/auth-svc test:watch

# Or with coverage
pnpm --filter @aivo/auth-svc test:watch --coverage
```

#### Generate coverage report

```bash
pnpm --filter @aivo/auth-svc test:coverage

# Coverage report locations:
# - services/auth-svc/coverage/lcov-report/index.html
# - services/auth-svc/coverage/lcov.info
```

---

### Python Services

#### Run all Python tests

```bash
# From project root
./scripts/test-python-services.sh

# Or manually for each service
cd services/writing-assessment-svc
pytest
```

#### Run tests for a specific Python service

```bash
cd services/writing-assessment-svc
pytest

# With coverage
pytest --cov=app --cov-report=html --cov-report=term
```

#### Run specific test file

```bash
cd services/writing-assessment-svc
pytest tests/test_writing_scorer.py
```

#### Run specific test function

```bash
pytest tests/test_writing_scorer.py::test_score_essay
```

#### Run tests matching a pattern

```bash
# Tests with "authentication" in name
pytest -k "authentication"

# Tests marked with specific marker
pytest -m "slow"
pytest -m "integration"
```

#### Verbose output with print statements

```bash
pytest -v -s
```

#### Generate coverage report

```bash
pytest --cov=app --cov-report=html --cov-report=term-missing

# Coverage report location:
# - htmlcov/index.html
```

#### Run with parallel execution

```bash
# Install pytest-xdist first
pip install pytest-xdist

# Run with 4 workers
pytest -n 4
```

---

### Flutter/Dart Apps

#### Run Flutter tests

```bash
cd apps/mobile-learner
flutter test

# With coverage
flutter test --coverage

# Run specific test file
flutter test test/widgets/lesson_card_test.dart
```

#### Run integration tests

```bash
cd apps/mobile-learner
flutter test integration_test/
```

---

## Running Integration Tests

Integration tests verify interactions between multiple services.

### Prerequisites

Start required services:

```bash
# Start databases and dependencies
docker-compose -f docker-compose.services.yml up -d

# Verify services are healthy
docker-compose ps
```

### Run all integration tests

```bash
pnpm run test:integration

# Or from tests directory
cd tests/integration
pnpm test
```

### Run specific integration test scenario

```bash
# Learner journey
pnpm test -- scenarios/learner-journey.integration.spec.ts

# Teacher workflow
pnpm test -- scenarios/teacher-workflow.integration.spec.ts

# Payment flow
pnpm test -- scenarios/payment-flow.integration.spec.ts
```

### Run with real services (not mocked)

```bash
# Ensure services are running
docker-compose up -d

# Set environment for real services
INTEGRATION_MODE=real pnpm run test:integration
```

### Debugging integration tests

```bash
# Run with debug output
DEBUG=* pnpm run test:integration

# Run specific scenario with increased timeout
pnpm test -- --testTimeout=60000 scenarios/payment-flow.integration.spec.ts
```

---

## Running E2E Tests

E2E tests validate complete user journeys through the UI.

### Web E2E Tests (Playwright)

#### Prerequisites

```bash
# Install Playwright browsers
npx playwright install

# Optional: Install system dependencies
npx playwright install-deps
```

#### Run all E2E tests

```bash
pnpm run test:e2e

# Or using Playwright directly
cd tests/e2e
npx playwright test
```

#### Run in specific browser

```bash
# Chromium only
npx playwright test --project=chromium

# Firefox only
npx playwright test --project=firefox

# WebKit/Safari only
npx playwright test --project=webkit
```

#### Run specific test file

```bash
npx playwright test complete-user-flows.spec.ts

# Run specific test by title
npx playwright test -g "should complete learner lesson journey"
```

#### Run in headed mode (see browser)

```bash
npx playwright test --headed

# With slow motion for debugging
npx playwright test --headed --slow-mo=1000
```

#### Debug mode (step through tests)

```bash
npx playwright test --debug

# Debug specific test
npx playwright test --debug authentication-security.spec.ts
```

#### Run with UI mode (interactive)

```bash
npx playwright test --ui
```

#### Generate test report

```bash
# Run tests and generate HTML report
npx playwright test --reporter=html

# Open report
npx playwright show-report
```

#### Update snapshots

```bash
npx playwright test --update-snapshots
```

---

### Mobile E2E Tests (Patrol/Flutter)

#### Prerequisites

```bash
cd apps/mobile-learner

# Install dependencies
flutter pub get

# Start emulator/simulator or connect device
flutter devices
```

#### Run Patrol integration tests

```bash
cd apps/mobile-learner

# Run on connected device/emulator
flutter test integration_test/

# Run on specific device
flutter test integration_test/ -d <device-id>

# With verbose output
flutter test integration_test/ --verbose
```

#### Run with native automation

```bash
# Android
patrol test -t integration_test/app_test.dart

# iOS
patrol test --ios -t integration_test/app_test.dart
```

---

## Running Security Tests

### Authentication & Authorization Tests

```bash
# Run auth service security tests
pnpm --filter @aivo/auth-svc test -- test/security.test.ts

# Run all security tests
pnpm test -- --grep "security"
```

### Dependency Vulnerability Scanning

```bash
# Scan Node.js dependencies
pnpm audit

# Scan Python dependencies (OSV-Scanner)
osv-scanner scan --lockfile=services/writing-assessment-svc/requirements.txt

# Scan with Trivy
trivy fs . --severity HIGH,CRITICAL
```

### Container Security Scanning

```bash
# Scan Docker image
trivy image aivo/auth-svc:latest

# Scan with specific severity
trivy image --severity CRITICAL aivo/auth-svc:latest
```

### SQL Injection & XSS Tests

```bash
# Run input validation tests
pnpm test -- --grep "input validation"
pnpm test -- --grep "SQL injection"
pnpm test -- --grep "XSS"
```

---

## Running Compliance Tests

### COPPA Compliance Tests

```bash
# Run COPPA-specific tests
pnpm test -- --grep "COPPA"

# Verify parental consent flows
pnpm --filter @aivo/auth-svc test -- --grep "parental consent"

# AI safety tests for minors
pnpm --filter @aivo/ai-orchestrator test -- --grep "minor safety"
```

### FERPA Compliance Tests

```bash
# Run FERPA data protection tests
pnpm test -- --grep "FERPA"

# Verify PII protection
pnpm test -- --grep "PII"

# Test student data privacy
pnpm --filter @aivo/profile-svc test -- --grep "student privacy"
```

### Accessibility (WCAG 2.1 AA) Tests

```bash
# Run accessibility E2E tests
cd tests/e2e
npx playwright test accessibility.spec.ts

# Run with axe-core
pnpm test -- --grep "accessibility"

# Generate accessibility report
npx playwright test accessibility.spec.ts --reporter=html
```

---

## Running Performance Tests

### Load Testing (K6)

#### Prerequisites

```bash
# Install K6
# macOS
brew install k6

# Windows
choco install k6

# Linux
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

#### Run load tests

```bash
cd tests/performance

# Basic load test
k6 run load-tests/learner-dashboard.js

# With custom parameters
k6 run --vus 100 --duration 60s load-tests/ai-tutor.js

# Generate report
k6 run --out json=results.json load-tests/assessment-delivery.js
```

#### Stress testing

```bash
# Gradually increase load
k6 run stress-tests/spike-test.js

# Sustained high load
k6 run --vus 500 --duration 300s stress-tests/sustained-load.js
```

---

## Debugging Test Failures

### General Debugging Strategies

#### 1. Run Failed Test in Isolation

```bash
# Node.js/TypeScript
pnpm test -- src/services/authService.test.ts

# Python
pytest tests/test_auth_service.py::test_login_with_invalid_credentials

# Playwright
npx playwright test --debug authentication-security.spec.ts
```

#### 2. Enable Verbose Logging

```bash
# Node.js with debug
DEBUG=* pnpm test

# Python with verbose output
pytest -v -s

# Playwright with trace
npx playwright test --trace on
```

#### 3. Inspect Test State

```typescript
// Add console.log or debugger statements
it('should authenticate user', async () => {
  const result = await authService.login(credentials);
  console.log('Login result:', result); // Inspect result
  expect(result).toBeDefined();
});
```

#### 4. Use Debugger

```bash
# Node.js with debugger
node --inspect-brk node_modules/.bin/vitest run

# Python with debugger
pytest --pdb  # Drop into debugger on failure

# Playwright debug mode
npx playwright test --debug
```

---

### Common Failure Patterns

#### Database Connection Errors

```bash
# Verify database is running
docker-compose ps postgres

# Check connection string
echo $DATABASE_URL

# Reset test database
pnpm run db:reset:test
```

#### Timeout Errors

```typescript
// Increase timeout for slow operations
it('should process large file', async () => {
  // ... test code
}, { timeout: 30000 }); // 30 seconds

// Or configure globally
vitest.config.ts:
export default defineConfig({
  test: {
    testTimeout: 10000
  }
});
```

#### Flaky Tests (Intermittent Failures)

```bash
# Run test multiple times to reproduce
pnpm test -- --repeat 10 src/services/flaky.test.ts

# Python
pytest --count=10 tests/test_flaky.py

# Identify and fix race conditions
# - Add proper await statements
# - Use waitFor utilities
# - Fix timing dependencies
```

#### Mock/Stub Issues

```typescript
// Verify mock is called correctly
it('should call external API', async () => {
  const mockApi = vi.fn();

  await service.fetchData();

  expect(mockApi).toHaveBeenCalledWith(expectedParams);
  expect(mockApi).toHaveBeenCalledTimes(1);
});
```

---

### Playwright-Specific Debugging

#### View trace files

```bash
# Generate trace
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

#### Take screenshots on failure

```typescript
test('should display dashboard', async ({ page }) => {
  await page.goto('/dashboard');

  // Take screenshot
  await page.screenshot({ path: 'dashboard.png' });

  await expect(page.locator('.dashboard')).toBeVisible();
});
```

#### Record video

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    video: 'retain-on-failure',
  },
});
```

---

## Adding New Tests

### Adding Unit Tests

#### Node.js/TypeScript Service

**1. Create test file alongside source:**

```typescript
// services/my-svc/src/services/myService.ts
export class MyService {
  async doSomething(input: string): Promise<string> {
    return `Processed: ${input}`;
  }
}

// services/my-svc/src/services/myService.test.ts
import { describe, it, expect } from 'vitest';
import { MyService } from './myService';

describe('MyService', () => {
  describe('doSomething', () => {
    it('should process input correctly', async () => {
      const service = new MyService();
      const result = await service.doSomething('test');

      expect(result).toBe('Processed: test');
    });

    it('should handle empty input', async () => {
      const service = new MyService();
      const result = await service.doSomething('');

      expect(result).toBe('Processed: ');
    });
  });
});
```

**2. Run the test:**

```bash
pnpm --filter @aivo/my-svc test
```

---

#### Python Service

**1. Create test file in tests directory:**

```python
# services/my-svc/app/services/my_service.py
class MyService:
    def do_something(self, input_str: str) -> str:
        return f"Processed: {input_str}"

# services/my-svc/tests/test_my_service.py
import pytest
from app.services.my_service import MyService

@pytest.fixture
def service():
    return MyService()

def test_do_something_processes_input_correctly(service):
    result = service.do_something("test")
    assert result == "Processed: test"

def test_do_something_handles_empty_input(service):
    result = service.do_something("")
    assert result == "Processed: "
```

**2. Run the test:**

```bash
cd services/my-svc
pytest tests/test_my_service.py
```

---

### Adding Integration Tests

**1. Create integration test in tests/integration/scenarios:**

```typescript
// tests/integration/scenarios/my-workflow.integration.spec.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestEnvironment, cleanupTestEnvironment } from '../helpers';

describe('Integration: My Workflow', () => {
  beforeAll(async () => {
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await cleanupTestEnvironment();
  });

  it('should complete end-to-end workflow', async () => {
    // Arrange: Setup test data
    const user = await createTestUser();
    const resource = await createTestResource();

    // Act: Execute workflow
    const result = await executeWorkflow(user, resource);

    // Assert: Verify outcomes
    expect(result.status).toBe('completed');
    expect(result.steps).toHaveLength(3);
  });
});
```

**2. Run the test:**

```bash
pnpm run test:integration -- scenarios/my-workflow.integration.spec.ts
```

---

### Adding E2E Tests

**1. Create E2E test in tests/e2e:**

```typescript
// tests/e2e/my-user-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('My User Flow', () => {
  test('should complete user journey', async ({ page }) => {
    // Navigate to page
    await page.goto('/my-feature');

    // Interact with UI
    await page.fill('[data-testid="input-field"]', 'test data');
    await page.click('[data-testid="submit-button"]');

    // Verify outcome
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="result"]')).toContainText('Expected result');
  });
});
```

**2. Run the test:**

```bash
cd tests/e2e
npx playwright test my-user-flow.spec.ts
```

---

### Adding Security Tests

```typescript
// services/auth-svc/test/security.test.ts
import { describe, it, expect } from 'vitest';

describe('Security: Input Validation', () => {
  it('should prevent SQL injection', async () => {
    const maliciousInput = "'; DROP TABLE users; --";

    await expect(authService.login({ username: maliciousInput, password: 'test' })).rejects.toThrow(
      'Invalid input'
    );
  });

  it('should sanitize XSS attempts', async () => {
    const xssInput = '<script>alert("XSS")</script>';

    const result = await profileService.updateBio(xssInput);

    expect(result.bio).not.toContain('<script>');
    expect(result.bio).toContain('&lt;script&gt;');
  });
});
```

---

## CI/CD Test Execution

### GitHub Actions Workflow

Tests run automatically on:

- **Pull Requests:** Unit + Integration + Security
- **Main Branch:** All tests including E2E
- **Nightly:** Full test suite + Performance

### Viewing CI Test Results

```bash
# Check latest CI run
gh run list

# View specific run
gh run view <run-id>

# Download test artifacts
gh run download <run-id>
```

### Running Tests Locally Like CI

```bash
# Run all checks like CI
pnpm run verify-all

# This runs:
# - Linting
# - Type checking
# - Unit tests
# - Integration tests
# - Build
```

---

## Coverage Reports

### Generate Local Coverage Report

```bash
# Node.js services
pnpm run test:coverage

# Open HTML report
open coverage/lcov-report/index.html  # macOS
start coverage/lcov-report/index.html  # Windows

# Python services
cd services/my-python-svc
pytest --cov=app --cov-report=html
open htmlcov/index.html  # macOS
```

### View Coverage in CI

1. Push code to GitHub
2. Coverage workflow runs automatically
3. Results uploaded to Codecov
4. View at: https://codecov.io/gh/your-org/aivo

### Check Coverage Thresholds

```bash
# Check if coverage meets thresholds
node scripts/check-coverage.js

# This will fail if any service is below threshold
```

---

## Troubleshooting

### Test Database Issues

```bash
# Reset test database
pnpm run db:reset:test

# Manually recreate
dropdb aivo_test
createdb aivo_test
pnpm run db:migrate:test
```

### Port Conflicts

```bash
# Check if port is in use
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process using port
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

### Dependency Issues

```bash
# Clear pnpm cache and reinstall
pnpm store prune
rm -rf node_modules
pnpm install

# Python virtual environment
deactivate
rm -rf .venv
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Playwright Issues

```bash
# Reinstall browsers
npx playwright install --force

# Clear cache
rm -rf ~/.cache/ms-playwright

# Update Playwright
pnpm update @playwright/test
```

---

## Best Practices

### Test Organization

✅ **DO:**

- Group related tests in `describe` blocks
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Clean up resources in `afterEach`/`afterAll`

❌ **DON'T:**

- Write interdependent tests
- Use hard-coded IDs or values
- Skip cleanup
- Test multiple things in one test

### Performance

✅ **DO:**

- Run tests in parallel when possible
- Use test.concurrent for independent tests
- Mock expensive operations
- Share setup between tests

❌ **DON'T:**

- Make real API calls in unit tests
- Create database records unnecessarily
- Sleep/wait with fixed timeouts
- Run E2E tests for unit-testable logic

---

## Quick Reference

### Common Commands

```bash
# Unit tests
pnpm test                                    # All unit tests
pnpm --filter @aivo/my-svc test             # Specific service
pnpm test:watch                             # Watch mode
pnpm test:coverage                          # With coverage

# Integration tests
pnpm run test:integration                   # All integration tests

# E2E tests
pnpm run test:e2e                           # All E2E tests
npx playwright test                         # Playwright directly
npx playwright test --ui                    # Interactive mode

# Coverage
pnpm run test:coverage                      # Generate coverage
node scripts/check-coverage.js              # Check thresholds

# CI checks
pnpm run verify-all                         # Run all CI checks
```

---

## Support

### Getting Help

- **Slack:** #qa-engineering
- **Documentation:** [TEST_STRATEGY.md](./TEST_STRATEGY.md)
- **Team:** QA Engineering Team

### Reporting Issues

Create issue with:

- Test command that failed
- Error message
- Environment (OS, Node version, etc.)
- Steps to reproduce

---

**Last Updated:** February 2, 2026  
**Maintained By:** QA Engineering Team  
**Version:** 1.0
