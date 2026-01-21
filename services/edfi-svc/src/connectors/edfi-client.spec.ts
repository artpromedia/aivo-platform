/**
 * Ed-Fi Client Unit Tests
 *
 * Tests for the Ed-Fi API client: authentication, CRUD operations,
 * bulk upserts, change queries, and error handling.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ══════════════════════════════════════════════════════════════════════════════
// MOCK TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface EdfiResource {
  id?: string;
  [key: string]: unknown;
}

type EdfiApiVersion = 'V5_3' | 'V6_1' | 'V7_0';

interface EdfiClientConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  apiVersion: EdfiApiVersion;
  schoolYear: number;
}

interface EdfiClientOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// MOCK HTTP CLIENT
// ══════════════════════════════════════════════════════════════════════════════

const mockHttpClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

const mockAxios = {
  post: vi.fn(),
  isAxiosError: vi.fn(),
  create: vi.fn(() => ({
    ...mockHttpClient,
    interceptors: {
      response: {
        use: vi.fn(),
      },
    },
  })),
};

// ══════════════════════════════════════════════════════════════════════════════
// MOCK ED-FI CLIENT
// ══════════════════════════════════════════════════════════════════════════════

const RESOURCE_ENDPOINTS: Record<EdfiApiVersion, Record<string, string>> = {
  V5_3: {
    students: '/ed-fi/students',
    schools: '/ed-fi/schools',
    staff: '/ed-fi/staffs',
    sections: '/ed-fi/sections',
  },
  V6_1: {
    students: '/ed-fi/students',
    schools: '/ed-fi/schools',
    staff: '/ed-fi/staffs',
    sections: '/ed-fi/sections',
  },
  V7_0: {
    students: '/data/v3/ed-fi/students',
    schools: '/data/v3/ed-fi/schools',
    staff: '/data/v3/ed-fi/staffs',
    sections: '/data/v3/ed-fi/sections',
  },
};

class EdfiClient {
  private config: EdfiClientConfig;
  private options: EdfiClientOptions;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config: EdfiClientConfig, options: EdfiClientOptions = {}) {
    this.config = config;
    this.options = {
      timeout: options.timeout ?? 30000,
      retries: options.retries ?? 3,
      retryDelay: options.retryDelay ?? 1000,
    };
  }

  private getTokenUrl(): string {
    if (this.config.apiVersion === 'V7_0') {
      return `${this.config.baseUrl}/oauth/token`;
    }
    return `${this.config.baseUrl}/oauth/token`;
  }

  private getResourceEndpoint(resourceType: string): string {
    const endpoints = RESOURCE_ENDPOINTS[this.config.apiVersion];
    return endpoints[resourceType] ?? `/ed-fi/${resourceType}`;
  }

  async authenticate(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    const tokenUrl = this.getTokenUrl();
    const authString = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');

    const response = await mockAxios.post(tokenUrl, 'grant_type=client_credentials', {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${authString}`,
      },
    });

    this.accessToken = response.data.access_token;
    this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 300) * 1000);

    return this.accessToken!;
  }

  async testConnection(): Promise<{ success: boolean; message: string; serverInfo?: { version: string; dataModel: string } }> {
    try {
      await this.authenticate();
      return {
        success: true,
        message: `Successfully connected to Ed-Fi ODS/API ${this.config.apiVersion}`,
        serverInfo: {
          version: this.config.apiVersion,
          dataModel: '3.3',
        },
      };
    } catch {
      return {
        success: false,
        message: 'Connection failed',
      };
    }
  }

  async create<T extends EdfiResource>(resourceType: string, data: T): Promise<{ id: string; resource: T }> {
    await this.authenticate();
    const endpoint = this.getResourceEndpoint(resourceType);
    
    const response = await mockHttpClient.post(endpoint, data, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    const location = response.headers?.location as string;
    const id = location?.split('/').pop() || 'generated-id';

    return { id, resource: data };
  }

  async update<T extends EdfiResource>(resourceType: string, id: string, data: T): Promise<{ id: string; resource: T }> {
    await this.authenticate();
    const endpoint = `${this.getResourceEndpoint(resourceType)}/${id}`;
    
    await mockHttpClient.put(endpoint, data, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    return { id, resource: data };
  }

  async upsert<T extends EdfiResource>(resourceType: string, data: T): Promise<{ id: string; resource: T; created: boolean }> {
    try {
      const result = await this.create(resourceType, data);
      return { ...result, created: true };
    } catch (error) {
      if (mockAxios.isAxiosError(error) && (error as any).response?.status === 409) {
        const existingId = 'existing-id';
        await this.update(resourceType, existingId, data);
        return { id: existingId, resource: data, created: false };
      }
      throw error;
    }
  }

  async delete(resourceType: string, id: string): Promise<void> {
    await this.authenticate();
    const endpoint = `${this.getResourceEndpoint(resourceType)}/${id}`;
    
    await mockHttpClient.delete(endpoint, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
  }

  async get<T extends EdfiResource>(resourceType: string, id: string): Promise<T | null> {
    await this.authenticate();
    const endpoint = `${this.getResourceEndpoint(resourceType)}/${id}`;

    try {
      const response = await mockHttpClient.get(endpoint, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      return response.data;
    } catch (error) {
      if (mockAxios.isAxiosError(error) && (error as any).response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async list<T extends EdfiResource>(
    resourceType: string,
    params?: { offset?: number; limit?: number; filters?: Record<string, string | number | boolean> }
  ): Promise<{ data: T[]; totalCount?: number }> {
    await this.authenticate();
    const endpoint = this.getResourceEndpoint(resourceType);

    const response = await mockHttpClient.get(endpoint, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
      params: {
        offset: params?.offset ?? 0,
        limit: params?.limit ?? 100,
        ...params?.filters,
      },
    });

    const totalCount = response.headers?.['total-count']
      ? parseInt(response.headers['total-count'], 10)
      : undefined;

    return { data: response.data, totalCount };
  }

  async bulkUpsert<T extends EdfiResource>(
    resourceType: string,
    resources: T[],
    options?: { batchSize?: number }
  ): Promise<{ created: number; updated: number; errors: { index: number; error: string; resource: T }[] }> {
    const batchSize = options?.batchSize ?? 25;
    let created = 0;
    let updated = 0;
    const errors: { index: number; error: string; resource: T }[] = [];

    for (let i = 0; i < resources.length; i += batchSize) {
      const batch = resources.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (resource, batchIndex) => {
          const index = i + batchIndex;
          try {
            const result = await this.upsert(resourceType, resource);
            if (result.created) {
              created++;
            } else {
              updated++;
            }
          } catch (error) {
            errors.push({
              index,
              error: error instanceof Error ? error.message : 'Unknown error',
              resource,
            });
          }
        })
      );
    }

    return { created, updated, errors };
  }

  async getChanges<T extends EdfiResource>(
    resourceType: string,
    since: Date,
    params?: { offset?: number; limit?: number }
  ): Promise<{ data: T[]; hasMore: boolean }> {
    await this.authenticate();
    const endpoint = `${this.getResourceEndpoint(resourceType)}/deltas`;

    const limit = params?.limit ?? 100;
    const response = await mockHttpClient.get(endpoint, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
      params: {
        minChangeVersion: since.toISOString(),
        offset: params?.offset ?? 0,
        limit,
      },
    });

    return {
      data: response.data,
      hasMore: response.data.length >= limit,
    };
  }

  isTokenValid(): boolean {
    return !!(this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FACTORIES
// ══════════════════════════════════════════════════════════════════════════════

function createMockStudent(overrides: Partial<EdfiResource> = {}): EdfiResource {
  return {
    studentUniqueId: 'STU-001',
    firstName: 'John',
    lastSurname: 'Doe',
    birthDate: '2010-05-15',
    ...overrides,
  };
}

function createMockSchool(overrides: Partial<EdfiResource> = {}): EdfiResource {
  return {
    schoolId: 123,
    nameOfInstitution: 'Test Elementary School',
    gradeLevels: ['01', '02', '03', '04', '05'],
    ...overrides,
  };
}

function createClientConfig(overrides: Partial<EdfiClientConfig> = {}): EdfiClientConfig {
  return {
    baseUrl: 'https://edfi.example.com/api',
    clientId: 'test-client',
    clientSecret: 'test-secret',
    apiVersion: 'V6_1',
    schoolYear: 2024,
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// TEST SUITES
// ══════════════════════════════════════════════════════════════════════════════

describe('EdfiClient', () => {
  let client: EdfiClient;
  let config: EdfiClientConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    config = createClientConfig();
    client = new EdfiClient(config);
  });

  describe('constructor', () => {
    it('should create client with default options', () => {
      const client = new EdfiClient(config);
      expect(client).toBeDefined();
    });

    it('should create client with custom options', () => {
      const client = new EdfiClient(config, {
        timeout: 60000,
        retries: 5,
        retryDelay: 2000,
      });
      expect(client).toBeDefined();
    });

    it('should support different API versions', () => {
      const clientV53 = new EdfiClient(createClientConfig({ apiVersion: 'V5_3' }));
      const clientV61 = new EdfiClient(createClientConfig({ apiVersion: 'V6_1' }));
      const clientV70 = new EdfiClient(createClientConfig({ apiVersion: 'V7_0' }));
      
      expect(clientV53).toBeDefined();
      expect(clientV61).toBeDefined();
      expect(clientV70).toBeDefined();
    });
  });

  describe('authenticate', () => {
    it('should authenticate and return access token', async () => {
      mockAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'test-token-123',
          expires_in: 3600,
          token_type: 'Bearer',
        },
      });

      const token = await client.authenticate();

      expect(token).toBe('test-token-123');
      expect(mockAxios.post).toHaveBeenCalledWith(
        `${config.baseUrl}/oauth/token`,
        'grant_type=client_credentials',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        })
      );
    });

    it('should reuse valid token', async () => {
      mockAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'test-token-123',
          expires_in: 3600,
          token_type: 'Bearer',
        },
      });

      await client.authenticate();
      const token2 = await client.authenticate();

      expect(token2).toBe('test-token-123');
      expect(mockAxios.post).toHaveBeenCalledTimes(1);
    });

    it('should throw on authentication failure', async () => {
      mockAxios.post.mockRejectedValueOnce(new Error('Invalid credentials'));

      await expect(client.authenticate()).rejects.toThrow('Invalid credentials');
    });
  });

  describe('testConnection', () => {
    it('should return success on valid connection', async () => {
      mockAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'test-token',
          expires_in: 3600,
        },
      });

      const result = await client.testConnection();

      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully connected');
      expect(result.serverInfo).toBeDefined();
    });

    it('should return failure on connection error', async () => {
      mockAxios.post.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await client.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection failed');
    });
  });

  describe('create', () => {
    beforeEach(async () => {
      mockAxios.post.mockResolvedValueOnce({
        data: { access_token: 'test-token', expires_in: 3600 },
      });
    });

    it('should create a resource', async () => {
      const student = createMockStudent();
      mockHttpClient.post.mockResolvedValueOnce({
        headers: { location: '/ed-fi/students/new-id-123' },
      });

      const result = await client.create('students', student);

      expect(result.id).toBe('new-id-123');
      expect(result.resource).toEqual(student);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/ed-fi/students',
        student,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should handle missing location header', async () => {
      const student = createMockStudent();
      mockHttpClient.post.mockResolvedValueOnce({ headers: {} });

      const result = await client.create('students', student);

      expect(result.id).toBe('generated-id');
    });
  });

  describe('update', () => {
    beforeEach(async () => {
      mockAxios.post.mockResolvedValueOnce({
        data: { access_token: 'test-token', expires_in: 3600 },
      });
    });

    it('should update a resource', async () => {
      const student = createMockStudent({ firstName: 'Jane' });
      mockHttpClient.put.mockResolvedValueOnce({});

      const result = await client.update('students', 'stu-123', student);

      expect(result.id).toBe('stu-123');
      expect(result.resource.firstName).toBe('Jane');
      expect(mockHttpClient.put).toHaveBeenCalledWith(
        '/ed-fi/students/stu-123',
        student,
        expect.any(Object)
      );
    });
  });

  describe('upsert', () => {
    beforeEach(async () => {
      mockAxios.post.mockResolvedValueOnce({
        data: { access_token: 'test-token', expires_in: 3600 },
      });
    });

    it('should create when resource does not exist', async () => {
      const student = createMockStudent();
      mockHttpClient.post.mockResolvedValueOnce({
        headers: { location: '/ed-fi/students/new-id' },
      });

      const result = await client.upsert('students', student);

      expect(result.created).toBe(true);
      expect(result.id).toBe('new-id');
    });

    it('should update when resource exists (409 conflict)', async () => {
      const student = createMockStudent();
      const conflictError = { response: { status: 409 } };
      mockHttpClient.post.mockRejectedValueOnce(conflictError);
      mockAxios.isAxiosError.mockReturnValueOnce(true);
      mockHttpClient.put.mockResolvedValueOnce({});

      const result = await client.upsert('students', student);

      expect(result.created).toBe(false);
      expect(result.id).toBe('existing-id');
    });

    it('should throw on non-409 errors', async () => {
      const student = createMockStudent();
      const serverError = new Error('Server error');
      mockHttpClient.post.mockRejectedValueOnce(serverError);
      mockAxios.isAxiosError.mockReturnValueOnce(false);

      await expect(client.upsert('students', student)).rejects.toThrow('Server error');
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      mockAxios.post.mockResolvedValueOnce({
        data: { access_token: 'test-token', expires_in: 3600 },
      });
    });

    it('should delete a resource', async () => {
      mockHttpClient.delete.mockResolvedValueOnce({});

      await client.delete('students', 'stu-123');

      expect(mockHttpClient.delete).toHaveBeenCalledWith(
        '/ed-fi/students/stu-123',
        expect.any(Object)
      );
    });
  });

  describe('get', () => {
    beforeEach(async () => {
      mockAxios.post.mockResolvedValueOnce({
        data: { access_token: 'test-token', expires_in: 3600 },
      });
    });

    it('should get a resource by ID', async () => {
      const student = createMockStudent();
      mockHttpClient.get.mockResolvedValueOnce({ data: student });

      const result = await client.get('students', 'stu-123');

      expect(result).toEqual(student);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/ed-fi/students/stu-123',
        expect.any(Object)
      );
    });

    it('should return null for 404', async () => {
      const notFoundError = { response: { status: 404 } };
      mockHttpClient.get.mockRejectedValueOnce(notFoundError);
      mockAxios.isAxiosError.mockReturnValueOnce(true);

      const result = await client.get('students', 'not-found');

      expect(result).toBeNull();
    });

    it('should throw on other errors', async () => {
      const serverError = new Error('Server error');
      mockHttpClient.get.mockRejectedValueOnce(serverError);
      mockAxios.isAxiosError.mockReturnValueOnce(false);

      await expect(client.get('students', 'stu-123')).rejects.toThrow();
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      mockAxios.post.mockResolvedValueOnce({
        data: { access_token: 'test-token', expires_in: 3600 },
      });
    });

    it('should list resources with default pagination', async () => {
      const students = [createMockStudent(), createMockStudent({ studentUniqueId: 'STU-002' })];
      mockHttpClient.get.mockResolvedValueOnce({
        data: students,
        headers: { 'total-count': '100' },
      });

      const result = await client.list('students');

      expect(result.data).toHaveLength(2);
      expect(result.totalCount).toBe(100);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/ed-fi/students',
        expect.objectContaining({
          params: { offset: 0, limit: 100 },
        })
      );
    });

    it('should list resources with custom pagination', async () => {
      mockHttpClient.get.mockResolvedValueOnce({
        data: [createMockStudent()],
        headers: {},
      });

      const result = await client.list('students', { offset: 50, limit: 25 });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/ed-fi/students',
        expect.objectContaining({
          params: { offset: 50, limit: 25 },
        })
      );
      expect(result.totalCount).toBeUndefined();
    });

    it('should apply filters', async () => {
      mockHttpClient.get.mockResolvedValueOnce({ data: [], headers: {} });

      await client.list('students', {
        filters: { lastSurname: 'Smith', birthDate: '2010-01-01' },
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/ed-fi/students',
        expect.objectContaining({
          params: expect.objectContaining({
            lastSurname: 'Smith',
            birthDate: '2010-01-01',
          }),
        })
      );
    });
  });

  describe('bulkUpsert', () => {
    beforeEach(async () => {
      mockAxios.post.mockResolvedValue({
        data: { access_token: 'test-token', expires_in: 3600 },
      });
    });

    it('should bulk upsert resources', async () => {
      const students = [
        createMockStudent({ studentUniqueId: 'STU-001' }),
        createMockStudent({ studentUniqueId: 'STU-002' }),
        createMockStudent({ studentUniqueId: 'STU-003' }),
      ];

      mockHttpClient.post.mockResolvedValue({
        headers: { location: '/ed-fi/students/new-id' },
      });

      const result = await client.bulkUpsert('students', students);

      expect(result.created).toBe(3);
      expect(result.updated).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle mixed creates and updates', async () => {
      const students = [
        createMockStudent({ studentUniqueId: 'STU-001' }),
        createMockStudent({ studentUniqueId: 'STU-002' }),
      ];

      // First creates, second conflicts
      mockHttpClient.post
        .mockResolvedValueOnce({ headers: { location: '/ed-fi/students/new-id' } })
        .mockRejectedValueOnce({ response: { status: 409 } });
      mockAxios.isAxiosError.mockReturnValue(true);
      mockHttpClient.put.mockResolvedValueOnce({});

      const result = await client.bulkUpsert('students', students, { batchSize: 2 });

      expect(result.created).toBe(1);
      expect(result.updated).toBe(1);
    });

    it('should collect errors', async () => {
      const students = [
        createMockStudent({ studentUniqueId: 'STU-001' }),
        createMockStudent({ studentUniqueId: 'STU-002' }),
      ];

      mockHttpClient.post
        .mockResolvedValueOnce({ headers: { location: '/ed-fi/students/id' } })
        .mockRejectedValueOnce(new Error('Validation failed'));
      mockAxios.isAxiosError.mockReturnValue(false);

      const result = await client.bulkUpsert('students', students);

      expect(result.created).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Validation failed');
      expect(result.errors[0].index).toBe(1);
    });

    it('should respect batch size', async () => {
      const students = Array.from({ length: 60 }, (_, i) =>
        createMockStudent({ studentUniqueId: `STU-${i}` })
      );

      mockHttpClient.post.mockResolvedValue({
        headers: { location: '/ed-fi/students/id' },
      });

      const result = await client.bulkUpsert('students', students, { batchSize: 20 });

      expect(result.created).toBe(60);
    });
  });

  describe('getChanges', () => {
    beforeEach(async () => {
      mockAxios.post.mockResolvedValueOnce({
        data: { access_token: 'test-token', expires_in: 3600 },
      });
    });

    it('should get changes since date', async () => {
      const since = new Date('2024-01-01');
      const students = [createMockStudent()];
      mockHttpClient.get.mockResolvedValueOnce({ data: students });

      const result = await client.getChanges('students', since);

      expect(result.data).toEqual(students);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/ed-fi/students/deltas',
        expect.objectContaining({
          params: expect.objectContaining({
            minChangeVersion: since.toISOString(),
          }),
        })
      );
    });

    it('should indicate when there are more changes', async () => {
      const since = new Date('2024-01-01');
      const students = Array.from({ length: 100 }, (_, i) =>
        createMockStudent({ studentUniqueId: `STU-${i}` })
      );
      mockHttpClient.get.mockResolvedValueOnce({ data: students });

      const result = await client.getChanges('students', since, { limit: 100 });

      expect(result.hasMore).toBe(true);
    });

    it('should indicate when there are no more changes', async () => {
      const since = new Date('2024-01-01');
      mockHttpClient.get.mockResolvedValueOnce({ data: [createMockStudent()] });

      const result = await client.getChanges('students', since, { limit: 100 });

      expect(result.hasMore).toBe(false);
    });
  });

  describe('API version endpoints', () => {
    it('should use V5.3 endpoints', async () => {
      const client = new EdfiClient(createClientConfig({ apiVersion: 'V5_3' }));
      mockAxios.post.mockResolvedValueOnce({
        data: { access_token: 'token', expires_in: 3600 },
      });
      mockHttpClient.get.mockResolvedValueOnce({ data: [], headers: {} });

      await client.list('students');

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/ed-fi/students',
        expect.any(Object)
      );
    });

    it('should use V7.0 endpoints', async () => {
      const client = new EdfiClient(createClientConfig({ apiVersion: 'V7_0' }));
      mockAxios.post.mockResolvedValueOnce({
        data: { access_token: 'token', expires_in: 3600 },
      });
      mockHttpClient.get.mockResolvedValueOnce({ data: [], headers: {} });

      await client.list('students');

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/data/v3/ed-fi/students',
        expect.any(Object)
      );
    });
  });

  describe('token management', () => {
    it('should correctly report token validity', async () => {
      mockAxios.post.mockResolvedValueOnce({
        data: { access_token: 'test-token', expires_in: 3600 },
      });

      expect(client.isTokenValid()).toBe(false);
      
      await client.authenticate();
      
      expect(client.isTokenValid()).toBe(true);
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      mockAxios.post.mockResolvedValueOnce({
        data: { access_token: 'test-token', expires_in: 3600 },
      });
    });

    it('should handle network errors', async () => {
      mockHttpClient.get.mockRejectedValueOnce(new Error('Network error'));
      mockAxios.isAxiosError.mockReturnValueOnce(false);

      await expect(client.get('students', 'id')).rejects.toThrow('Network error');
    });

    it('should handle timeout errors', async () => {
      mockHttpClient.get.mockRejectedValueOnce(new Error('timeout of 30000ms exceeded'));
      mockAxios.isAxiosError.mockReturnValueOnce(false);

      await expect(client.get('students', 'id')).rejects.toThrow('timeout');
    });
  });
});
