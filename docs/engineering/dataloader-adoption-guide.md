# DataLoader Adoption Guide

> **Last Updated**: 2026-01-20  
> **Status**: Active  
> **Package**: `@aivo/ts-api-utils`

## Why DataLoader?

The N+1 query problem is one of the most common performance issues in backend services:

1. You fetch N items (1 query)
2. For each item, you fetch related data (N queries)
3. Result: N+1 total queries

**Example without DataLoader:**
```typescript
// 1 query to get 100 learning objects
const learningObjects = await prisma.learningObject.findMany({ take: 100 });

// 100 queries to get each author! ❌
for (const lo of learningObjects) {
  const author = await prisma.user.findUnique({ where: { id: lo.authorId } });
}
```

**With DataLoader:**
```typescript
// 1 query to get learning objects
const learningObjects = await prisma.learningObject.findMany({ take: 100 });

// 1 batched query for all authors! ✅
const authors = await loaders.userById.loadMany(learningObjects.map(lo => lo.authorId));
```

DataLoader solves this by:
- **Batching**: Collecting all IDs requested in a single tick of the event loop
- **Caching**: Storing results to avoid duplicate queries within a request
- **Request Scoping**: Fresh instances per request to prevent cache leaks

## Installation

The DataLoader implementation is already included in `@aivo/ts-api-utils`:

```typescript
import {
  createDataLoader,
  createIdLoader,
  createRelationLoader,
  createPrismaLoader,
  createTenantScopedLoader,
  DataLoaderFactory,
  LRUCache,
  TTLCache,
} from '@aivo/ts-api-utils';
```

## Usage Patterns

### Pattern 1: Simple ID-based Loader

```typescript
import { createIdLoader } from '@aivo/ts-api-utils';

// Create a loader for users
const userLoader = createIdLoader(
  async (ids: string[]) => {
    return prisma.user.findMany({
      where: { id: { in: ids } }
    });
  },
  { name: 'UserByIdLoader' }
);

// Use the loader
const user = await userLoader.load('user-123');
const users = await userLoader.loadMany(['user-1', 'user-2', 'user-3']);
```

### Pattern 2: Tenant-Scoped Loader

```typescript
import { createTenantScopedLoader } from '@aivo/ts-api-utils';

// Create a tenant-scoped loader (ensures data isolation)
const contentLoader = createTenantScopedLoader(
  prisma.learningObject,
  tenantId,
  { name: 'ContentByIdLoader' }
);

// Only returns content for the specified tenant
const content = await contentLoader.load('content-123');
```

### Pattern 3: Relation Loader (One-to-Many)

```typescript
import { createRelationLoader } from '@aivo/ts-api-utils';

// Load questions by assessment ID
const questionsByAssessmentLoader = createRelationLoader(
  async (assessmentIds: string[]) => {
    return prisma.assessmentQuestion.findMany({
      where: { assessmentId: { in: assessmentIds } }
    });
  },
  (question) => question.assessmentId,
  { name: 'QuestionsByAssessmentLoader' }
);

// Returns array of questions for each assessment
const questions = await questionsByAssessmentLoader.load('assessment-123');
```

### Pattern 4: DataLoader Factory (Request-Scoped)

```typescript
import { DataLoaderFactory, createPrismaLoader } from '@aivo/ts-api-utils';

// Define your loaders type
interface ServiceLoaders {
  userById: DataLoader<string, User>;
  contentById: DataLoader<string, LearningObject>;
}

// Create factory (singleton)
const loaderFactory = new DataLoaderFactory<ServiceLoaders>();

loaderFactory.register('userById', () => 
  createPrismaLoader(prisma.user, { name: 'UserLoader' })
);
loaderFactory.register('contentById', () => 
  createPrismaLoader(prisma.learningObject, { name: 'ContentLoader' })
);

// Per-request: create fresh loaders
fastify.addHook('preHandler', async (request) => {
  request.loaders = loaderFactory.createLoaders();
});
```

## Fastify Integration

### Step 1: Define DataLoaders

Create `src/dataloaders/index.ts`:

```typescript
import { createIdLoader, createRelationLoader } from '@aivo/ts-api-utils';
import { prisma } from '../prisma.js';

export function createServiceDataLoaders(tenantId?: string) {
  return {
    // Primary entity loaders
    contentById: createIdLoader(
      async (ids: string[]) => {
        const where: any = { id: { in: ids } };
        if (tenantId) where.tenantId = tenantId;
        return prisma.learningObject.findMany({ where });
      },
      { name: 'ContentByIdLoader' }
    ),

    // Relation loaders
    versionsByContentId: createRelationLoader(
      async (contentIds: string[]) => {
        return prisma.version.findMany({
          where: { learningObjectId: { in: contentIds } },
          orderBy: { versionNumber: 'desc' }
        });
      },
      (version) => version.learningObjectId,
      { name: 'VersionsByContentLoader' }
    ),
  };
}

export type ServiceDataLoaders = ReturnType<typeof createServiceDataLoaders>;
```

### Step 2: Add to Request Context

Update `src/types/fastify.d.ts`:

```typescript
import type { ServiceDataLoaders } from '../dataloaders';

declare module 'fastify' {
  interface FastifyRequest {
    loaders: ServiceDataLoaders;
  }
}
```

