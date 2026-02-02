# AIVO Testing Guidelines

This document provides guidelines for writing tests across the AIVO monorepo, covering both Node.js (TypeScript) and Python services.

## Table of Contents

- [Coverage Requirements](#coverage-requirements)
- [Node.js Services Testing](#nodejs-services-testing)
- [Python Services Testing](#python-services-testing)
- [Mocking Strategies](#mocking-strategies)
- [Test Patterns](#test-patterns)
- [CI Integration](#ci-integration)

---

## Coverage Requirements

| Metric              | Requirement                 |
| ------------------- | --------------------------- |
| Overall Coverage    | ≥80%                        |
| Per-Service Minimum | ≥75%                        |
| Critical Services   | **MUST** meet 75% threshold |

### Critical Services (CI will fail if below threshold)

- `auth-svc` - Authentication and authorization
- `billing-svc` - Billing and subscription management
- `payments-svc` - Payment processing (M-Pesa, etc.)
- `profile-svc` - Learner profile and PII management
- `assessment-svc` - Assessment delivery
- `grading-engine` - AI-powered grading
- `legal-hold-svc` - Legal compliance
- `ai-orchestrator` - AI coordination
- `ai-inference-svc` - ML model inference

---

## Node.js Services Testing

### Framework: Vitest

All Node.js services use [Vitest](https://vitest.dev/) for testing.

### Directory Structure

```
services/my-svc/
├── src/
│   ├── services/
│   │   └── myService.ts
│   └── routes/
│       └── myRoutes.ts
├── __tests__/                    # or test/
│   ├── myService.test.ts
│   └── myRoutes.test.ts
├── vitest.config.ts
└── package.json
```

### Basic Test Template

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock external dependencies BEFORE importing the module under test
vi.mock('../src/prisma.js', () => ({
  prisma: mockPrisma,
}));

import { myFunction } from '../src/services/myService.js';

describe('MyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('myFunction', () => {
    it('should do something', async () => {
      // Arrange
      const input = { ... };
      mockPrisma.myModel.findMany.mockResolvedValue([]);

      // Act
      const result = await myFunction(input);

      // Assert
      expect(result).toEqual([]);
      expect(mockPrisma.myModel.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ tenantId: input.tenantId }),
      });
    });
  });
});
```

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts', '**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      exclude: ['node_modules/**', 'dist/**', 'generated/**', '**/*.test.ts', '**/*.config.ts'],
      thresholds: {
        global: {
          statements: 75,
          branches: 70,
          functions: 75,
          lines: 75,
        },
      },
    },
  },
});
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## Python Services Testing

### Framework: pytest

All Python services use [pytest](https://pytest.org/) with pytest-asyncio for async tests.

### Directory Structure

```
services/brain-engine/
├── app/
│   ├── services/
│   │   └── brain_manager.py
│   └── routes/
│       └── brain_routes.py
├── tests/
│   ├── __init__.py
│   ├── conftest.py           # Shared fixtures
│   ├── test_brain_manager.py
│   └── test_brain_routes.py
├── requirements.txt
└── pyproject.toml
```

### Basic Test Template

```python
"""
My Service Tests
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.my_service import MyService


class TestMyService:
    """Tests for MyService."""

    @pytest.fixture
    def mock_client(self):
        """Create mock Supabase client."""
        client = MagicMock()
        client.table.return_value.select.return_value.eq.return_value.execute = AsyncMock(
            return_value=MagicMock(data=[])
        )
        return client

    @pytest.fixture
    def service(self, mock_client):
        """Create service instance with mocked dependencies."""
        return MyService(client=mock_client)

    @pytest.mark.asyncio
    async def test_get_data(self, service, mock_client):
        """Test getting data."""
        # Arrange
        mock_data = [{"id": "1", "name": "Test"}]
        mock_client.table.return_value.select.return_value.eq.return_value.execute = AsyncMock(
            return_value=MagicMock(data=mock_data)
        )

        # Act
        result = await service.get_data("tenant-1", "item-1")

        # Assert
        assert result == mock_data[0]
        mock_client.table.assert_called_with("my_table")
```

### Pytest Configuration

```toml
# pyproject.toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
addopts = "-v --tb=short"

[tool.coverage.run]
source = ["app"]
omit = ["tests/*", "**/__pycache__/*"]

[tool.coverage.report]
fail_under = 75
show_missing = true
```

---

## Mocking Strategies

### Prisma Client (Node.js)

```typescript
// Create mock before any imports
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  $transaction: vi.fn((callback) => callback(mockPrisma)),
};

vi.mock('../src/prisma.js', () => ({
  prisma: mockPrisma,
  Prisma: {
    JsonNull: null,
    InputJsonValue: {},
  },
}));
```

### Supabase Client (Python)

```python
from unittest.mock import AsyncMock, MagicMock

def create_mock_supabase():
    """Create a mock Supabase client."""
    client = MagicMock()

    # Mock table operations
    table_mock = MagicMock()
    client.table.return_value = table_mock

    # Mock chainable query builder
    table_mock.select.return_value = table_mock
    table_mock.insert.return_value = table_mock
    table_mock.update.return_value = table_mock
    table_mock.delete.return_value = table_mock
    table_mock.eq.return_value = table_mock
    table_mock.neq.return_value = table_mock
    table_mock.in_.return_value = table_mock
    table_mock.order.return_value = table_mock
    table_mock.limit.return_value = table_mock
    table_mock.range.return_value = table_mock

    # Mock execute
    table_mock.execute = AsyncMock(return_value=MagicMock(data=[], count=0))

    return client
```

### External HTTP Services

```typescript
// Node.js - Mock fetch or axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// In tests
import axios from 'axios';
(axios.get as Mock).mockResolvedValue({ data: { ... } });
```

```python
# Python - Mock httpx or aiohttp
from unittest.mock import patch, AsyncMock

@patch('httpx.AsyncClient.get')
async def test_external_call(mock_get):
    mock_get.return_value = AsyncMock(
        status_code=200,
        json=AsyncMock(return_value={"data": "test"})
    )
    # ... test code
```

---

## Test Patterns

### 1. Arrange-Act-Assert (AAA)

```typescript
it('should calculate total correctly', async () => {
  // Arrange - Set up test data and mocks
  const items = [{ price: 10 }, { price: 20 }];
  mockPrisma.item.findMany.mockResolvedValue(items);

  // Act - Execute the function under test
  const total = await calculateTotal('tenant-1');

  // Assert - Verify the results
  expect(total).toBe(30);
});
```

### 2. Testing Error Handling

```typescript
it('should throw error when item not found', async () => {
  mockPrisma.item.findUnique.mockResolvedValue(null);

  await expect(getItem('tenant-1', 'nonexistent')).rejects.toThrow('Item not found');
});
```

### 3. Testing Tenant Isolation

```typescript
it('should always filter by tenantId', async () => {
  mockPrisma.user.findMany.mockResolvedValue([]);

  await listUsers('tenant-A');

  expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
    where: expect.objectContaining({
      tenantId: 'tenant-A',
    }),
  });
});
```

### 4. Testing Pagination

```typescript
describe('pagination', () => {
  it('should apply correct skip and take', async () => {
    mockPrisma.item.findMany.mockResolvedValue([]);
    mockPrisma.item.count.mockResolvedValue(100);

    const result = await listItems('tenant-1', { page: 3, pageSize: 10 });

    expect(mockPrisma.item.findMany).toHaveBeenCalledWith({
      where: expect.any(Object),
      skip: 20, // (3-1) * 10
      take: 10,
    });
    expect(result.pagination.totalPages).toBe(10);
  });
});
```

### 5. Testing Audit Logging

```typescript
it('should create audit log entry', async () => {
  mockPrisma.sensitiveData.update.mockResolvedValue({ id: '1' });
  mockPrisma.auditLog.create.mockResolvedValue({});

  await updateSensitiveData('tenant-1', 'data-1', { value: 'new' }, context);

  expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      action: 'UPDATE',
      entityId: 'data-1',
      userId: context.userId,
    }),
  });
});
```

---

## CI Integration

### GitHub Actions Workflow

The coverage is enforced via `.github/workflows/coverage.yml`:

1. **Node.js Coverage Job**
   - Runs `pnpm test:coverage`
   - Uploads to Codecov
   - Runs threshold checks

2. **Python Coverage Job**
   - Finds all Python services with tests
   - Runs `pytest --cov` per service
   - Uploads to Codecov

3. **Coverage Gate Job**
   - Verifies all critical services meet 75%
   - Posts summary comment on PRs

### Running Coverage Locally

```bash
# Node.js services (from monorepo root)
pnpm test:coverage

# Check thresholds
pnpm test:coverage:check

# Python service (from service directory)
cd services/brain-engine
python -m pytest tests/ --cov=app --cov-report=term-missing
```

### Codecov Integration

Coverage reports are aggregated in [Codecov](https://codecov.io). See `codecov.yml` for:

- Per-component coverage tracking
- PR comment configuration
- Ignore patterns

---

## Best Practices

1. **Write tests before fixing bugs** - Prevents regressions
2. **Test edge cases** - Empty arrays, null values, boundary conditions
3. **Use meaningful test names** - `should return empty array when no items match`
4. **Keep tests independent** - Use `beforeEach` to reset state
5. **Mock external dependencies** - Database, HTTP, file system
6. **Test tenant isolation** - Every query should filter by tenantId
7. **Test error handling** - Verify proper error messages and HTTP status codes
8. **Avoid testing implementation details** - Focus on behavior, not internals

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [pytest Documentation](https://docs.pytest.org/)
- [Testing Library](https://testing-library.com/)
- [Codecov Documentation](https://docs.codecov.com/)
