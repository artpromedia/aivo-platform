/**
 * Authentication Integration Tests
 * Tests for the complete auth flow
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { PrismaClient } from '../src/generated/prisma-client/index.js';
import { registerEnhancedAuthRoutes } from '../src/routes/auth.enhanced.js';
import { generateKeyPairSync, randomUUID } from 'crypto';
import Redis from 'ioredis-mock';

// Test configuration
const TEST_TENANT_ID = 'test-tenant-id';
const TEST_EMAIL = `test-${randomUUID()}@example.com`;
const TEST_PASSWORD = 'StrongP@ssw0rd!';

// ============================================================================
// Test Setup
// ============================================================================

let app: FastifyInstance;
let prisma: PrismaClient;
let mockRedis: any;

// Generate test keys
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// Mock environment variables
process.env.JWT_PRIVATE_KEY = privateKey as string;
process.env.JWT_PUBLIC_KEY = publicKey as string;
process.env.CONSUMER_TENANT_ID = TEST_TENANT_ID;
process.env.ACCESS_TOKEN_TTL = '15m';
process.env.REFRESH_TOKEN_TTL = '7d';

beforeAll(async () => {
  // Initialize Prisma
  prisma = new PrismaClient({
    datasources: {
      db: { url: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/auth_test' },
    },
  });

  // Initialize mock Redis
  mockRedis = new Redis();

  // Create Fastify app
  app = Fastify({
    logger: false,
  });

  // Add mock Redis to Fastify
  (app as any).redis = mockRedis;

  // Register routes
  await app.register(async (instance) => {
    await registerEnhancedAuthRoutes(instance);
  }, { prefix: '/auth' });

  await app.ready();
});

afterAll(async () => {
  // Cleanup test data
  await prisma.session.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
  await prisma.userRole.deleteMany({
    where: { user: { tenantId: TEST_TENANT_ID } },
  });
  await prisma.user.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
  
  await app.close();
  await prisma.$disconnect();
  mockRedis.disconnect();
});

beforeEach(async () => {
  // Clear Redis before each test
  await mockRedis.flushall();
});

// ============================================================================
// Registration Tests
// ============================================================================

describe('POST /auth/register', () => {
  it('should register a new user successfully', async () => {
    const email = `register-test-${randomUUID()}@example.com`;
    
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email,
        password: TEST_PASSWORD,
        tenantId: TEST_TENANT_ID,
      },
    });

    expect(response.statusCode).toBe(201);
    
    const body = JSON.parse(response.body);
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(email);
    expect(body.user.emailVerified).toBe(false);
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
    expect(body.expiresIn).toBeDefined();
    expect(body.session).toBeDefined();
    expect(body.session.id).toBeDefined();
  });

  it('should reject weak passwords', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: `weak-password-${randomUUID()}@example.com`,
        password: 'weakpass',
        tenantId: TEST_TENANT_ID,
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toContain('Password');
  });

  it('should reject duplicate emails in same tenant', async () => {
    const email = `duplicate-${randomUUID()}@example.com`;

    // First registration
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email,
        password: TEST_PASSWORD,
        tenantId: TEST_TENANT_ID,
      },
    });

    // Second registration with same email
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email,
        password: TEST_PASSWORD,
        tenantId: TEST_TENANT_ID,
      },
    });

    expect(response.statusCode).toBe(409);
    const body = JSON.parse(response.body);
    expect(body.error).toContain('already exists');
  });

  it('should reject invalid email format', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: 'not-an-email',
        password: TEST_PASSWORD,
        tenantId: TEST_TENANT_ID,
      },
    });

    expect(response.statusCode).toBe(400);
  });
});

// ============================================================================
// Login Tests
// ============================================================================

describe('POST /auth/login', () => {
  let testUserEmail: string;

  beforeAll(async () => {
    testUserEmail = `login-test-${randomUUID()}@example.com`;
    
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: testUserEmail,
        password: TEST_PASSWORD,
        tenantId: TEST_TENANT_ID,
      },
    });
  });

  it('should login successfully with valid credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: testUserEmail,
        password: TEST_PASSWORD,
        tenantId: TEST_TENANT_ID,
      },
    });

    expect(response.statusCode).toBe(200);
    
    const body = JSON.parse(response.body);
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(testUserEmail);
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
  });

  it('should reject invalid password', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: testUserEmail,
        password: 'WrongPassword123!',
        tenantId: TEST_TENANT_ID,
      },
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Invalid credentials');
  });

  it('should reject non-existent user', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'nonexistent@example.com',
        password: TEST_PASSWORD,
        tenantId: TEST_TENANT_ID,
      },
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Invalid credentials');
  });
});

// ============================================================================
// Token Refresh Tests
// ============================================================================

describe('POST /auth/refresh', () => {
  let refreshToken: string;

  beforeAll(async () => {
    const email = `refresh-test-${randomUUID()}@example.com`;
    
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email,
        password: TEST_PASSWORD,
        tenantId: TEST_TENANT_ID,
      },
    });

    const body = JSON.parse(registerResponse.body);
    refreshToken = body.refreshToken;
  });

  it('should refresh tokens successfully', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: {
        refreshToken,
      },
    });

    expect(response.statusCode).toBe(200);
    
    const body = JSON.parse(response.body);
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
    expect(body.expiresIn).toBeDefined();
  });

  it('should reject invalid refresh token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: {
        refreshToken: 'invalid-token',
      },
    });

    expect(response.statusCode).toBe(401);
  });
});

// ============================================================================
// Logout Tests
// ============================================================================

describe('POST /auth/logout', () => {
  it('should logout successfully', async () => {
    const email = `logout-test-${randomUUID()}@example.com`;
    
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email,
        password: TEST_PASSWORD,
        tenantId: TEST_TENANT_ID,
      },
    });

    const { accessToken } = JSON.parse(registerResponse.body);

    const response = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.statusCode).toBe(204);
  });

  it('should return 204 even without token (idempotent)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/logout',
    });

    expect(response.statusCode).toBe(204);
  });
});

// ============================================================================
// Session Management Tests
// ============================================================================

describe('GET /auth/sessions', () => {
  let accessToken: string;

  beforeAll(async () => {
    const email = `sessions-test-${randomUUID()}@example.com`;
    
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email,
        password: TEST_PASSWORD,
        tenantId: TEST_TENANT_ID,
      },
    });

    accessToken = JSON.parse(response.body).accessToken;
  });

  it('should list active sessions', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/auth/sessions',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    
    const body = JSON.parse(response.body);
    expect(body.sessions).toBeDefined();
    expect(Array.isArray(body.sessions)).toBe(true);
    expect(body.sessions.length).toBeGreaterThan(0);
    
    // Check current session is marked
    const currentSession = body.sessions.find((s: any) => s.isCurrent);
    expect(currentSession).toBeDefined();
  });

  it('should require authentication', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/auth/sessions',
    });

    expect(response.statusCode).toBe(401);
  });
});

// ============================================================================
// Password Change Tests
// ============================================================================

describe('POST /auth/change-password', () => {
  let accessToken: string;
  let testEmail: string;

  beforeAll(async () => {
    testEmail = `change-password-test-${randomUUID()}@example.com`;
    
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: testEmail,
        password: TEST_PASSWORD,
        tenantId: TEST_TENANT_ID,
      },
    });

    accessToken = JSON.parse(response.body).accessToken;
  });

  it('should change password successfully', async () => {
    const newPassword = 'NewStrongP@ssw0rd!';
    
    const response = await app.inject({
      method: 'POST',
      url: '/auth/change-password',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        currentPassword: TEST_PASSWORD,
        newPassword,
      },
    });

    expect(response.statusCode).toBe(200);
    
    // Verify can login with new password
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: testEmail,
        password: newPassword,
        tenantId: TEST_TENANT_ID,
      },
    });

    expect(loginResponse.statusCode).toBe(200);
  });

  it('should reject incorrect current password', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/change-password',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        currentPassword: 'WrongPassword!',
        newPassword: 'AnotherP@ssw0rd!',
      },
    });

    expect(response.statusCode).toBe(400);
  });
});

// ============================================================================
// Get Current User Tests
// ============================================================================

describe('GET /auth/me', () => {
  let accessToken: string;
  let userEmail: string;

  beforeAll(async () => {
    userEmail = `me-test-${randomUUID()}@example.com`;
    
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: userEmail,
        password: TEST_PASSWORD,
        tenantId: TEST_TENANT_ID,
      },
    });

    accessToken = JSON.parse(response.body).accessToken;
  });

  it('should return current user info', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    
    const body = JSON.parse(response.body);
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(userEmail);
    expect(body.user.roles).toBeDefined();
    expect(Array.isArray(body.user.roles)).toBe(true);
  });

  it('should require authentication', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/auth/me',
    });

    expect(response.statusCode).toBe(401);
  });
});

// ============================================================================
// Health Check Tests
// ============================================================================

describe('GET /auth/health', () => {
  it('should return healthy status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/auth/health',
    });

    expect(response.statusCode).toBe(200);
    
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('auth');
  });
});
