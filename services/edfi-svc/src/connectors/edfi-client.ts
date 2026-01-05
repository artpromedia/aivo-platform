/**
 * Ed-Fi API Client
 *
 * Handles authentication and API requests to Ed-Fi ODS/API endpoints.
 * Supports Ed-Fi API versions 5.3, 6.1, and 7.0.
 */

import axios, { type AxiosInstance, type AxiosError } from 'axios';

import type { EdfiTokenResponse, EdfiApiError, EdfiResource } from '../types/edfi-resources';

export type EdfiApiVersion = 'V5_3' | 'V6_1' | 'V7_0';

export interface EdfiClientConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  apiVersion: EdfiApiVersion;
  schoolYear: number;
}

export interface EdfiClientOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

const DEFAULT_OPTIONS: EdfiClientOptions = {
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
};

// Resource endpoint mappings by API version
const RESOURCE_ENDPOINTS: Record<EdfiApiVersion, Record<string, string>> = {
  V5_3: {
    students: '/ed-fi/students',
    studentSchoolAssociations: '/ed-fi/studentSchoolAssociations',
    studentSectionAssociations: '/ed-fi/studentSectionAssociations',
    staff: '/ed-fi/staffs',
    staffSectionAssociations: '/ed-fi/staffSectionAssociations',
    schools: '/ed-fi/schools',
    localEducationAgencies: '/ed-fi/localEducationAgencies',
    courses: '/ed-fi/courses',
    sections: '/ed-fi/sections',
    studentAssessments: '/ed-fi/studentAssessments',
    grades: '/ed-fi/grades',
    studentSchoolAttendanceEvents: '/ed-fi/studentSchoolAttendanceEvents',
    learningStandards: '/ed-fi/learningStandards',
  },
  V6_1: {
    students: '/ed-fi/students',
    studentSchoolAssociations: '/ed-fi/studentSchoolAssociations',
    studentSectionAssociations: '/ed-fi/studentSectionAssociations',
    staff: '/ed-fi/staffs',
    staffSectionAssociations: '/ed-fi/staffSectionAssociations',
    schools: '/ed-fi/schools',
    localEducationAgencies: '/ed-fi/localEducationAgencies',
    courses: '/ed-fi/courses',
    sections: '/ed-fi/sections',
    studentAssessments: '/ed-fi/studentAssessments',
    grades: '/ed-fi/grades',
    studentSchoolAttendanceEvents: '/ed-fi/studentSchoolAttendanceEvents',
    learningStandards: '/ed-fi/learningStandards',
  },
  V7_0: {
    students: '/data/v3/ed-fi/students',
    studentSchoolAssociations: '/data/v3/ed-fi/studentSchoolAssociations',
    studentSectionAssociations: '/data/v3/ed-fi/studentSectionAssociations',
    staff: '/data/v3/ed-fi/staffs',
    staffSectionAssociations: '/data/v3/ed-fi/staffSectionAssociations',
    schools: '/data/v3/ed-fi/schools',
    localEducationAgencies: '/data/v3/ed-fi/localEducationAgencies',
    courses: '/data/v3/ed-fi/courses',
    sections: '/data/v3/ed-fi/sections',
    studentAssessments: '/data/v3/ed-fi/studentAssessments',
    grades: '/data/v3/ed-fi/grades',
    studentSchoolAttendanceEvents: '/data/v3/ed-fi/studentSchoolAttendanceEvents',
    learningStandards: '/data/v3/ed-fi/learningStandards',
  },
};