### Step 3: Register Hook

In your main app file:

```typescript
import { createServiceDataLoaders } from './dataloaders/index.js';

// Create fresh loaders per request
fastify.addHook('preHandler', async (request) => {
  const tenantId = request.user?.tenantId;
  request.loaders = createServiceDataLoaders(tenantId);
});
```

### Step 4: Use in Routes

```typescript
fastify.get('/learning-objects/:id/with-versions', async (request, reply) => {
  const { id } = request.params as { id: string };
  
  // These are automatically batched!
  const content = await request.loaders.contentById.load(id);
  const versions = await request.loaders.versionsByContentId.load(id);
  
  return { ...content, versions };
});
```

## Cache Strategies

### Default: Map Cache (Request-Scoped)
- Fresh cache per request
- Prevents cross-request data leaks
- **Use for**: Most cases

### LRU Cache (Long-lived)
- Limits memory usage
- Good for frequently accessed static data
- **Use for**: Reference data that rarely changes

```typescript
import { LRUCache, createDataLoader } from '@aivo/ts-api-utils';

const loader = createDataLoader(batchFn, {
  cacheMap: new LRUCache(1000), // Max 1000 entries
});
```

### TTL Cache (Time-based Expiry)
- Entries expire after duration
- **Use for**: Data that changes periodically

```typescript
import { TTLCache, createDataLoader } from '@aivo/ts-api-utils';

const loader = createDataLoader(batchFn, {
  cacheMap: new TTLCache(60000), // 60 second TTL
});
```

## Service-by-Service Adoption Checklist

| Service | Priority | Status | Key Loaders |
|---------|----------|--------|-------------|
| content-svc | P0 | ✅ | contentById, versionsByContentId, tagsByContentId |
| assessment-svc | P0 | ✅ | assessmentById, questionsByAssessmentId |
| profile-svc | P0 | ✅ | userById, learnerById, teacherById |
| gradebook-svc | P1 | ✅ | gradesByLearnerId, gradesByAssignmentId |
| notify-svc | P1 | ✅ | notificationsByUserId, preferencesByUserId |
| messaging-svc | P1 | ⬜ | conversationById, messagesByConversationId |
| analytics-svc | P2 | ⬜ | eventsBySessionId, sessionsByLearnerId |
| curriculum-svc | P2 | ⬜ | courseById, modulesByCourseId |
| gamification-svc | P2 | ⬜ | achievementById, progressByLearnerId |

## Testing DataLoaders

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createIdLoader } from '@aivo/ts-api-utils';

describe('UserLoader', () => {
  let batchFn: ReturnType<typeof vi.fn>;
  let loader: ReturnType<typeof createIdLoader>;

  beforeEach(() => {
    batchFn = vi.fn().mockResolvedValue([
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
    ]);
    loader = createIdLoader(batchFn, { name: 'TestLoader' });
  });

  it('batches multiple loads', async () => {
    // These happen in the same tick
    const [user1, user2] = await Promise.all([
      loader.load('1'),
      loader.load('2'),
    ]);

    // Should batch into single call
    expect(batchFn).toHaveBeenCalledTimes(1);
    expect(batchFn).toHaveBeenCalledWith(['1', '2']);
  });

  it('caches results', async () => {
    await loader.load('1');
    await loader.load('1');

    // Second load should use cache
    expect(batchFn).toHaveBeenCalledTimes(1);
  });

  it('returns null for missing items', async () => {
    batchFn.mockResolvedValue([null]);
    const result = await loader.load('missing');
    expect(result).toBeNull();
  });
});
```

## Performance Benchmarks

After DataLoader adoption, expect:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| DB queries (nested list) | O(N) | O(1) | 50-90% reduction |
| Response time (N items) | ~N * 10ms | ~50ms | Significant |
| DB connection usage | High | Low | Better pooling |

## Common Pitfalls

### ❌ Don't: Share loaders across requests
```typescript
// BAD - cache pollution!
const globalLoader = createIdLoader(batchFn);
app.get('/users/:id', (req) => globalLoader.load(req.params.id));
```

### ✅ Do: Create fresh loaders per request
```typescript
// GOOD - isolated caches
app.addHook('preHandler', (req) => {
  req.loaders = createServiceDataLoaders();
});
```

### ❌ Don't: Use loaders for writes
```typescript
// BAD - loaders are for reads only
await userLoader.load(userId); // mutate...
// Cache is now stale!
```

### ✅ Do: Clear cache after mutations
```typescript
// GOOD - invalidate cache
await prisma.user.update({ where: { id }, data: updates });
req.loaders.userById.clear(id);
```

## Migration Guide

1. **Add dataloaders directory** to your service
2. **Define loaders** based on your Prisma models
3. **Add request hook** to create loaders per request
4. **Replace direct Prisma calls** in nested/list scenarios
5. **Add tests** for each loader's batch function
6. **Monitor** query reduction in observability dashboards

## Resources

- [DataLoader GitHub](https://github.com/graphql/dataloader) - Original implementation
- [Prisma DataLoader](https://www.prisma.io/docs/guides/performance-and-optimization/query-optimization-performance) - Prisma optimization guide
- Internal: `packages/ts-api-utils/src/dataloader.ts` - AIVO implementation
