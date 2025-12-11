/**
 * Provider Connector Tests
 * 
 * Tests for each SIS provider implementation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CleverProvider } from '../src/providers/clever';
import { ClassLinkProvider } from '../src/providers/classlink';
import { OneRosterApiProvider } from '../src/providers/oneroster-api';
import { validateProviderConfig } from '../src/providers';
import { CleverConfig, ClassLinkConfig, OneRosterApiConfig, OneRosterCsvConfig } from '../src/providers/types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('CleverProvider', () => {
  let provider: CleverProvider;
  
  beforeEach(() => {
    vi.clearAllMocks();
    provider = new CleverProvider();
  });
  
  describe('initialize', () => {
    it('should initialize with access token', async () => {
      const config: CleverConfig = {
        clientId: 'client-123',
        clientSecret: 'secret-456',
        districtId: 'district-789',
        accessToken: 'token-abc',
      };
      
      await provider.initialize(config);
      // Should not throw
      expect(true).toBe(true);
    });
    
    it('should throw without access token', async () => {
      const config: CleverConfig = {
        clientId: 'client-123',
        clientSecret: 'secret-456',
        districtId: 'district-789',
      };
      
      await expect(provider.initialize(config)).rejects.toThrow('access token');
    });
  });
  
  describe('testConnection', () => {
    it('should return success when API responds', async () => {
      const config: CleverConfig = {
        clientId: 'client-123',
        clientSecret: 'secret-456',
        districtId: 'district-789',
        accessToken: 'token-abc',
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });
      
      await provider.initialize(config);
      const result = await provider.testConnection();
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully connected');
    });
    
    it('should return failure when API errors', async () => {
      const config: CleverConfig = {
        clientId: 'client-123',
        clientSecret: 'secret-456',
        districtId: 'district-789',
        accessToken: 'token-abc',
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });
      
      await provider.initialize(config);
      const result = await provider.testConnection();
      
      expect(result.success).toBe(false);
    });
  });
  
  describe('fetchSchools', () => {
    it('should transform Clever schools to SIS format', async () => {
      const config: CleverConfig = {
        clientId: 'client-123',
        clientSecret: 'secret-456',
        districtId: 'district-789',
        accessToken: 'token-abc',
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              data: {
                id: 'school-1',
                name: 'Lincoln Elementary',
                school_number: '12345',
                location: {
                  address: '123 Main St',
                  city: 'Springfield',
                  state: 'IL',
                  zip: '62701',
                },
              },
            },
          ],
          links: [],
        }),
      });
      
      await provider.initialize(config);
      const result = await provider.fetchSchools();
      
      expect(result.count).toBe(1);
      expect(result.entities[0].externalId).toBe('school-1');
      expect(result.entities[0].name).toBe('Lincoln Elementary');
      expect(result.entities[0].schoolNumber).toBe('12345');
      expect(result.entities[0].address?.city).toBe('Springfield');
    });
    
    it('should handle pagination', async () => {
      const config: CleverConfig = {
        clientId: 'client-123',
        clientSecret: 'secret-456',
        districtId: 'district-789',
        accessToken: 'token-abc',
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ data: { id: 'school-1', name: 'School 1' } }],
          links: [{ rel: 'next', uri: '/schools?cursor=abc' }],
        }),
      });
      
      await provider.initialize(config);
      const result = await provider.fetchSchools();
      
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('/schools?cursor=abc');
    });
  });
});

describe('ClassLinkProvider', () => {
  let provider: ClassLinkProvider;
  
  beforeEach(() => {
    vi.clearAllMocks();
    provider = new ClassLinkProvider();
  });
  
  describe('initialize', () => {
    it('should request access token via OAuth', async () => {
      const config: ClassLinkConfig = {
        clientId: 'client-123',
        clientSecret: 'secret-456',
        tenantId: 'tenant-789',
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-token',
          expires_in: 3600,
        }),
      });
      
      await provider.initialize(config);
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('token'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });
});

describe('OneRosterApiProvider', () => {
  let provider: OneRosterApiProvider;
  
  beforeEach(() => {
    vi.clearAllMocks();
    provider = new OneRosterApiProvider();
  });
  
  describe('fetchUsers', () => {
    it('should transform OneRoster users to SIS format', async () => {
      const config: OneRosterApiConfig = {
        baseUrl: 'https://api.example.com/oneroster',
        clientId: 'client-123',
        clientSecret: 'secret-456',
        accessToken: 'token-abc',
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          users: [
            {
              sourcedId: 'user-1',
              status: 'active',
              enabledUser: true,
              orgs: [{ sourcedId: 'school-1', type: 'org' }],
              role: 'student',
              givenName: 'John',
              familyName: 'Doe',
              email: 'john@example.com',
              grades: ['09'],
            },
          ],
        }),
      });
      
      await provider.initialize(config);
      const result = await provider.fetchUsers();
      
      expect(result.count).toBe(1);
      expect(result.entities[0].externalId).toBe('user-1');
      expect(result.entities[0].role).toBe('student');
      expect(result.entities[0].firstName).toBe('John');
      expect(result.entities[0].lastName).toBe('Doe');
      expect(result.entities[0].grade).toBe('09');
      expect(result.entities[0].isActive).toBe(true);
    });
  });
});

describe('validateProviderConfig', () => {
  describe('CLEVER', () => {
    it('should require clientId, clientSecret, and districtId', () => {
      const result = validateProviderConfig('CLEVER', {});
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('clientId is required');
      expect(result.errors).toContain('clientSecret is required');
      expect(result.errors).toContain('districtId is required');
    });
    
    it('should pass with all required fields', () => {
      const result = validateProviderConfig('CLEVER', {
        clientId: 'abc',
        clientSecret: 'xyz',
        districtId: '123',
      });
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
  
  describe('CLASSLINK', () => {
    it('should require clientId, clientSecret, and tenantId', () => {
      const result = validateProviderConfig('CLASSLINK', {});
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('clientId is required');
      expect(result.errors).toContain('clientSecret is required');
      expect(result.errors).toContain('tenantId is required');
    });
  });
  
  describe('ONEROSTER_API', () => {
    it('should require baseUrl, clientId, and clientSecret', () => {
      const result = validateProviderConfig('ONEROSTER_API', {});
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('baseUrl is required');
      expect(result.errors).toContain('clientId is required');
      expect(result.errors).toContain('clientSecret is required');
    });
  });
  
  describe('ONEROSTER_CSV', () => {
    it('should require sftp config and remotePath', () => {
      const result = validateProviderConfig('ONEROSTER_CSV', {});
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('sftp configuration is required');
      expect(result.errors).toContain('remotePath is required');
    });
    
    it('should require sftp authentication', () => {
      const result = validateProviderConfig('ONEROSTER_CSV', {
        sftp: {
          host: 'sftp.example.com',
          username: 'user',
        },
        remotePath: '/data',
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('sftp authentication (password or privateKey) is required');
    });
    
    it('should pass with password auth', () => {
      const result = validateProviderConfig('ONEROSTER_CSV', {
        sftp: {
          host: 'sftp.example.com',
          username: 'user',
          password: 'pass',
        },
        remotePath: '/data',
      });
      
      expect(result.valid).toBe(true);
    });
    
    it('should pass with key auth', () => {
      const result = validateProviderConfig('ONEROSTER_CSV', {
        sftp: {
          host: 'sftp.example.com',
          username: 'user',
          privateKey: '-----BEGIN RSA PRIVATE KEY-----...',
        },
        remotePath: '/data',
      });
      
      expect(result.valid).toBe(true);
    });
  });
});
