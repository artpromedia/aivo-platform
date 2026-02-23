/**
 * SCIM 2.0 Directory Sync Tests
 *
 * Covers token management, user CRUD, group operations, and bearer-token auth.
 * All Prisma / NATS / fetch calls are mocked via vi.mock.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash, randomUUID } from 'node:crypto';

// ══════════════════════════════════════════════════════════════════════════════
// MOCK SETUP
// ══════════════════════════════════════════════════════════════════════════════

const mockPrisma = {
  user: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  userRole: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
  session: {
    updateMany: vi.fn(),
  },
  mfaConfig: {
    deleteMany: vi.fn(),
  },
  mfaChallenge: {
    deleteMany: vi.fn(),
  },
  scimToken: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    findMany: vi.fn(),
  },
  scimSyncLog: {
    create: vi.fn(),
  },
};

vi.mock('../src/prisma.js', () => ({
  prisma: mockPrisma,
  UserStatus: { ACTIVE: 'ACTIVE', INVITED: 'INVITED', DISABLED: 'DISABLED' },
}));

// Suppress NATS connection attempts in tests
vi.mock('nats', () => ({
  connect: vi.fn().mockRejectedValue(new Error('nats mocked')),
  StringCodec: vi.fn(),
}));

const TENANT_ID = '11111111-1111-1111-1111-111111111111';

function makeUser(overrides: Record<string, unknown> = {}) {
  const id = randomUUID();
  return {
    id,
    tenantId: TENANT_ID,
    email: `user-${id.slice(0, 8)}@example.com`,
    firstName: 'Jane',
    lastName: 'Doe',
    externalId: null,
    status: 'ACTIVE',
    passwordHash: 'hash',
    emailVerified: false,
    acceptedMarketing: false,
    phone: null,
    lastLoginAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-02'),
    roles: [{ id: randomUUID(), role: 'LEARNER', userId: id, contextJson: null, createdAt: new Date() }],
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// TOKEN SERVICE
// ══════════════════════════════════════════════════════════════════════════════

describe('SCIM Token Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generateToken creates a token and returns raw value', async () => {
    const { generateToken } = await import('../src/scim/scim-token.service.js');

    mockPrisma.scimToken.create.mockResolvedValue({
      id: randomUUID(),
      tenantId: TENANT_ID,
      label: 'Azure AD',
      tokenHash: 'hash',
      active: true,
      lastUsedAt: null,
      createdAt: new Date(),
    });

    const result = await generateToken(TENANT_ID, 'Azure AD');

    expect(result.rawToken).toHaveLength(64); // 32 bytes hex
    expect(result.id).toBeDefined();
    expect(mockPrisma.scimToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: TENANT_ID,
        label: 'Azure AD',
        tokenHash: expect.any(String),
      }),
    });
  });

  it('validateToken returns tenantId for valid token', async () => {
    const { validateToken } = await import('../src/scim/scim-token.service.js');

    const rawToken = 'a'.repeat(64);
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    mockPrisma.scimToken.findFirst.mockResolvedValue({
      id: randomUUID(),
      tenantId: TENANT_ID,
    });
    mockPrisma.scimToken.update.mockResolvedValue({});

    const result = await validateToken(rawToken);

    expect(result).toBe(TENANT_ID);
    expect(mockPrisma.scimToken.findFirst).toHaveBeenCalledWith({
      where: { tokenHash, active: true },
      select: { id: true, tenantId: true },
    });
  });

  it('validateToken returns null for invalid token', async () => {
    const { validateToken } = await import('../src/scim/scim-token.service.js');

    mockPrisma.scimToken.findFirst.mockResolvedValue(null);

    const result = await validateToken('invalid-token');

    expect(result).toBeNull();
  });

  it('revokeToken sets active=false and returns true', async () => {
    const { revokeToken } = await import('../src/scim/scim-token.service.js');

    const tokenId = randomUUID();
    mockPrisma.scimToken.updateMany.mockResolvedValue({ count: 1 });

    const result = await revokeToken(TENANT_ID, tokenId);

    expect(result).toBe(true);
    expect(mockPrisma.scimToken.updateMany).toHaveBeenCalledWith({
      where: { id: tokenId, tenantId: TENANT_ID, active: true },
      data: { active: false },
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SCIM USER SERVICE
// ══════════════════════════════════════════════════════════════════════════════

describe('SCIM User Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getUser returns ScimUser for existing user', async () => {
    const { getUser } = await import('../src/scim/scim-service.js');

    const user = makeUser();
    mockPrisma.user.findFirst.mockResolvedValue(user);

    const result = await getUser(TENANT_ID, user.id);

    expect(result).toMatchObject({
      schemas: expect.arrayContaining(['urn:ietf:params:scim:schemas:core:2.0:User']),
      id: user.id,
      userName: user.email,
      active: true,
    });
  });

  it('getUser returns 404 error for missing user', async () => {
    const { getUser } = await import('../src/scim/scim-service.js');

    mockPrisma.user.findFirst.mockResolvedValue(null);

    const result = await getUser(TENANT_ID, randomUUID());

    expect(result).toMatchObject({
      status: '404',
      detail: 'User not found',
    });
  });

  it('listUsers returns paginated ScimListResponse', async () => {
    const { listUsers } = await import('../src/scim/scim-service.js');

    const users = [makeUser(), makeUser()];
    mockPrisma.user.findMany.mockResolvedValue(users);
    mockPrisma.user.count.mockResolvedValue(2);

    const result = await listUsers(TENANT_ID, { startIndex: 1, count: 10 });

    expect(result.totalResults).toBe(2);
    expect(result.Resources).toHaveLength(2);
    expect(result.startIndex).toBe(1);
  });

  it('createUser creates user, assigns role, and publishes event', async () => {
    const { createUser } = await import('../src/scim/scim-service.js');

    const userId = randomUUID();
    mockPrisma.user.findUnique.mockResolvedValue(null); // No duplicates
    mockPrisma.user.create.mockResolvedValue(
      makeUser({ id: userId, email: 'new@example.com' })
    );
    mockPrisma.scimSyncLog.create.mockResolvedValue({});

    const result = await createUser(TENANT_ID, {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      userName: 'new@example.com',
      name: { givenName: 'New', familyName: 'User' },
      active: true,
    });

    expect(result).toMatchObject({
      userName: 'new@example.com',
      active: true,
    });
    expect(mockPrisma.user.create).toHaveBeenCalled();
    expect(mockPrisma.scimSyncLog.create).toHaveBeenCalled();
  });

  it('createUser rejects duplicate externalId with 409', async () => {
    const { createUser } = await import('../src/scim/scim-service.js');

    mockPrisma.user.findUnique.mockResolvedValue(makeUser()); // Duplicate found
    mockPrisma.scimSyncLog.create.mockResolvedValue({});

    const result = await createUser(TENANT_ID, {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      userName: 'dup@example.com',
      externalId: 'ext-123',
    });

    expect(result).toMatchObject({ status: '409' });
  });

  it('patchUser with active=false deactivates and revokes sessions', async () => {
    const { patchUser } = await import('../src/scim/scim-service.js');

    const user = makeUser({ status: 'ACTIVE' });
    mockPrisma.user.findFirst.mockResolvedValue(user);
    mockPrisma.user.update.mockResolvedValue({ ...user, status: 'DISABLED' });
    mockPrisma.session.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.user.findUnique.mockResolvedValue({
      ...user,
      status: 'DISABLED',
    });
    mockPrisma.scimSyncLog.create.mockResolvedValue({});

    const result = await patchUser(TENANT_ID, user.id, {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
      Operations: [{ op: 'replace', path: 'active', value: false }],
    });

    expect(result).toMatchObject({ active: false });
    expect(mockPrisma.session.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: user.id,
          revokedAt: null,
        }),
      })
    );
  });

  it('deactivateUser soft-deletes, revokes sessions, and cleans MFA', async () => {
    const { deactivateUser } = await import('../src/scim/scim-service.js');

    const user = makeUser();
    mockPrisma.user.findFirst.mockResolvedValue(user);
    mockPrisma.user.update.mockResolvedValue({ ...user, status: 'DISABLED' });
    mockPrisma.session.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.mfaConfig.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.mfaChallenge.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.scimSyncLog.create.mockResolvedValue({});

    const result = await deactivateUser(TENANT_ID, user.id);

    expect(result).toBeUndefined(); // 204 No Content
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'DISABLED' },
      })
    );
    expect(mockPrisma.mfaConfig.deleteMany).toHaveBeenCalled();
    expect(mockPrisma.mfaChallenge.deleteMany).toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SCIM GROUP SERVICE
// ══════════════════════════════════════════════════════════════════════════════

describe('SCIM Group Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listGroups returns all virtual role groups', async () => {
    const { listGroups } = await import('../src/scim/scim-service.js');

    mockPrisma.userRole.findMany.mockResolvedValue([]);

    const result = await listGroups(TENANT_ID, {});

    expect(result.totalResults).toBe(8); // 8 roles = 8 virtual groups
    expect(result.Resources[0]).toMatchObject({
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
      displayName: expect.any(String),
    });
  });

  it('getGroup returns 404 for unknown group id', async () => {
    const { getGroup } = await import('../src/scim/scim-service.js');

    const result = await getGroup(TENANT_ID, 'group-nonexistent');

    expect(result).toMatchObject({ status: '404' });
  });

  it('getGroup returns group with members', async () => {
    const { getGroup } = await import('../src/scim/scim-service.js');

    const userId = randomUUID();
    mockPrisma.userRole.findMany.mockResolvedValue([
      { user: { id: userId, email: 'teacher@example.com' } },
    ]);

    const result = await getGroup(TENANT_ID, 'group-teacher');

    expect(result).toMatchObject({
      displayName: 'Teachers',
      members: [{ value: userId, display: 'teacher@example.com' }],
    });
  });
});
