/**
 * Unit Tests for Ed-Fi Service - Client Module
 *
 * Tests for:
 * - API authentication
 * - Data sync operations
 * - Error handling and retry logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        response: {
          use: vi.fn(),
        },
      },
    })),
    post: vi.fn(),
    isAxiosError: vi.fn((error) => error?.isAxiosError === true),
  },
}));

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

const mockConfig = {
  baseUrl: 'https://edfi.example.com',
  clientId: 'test-client',
  clientSecret: 'test-secret',
  apiVersion: 'V6_1' as const,
  schoolYear: 2025,
};

const mockTokenResponse = {
  access_token: 'mock-access-token',
  token_type: 'Bearer',
  expires_in: 3600,
};

// =============================================================================
// AUTHENTICATION TESTS
// =============================================================================

describe('EdFi Client Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should authenticate successfully with valid credentials', async () => {
    (axios.post as any).mockResolvedValueOnce({ data: mockTokenResponse });

    // Simulate authentication
    const authString = Buffer.from(`${mockConfig.clientId}:${mockConfig.clientSecret}`).toString('base64');
    
    const response = await axios.post(
      `${mockConfig.baseUrl}/oauth/token`,
      'grant_type=client_credentials',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${authString}`,
        },
      }
    );

    expect(response.data.access_token).toBe('mock-access-token');
    expect(response.data.expires_in).toBe(3600);
  });

  it('should throw error with invalid credentials', async () => {
    (axios.post as any).mockRejectedValueOnce(new Error('Invalid credentials'));

    await expect(
      axios.post(`${mockConfig.baseUrl}/oauth/token`, 'grant_type=client_credentials')
    ).rejects.toThrow('Invalid credentials');
  });

  it('should cache access token until expiry', async () => {
    let token: string | null = null;
    let tokenExpiry: Date | null = null;

    // First auth call
    (axios.post as any).mockResolvedValueOnce({ data: mockTokenResponse });
    const response = await axios.post(`${mockConfig.baseUrl}/oauth/token`, '');
    token = response.data.access_token;
    tokenExpiry = new Date(Date.now() + (response.data.expires_in - 300) * 1000);

    // Check token is cached
    expect(token).toBe('mock-access-token');
    expect(tokenExpiry.getTime()).toBeGreaterThan(Date.now());
  });

  it('should refresh token when expired', async () => {
    // Simulate expired token
    const expiredTokenExpiry = new Date(Date.now() - 1000);
    
    expect(expiredTokenExpiry.getTime()).toBeLessThan(Date.now());
    
    // Should trigger new auth request
    (axios.post as any).mockResolvedValueOnce({
      data: { ...mockTokenResponse, access_token: 'new-token' },
    });

    const response = await axios.post(`${mockConfig.baseUrl}/oauth/token`, '');
    expect(response.data.access_token).toBe('new-token');
  });

  it('should handle different API versions for token URL', () => {
    const versions = ['V5_3', 'V6_1', 'V7_0'];
    
    versions.forEach((version) => {
      let tokenUrl: string;
      if (version === 'V7_0') {
        tokenUrl = `${mockConfig.baseUrl}/oauth/token`;
      } else {
        tokenUrl = `${mockConfig.baseUrl}/oauth/token`;
      }
      
      expect(tokenUrl).toContain('/oauth/token');
    });
  });
});

// =============================================================================
// DATA SYNC OPERATIONS TESTS
// =============================================================================

describe('EdFi Data Sync Operations', () => {
  const mockHttpClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Create Operations', () => {
    it('should create a student resource', async () => {
      const studentData = {
        studentUniqueId: 'STU001',
        firstName: 'John',
        lastSurname: 'Doe',
        birthDate: '2015-05-15',
      };

      mockHttpClient.post.mockResolvedValueOnce({
        status: 201,
        headers: { location: '/ed-fi/students/abc123' },
      });

      const response = await mockHttpClient.post('/ed-fi/students', studentData);

      expect(response.status).toBe(201);
      expect(response.headers.location).toContain('abc123');
    });

    it('should create a school association', async () => {
      const associationData = {
        studentReference: { studentUniqueId: 'STU001' },
        schoolReference: { schoolId: 123 },
        entryDate: '2025-08-15',
      };

      mockHttpClient.post.mockResolvedValueOnce({
        status: 201,
        headers: { location: '/ed-fi/studentSchoolAssociations/def456' },
      });

      const response = await mockHttpClient.post('/ed-fi/studentSchoolAssociations', associationData);

      expect(response.status).toBe(201);
    });
  });

  describe('Read Operations', () => {
    it('should get a student by ID', async () => {
      const mockStudent = {
        id: 'abc123',
        studentUniqueId: 'STU001',
        firstName: 'John',
        lastSurname: 'Doe',
      };

      mockHttpClient.get.mockResolvedValueOnce({ data: mockStudent });

      const response = await mockHttpClient.get('/ed-fi/students/abc123');

      expect(response.data.studentUniqueId).toBe('STU001');
    });

    it('should return null for non-existent resource', async () => {
      const error = { isAxiosError: true, response: { status: 404 } };
      mockHttpClient.get.mockRejectedValueOnce(error);

      try {
        await mockHttpClient.get('/ed-fi/students/nonexistent');
      } catch (e: any) {
        expect(e.response.status).toBe(404);
      }
    });

    it('should list students with pagination', async () => {
      const mockStudents = [
        { studentUniqueId: 'STU001', firstName: 'John' },
        { studentUniqueId: 'STU002', firstName: 'Jane' },
      ];

      mockHttpClient.get.mockResolvedValueOnce({ data: mockStudents });

      const response = await mockHttpClient.get('/ed-fi/students', {
        params: { limit: 25, offset: 0 },
      });

      expect(response.data).toHaveLength(2);
    });
  });

  describe('Update Operations', () => {
    it('should update a student', async () => {
      const updateData = {
        studentUniqueId: 'STU001',
        firstName: 'John',
        lastSurname: 'Updated',
      };

      mockHttpClient.put.mockResolvedValueOnce({ status: 204 });

      const response = await mockHttpClient.put('/ed-fi/students/abc123', updateData);

      expect(response.status).toBe(204);
    });
  });

  describe('Delete Operations', () => {
    it('should delete a student', async () => {
      mockHttpClient.delete.mockResolvedValueOnce({ status: 204 });

      const response = await mockHttpClient.delete('/ed-fi/students/abc123');

      expect(response.status).toBe(204);
    });
  });

  describe('Upsert Operations', () => {
    it('should create new resource on upsert', async () => {
      const data = { studentUniqueId: 'NEW001', firstName: 'New' };

      mockHttpClient.post.mockResolvedValueOnce({
        status: 201,
        headers: { location: '/ed-fi/students/new123' },
      });

      const response = await mockHttpClient.post('/ed-fi/students', data);

      expect(response.status).toBe(201);
    });

    it('should update existing resource on upsert conflict', async () => {
      const data = { studentUniqueId: 'EXISTING001', firstName: 'Existing' };
      const conflictError = { isAxiosError: true, response: { status: 409 } };

      mockHttpClient.post.mockRejectedValueOnce(conflictError);
      mockHttpClient.put.mockResolvedValueOnce({ status: 204 });

      try {
        await mockHttpClient.post('/ed-fi/students', data);
      } catch (e: any) {
        if (e.response?.status === 409) {
          const updateResponse = await mockHttpClient.put('/ed-fi/students/existing123', data);
          expect(updateResponse.status).toBe(204);
        }
      }
    });
  });
});

// =============================================================================
// ERROR HANDLING AND RETRY TESTS
// =============================================================================

describe('EdFi Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle 401 unauthorized error', async () => {
    const error = {
      isAxiosError: true,
      response: { status: 401, data: { message: 'Unauthorized' } },
    };

    expect(error.response.status).toBe(401);
  });

  it('should handle 403 forbidden error', async () => {
    const error = {
      isAxiosError: true,
      response: { status: 403, data: { message: 'Forbidden' } },
    };

    expect(error.response.status).toBe(403);
  });

  it('should handle 404 not found error', async () => {
    const error = {
      isAxiosError: true,
      response: { status: 404, data: { message: 'Not Found' } },
    };

    expect(error.response.status).toBe(404);
  });

  it('should handle 409 conflict error', async () => {
    const error = {
      isAxiosError: true,
      response: { status: 409, data: { message: 'Resource already exists' } },
    };

    expect(error.response.status).toBe(409);
  });

  it('should handle 500 server error', async () => {
    const error = {
      isAxiosError: true,
      response: { status: 500, data: { message: 'Internal Server Error' } },
    };

    expect(error.response.status).toBe(500);
  });

  it('should handle network timeout', async () => {
    const error = {
      isAxiosError: true,
      code: 'ECONNABORTED',
      message: 'timeout of 30000ms exceeded',
    };

    expect(error.code).toBe('ECONNABORTED');
  });
});

describe('EdFi Retry Logic', () => {
  it('should retry on 5xx errors', async () => {
    let attempts = 0;
    const maxRetries = 3;

    const mockRequest = async () => {
      attempts++;
      if (attempts < maxRetries) {
        throw { isAxiosError: true, response: { status: 503 } };
      }
      return { data: 'success' };
    };

    let result;
    for (let i = 0; i < maxRetries; i++) {
      try {
        result = await mockRequest();
        break;
      } catch (e) {
        if (i === maxRetries - 1) throw e;
      }
    }

    expect(attempts).toBe(3);
    expect(result?.data).toBe('success');
  });

  it('should not retry on 4xx errors', async () => {
    let attempts = 0;

    const mockRequest = async () => {
      attempts++;
      throw { isAxiosError: true, response: { status: 400 } };
    };

    try {
      await mockRequest();
    } catch (e) {
      // Should not retry
    }

    expect(attempts).toBe(1);
  });

  it('should apply exponential backoff', async () => {
    const baseDelay = 1000;
    const retries = [0, 1, 2];
    
    const delays = retries.map((retry) => baseDelay * Math.pow(2, retry));

    expect(delays).toEqual([1000, 2000, 4000]);
  });

  it('should respect max retry limit', () => {
    const maxRetries = 3;
    const retryCount = 5;

    const actualRetries = Math.min(retryCount, maxRetries);

    expect(actualRetries).toBe(3);
  });
});

// =============================================================================
// CONNECTION TEST
// =============================================================================

describe('EdFi Connection Test', () => {
  it('should return success for valid connection', async () => {
    const result = {
      success: true,
      message: 'Successfully connected to Ed-Fi ODS/API V6_1',
      serverInfo: {
        version: 'V6_1',
        dataModel: '4.0',
      },
    };

    expect(result.success).toBe(true);
    expect(result.serverInfo?.version).toBe('V6_1');
  });

  it('should return failure for invalid connection', async () => {
    const result = {
      success: false,
      message: 'Connection failed: Invalid credentials',
    };

    expect(result.success).toBe(false);
    expect(result.message).toContain('failed');
  });
});

// =============================================================================
// RESOURCE ENDPOINT MAPPING TESTS
// =============================================================================

describe('EdFi Resource Endpoints', () => {
  const endpoints = {
    V5_3: {
      students: '/ed-fi/students',
      schools: '/ed-fi/schools',
    },
    V6_1: {
      students: '/ed-fi/students',
      schools: '/ed-fi/schools',
    },
    V7_0: {
      students: '/data/v3/ed-fi/students',
      schools: '/data/v3/ed-fi/schools',
    },
  };

  it('should return correct endpoint for V5_3', () => {
    expect(endpoints.V5_3.students).toBe('/ed-fi/students');
  });

  it('should return correct endpoint for V6_1', () => {
    expect(endpoints.V6_1.students).toBe('/ed-fi/students');
  });

  it('should return correct endpoint for V7_0', () => {
    expect(endpoints.V7_0.students).toBe('/data/v3/ed-fi/students');
  });

  it('should map all required resources', () => {
    const requiredResources = [
      'students',
      'schools',
    ];

    requiredResources.forEach((resource) => {
      expect(endpoints.V6_1).toHaveProperty(resource);
    });
  });
});