export class EdfiClient {
  private config: EdfiClientConfig;
  private options: EdfiClientOptions;
  private httpClient: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config: EdfiClientConfig, options: EdfiClientOptions = {}) {
    this.config = config;
    this.options = { ...DEFAULT_OPTIONS, ...options };

    this.httpClient = axios.create({
      baseURL: config.baseUrl,
      timeout: this.options.timeout,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<EdfiApiError>) => {
        // Handle token expiration
        if (error.response?.status === 401) {
          this.accessToken = null;
          this.tokenExpiry = null;
        }
        throw this.formatError(error);
      }
    );
  }

  /**
   * Authenticate with Ed-Fi API using OAuth 2.0 client credentials flow
   */
  async authenticate(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    const tokenUrl = this.getTokenUrl();
    const authString = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString(
      'base64'
    );

    try {
      const response = await axios.post<EdfiTokenResponse>(
        tokenUrl,
        'grant_type=client_credentials',
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${authString}`,
          },
        }
      );

      this.accessToken = response.data.access_token;
      // Set expiry with 5-minute buffer
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 300) * 1000);

      return this.accessToken;
    } catch (error) {
      throw new Error(
        `Ed-Fi authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Test connection to Ed-Fi API
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    serverInfo?: { version: string; dataModel: string };
  }> {
    try {
      await this.authenticate();

      // Try to fetch API info
      const infoUrl = this.getApiInfoUrl();
      const token = await this.authenticate();

      const response = await this.httpClient.get(infoUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      return {
        success: true,
        message: `Successfully connected to Ed-Fi ODS/API ${this.config.apiVersion}`,
        serverInfo: {
          version: response.data?.version || this.config.apiVersion,
          dataModel: response.data?.dataModels?.[0]?.version || 'Unknown',
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Create a resource in Ed-Fi
   */
  async create<T extends EdfiResource>(
    resourceType: string,
    data: T
  ): Promise<{ id: string; resource: T }> {
    const token = await this.authenticate();
    const endpoint = this.getResourceEndpoint(resourceType);

    const response = await this.httpClient.post(endpoint, data, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Ed-Fi returns the resource ID in the Location header
    const location = response.headers.location as string;
    const id = location?.split('/').pop() || '';

    return { id, resource: data };
  }

  /**
   * Update a resource in Ed-Fi
   */
  async update<T extends EdfiResource>(
    resourceType: string,
    id: string,
    data: T
  ): Promise<{ id: string; resource: T }> {
    const token = await this.authenticate();
    const endpoint = `${this.getResourceEndpoint(resourceType)}/${id}`;

    await this.httpClient.put(endpoint, data, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return { id, resource: data };
  }

  /**
   * Upsert a resource (create or update based on natural key)
   */
  async upsert<T extends EdfiResource>(
    resourceType: string,
    data: T
  ): Promise<{ id: string; resource: T; created: boolean }> {
    const token = await this.authenticate();
    const endpoint = this.getResourceEndpoint(resourceType);

    try {
      // Try to create first
      const response = await this.httpClient.post(endpoint, data, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const location = response.headers.location as string;
      const id = location?.split('/').pop() || '';

      return { id, resource: data, created: true };
    } catch (error) {
      // If conflict (409), resource exists - try to update
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        // Get existing resource ID from error or fetch it
        const existingId = await this.findResourceId(resourceType, data);
        if (existingId) {
          await this.update(resourceType, existingId, data);
          return { id: existingId, resource: data, created: false };
        }
      }
      throw error;
    }
  }

  /**
   * Delete a resource from Ed-Fi
   */
  async delete(resourceType: string, id: string): Promise<void> {
    const token = await this.authenticate();
    const endpoint = `${this.getResourceEndpoint(resourceType)}/${id}`;

    await this.httpClient.delete(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Get a single resource by ID
   */
  async get<T extends EdfiResource>(resourceType: string, id: string): Promise<T | null> {
    const token = await this.authenticate();
    const endpoint = `${this.getResourceEndpoint(resourceType)}/${id}`;

    try {
      const response = await this.httpClient.get<T>(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * List resources with optional filters and pagination
   */
  async list<T extends EdfiResource>(
    resourceType: string,
    params?: {
      offset?: number;
      limit?: number;
      filters?: Record<string, string | number | boolean>;
    }
  ): Promise<{ data: T[]; totalCount?: number }> {
    const token = await this.authenticate();
    const endpoint = this.getResourceEndpoint(resourceType);

    const queryParams: Record<string, string | number | boolean> = {
      offset: params?.offset ?? 0,
      limit: params?.limit ?? 100,
      ...params?.filters,
    };

    const response = await this.httpClient.get<T[]>(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
      params: queryParams,
    });

    // Total count may be in header
    const totalCount = response.headers['total-count']
      ? parseInt(response.headers['total-count'] as string, 10)
      : undefined;

    return { data: response.data, totalCount };
  }

  /**
   * Bulk upsert multiple resources
   */
  async bulkUpsert<T extends EdfiResource>(
    resourceType: string,
    resources: T[],
    options?: { batchSize?: number }
  ): Promise<{
    created: number;
    updated: number;
    errors: { index: number; error: string; resource: T }[];
  }> {
    const batchSize = options?.batchSize ?? 25;
    let created = 0;
    let updated = 0;
    const errors: { index: number; error: string; resource: T }[] = [];

    // Process in batches
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

  /**
   * Get changes since a specific date (for delta sync)
   */
  async getChanges<T extends EdfiResource>(
    resourceType: string,
    since: Date,
    params?: { offset?: number; limit?: number }
  ): Promise<{ data: T[]; hasMore: boolean }> {
    const token = await this.authenticate();
    const endpoint = this.getResourceEndpoint(resourceType);

    // Ed-Fi supports change queries via deltas endpoint
    const deltaEndpoint = `${endpoint}/deltas`;

    try {
      const response = await this.httpClient.get<T[]>(deltaEndpoint, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          minChangeVersion: since.toISOString(),
          offset: params?.offset ?? 0,
          limit: params?.limit ?? 100,
        },
      });

      const limit = params?.limit ?? 100;
      return {
        data: response.data,
        hasMore: response.data.length >= limit,
      };
    } catch (error) {
      // Delta endpoint may not be available - fall back to date filter
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        const response = await this.httpClient.get<T[]>(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            lastModifiedDate: since.toISOString().split('T')[0],
            offset: params?.offset ?? 0,
            limit: params?.limit ?? 100,
          },
        });

        const limit = params?.limit ?? 100;
        return {
          data: response.data,
          hasMore: response.data.length >= limit,
        };
      }
      throw error;
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ════════════════════════════════════════════════════════════════════════════

  private getTokenUrl(): string {
    switch (this.config.apiVersion) {
      case 'V5_3':
        return `${this.config.baseUrl}/oauth/token`;
      case 'V6_1':
        return `${this.config.baseUrl}/oauth/token`;
      case 'V7_0':
        return `${this.config.baseUrl}/connect/token`;
      default:
        return `${this.config.baseUrl}/oauth/token`;
    }
  }

  private getApiInfoUrl(): string {
    switch (this.config.apiVersion) {
      case 'V5_3':
        return '/';
      case 'V6_1':
        return '/';
      case 'V7_0':
        return '/metadata';
      default:
        return '/';
    }
  }

  private getResourceEndpoint(resourceType: string): string {
    const endpoints = RESOURCE_ENDPOINTS[this.config.apiVersion];
    const endpoint = endpoints[resourceType];

    if (!endpoint) {
      throw new Error(
        `Unknown resource type: ${resourceType} for API version ${this.config.apiVersion}`
      );
    }

    return endpoint;
  }

  private async findResourceId<T extends EdfiResource>(
    _resourceType: string,
    _data: T
  ): Promise<string | null> {
    // Implementation would search for resource by natural key
    // This is a placeholder - actual implementation depends on resource type
    return null;
  }

  private formatError(error: AxiosError<EdfiApiError>): Error {
    const apiError = error.response?.data;
    const status = error.response?.status;

    let message = `Ed-Fi API Error (${status}): `;

    if (apiError?.message) {
      message += apiError.message;
    } else if (apiError?.detail) {
      message += apiError.detail;
    } else {
      message += error.message;
    }

    if (apiError?.modelStateDictionary) {
      const validationErrors = Object.entries(apiError.modelStateDictionary)
        .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
        .join('; ');
      message += ` Validation errors: ${validationErrors}`;
    }

    return new Error(message);
  }
}

export default EdfiClient;
