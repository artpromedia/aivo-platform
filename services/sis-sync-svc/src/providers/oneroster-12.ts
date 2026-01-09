/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any */
/**
 * OneRoster 1.2 API Provider
 *
 * Production-ready OneRoster 1.2 implementation supporting:
 * - OAuth 2.0 client credentials authentication
 * - Pagination with offset/limit
 * - Delta queries for efficient sync
 * - Filter support
 * - Parent-student relationships
 *
 * OneRoster 1.2 is the latest standard from 1EdTech (formerly IMS Global)
 * and is widely supported by SIS vendors.
 *
 * @see https://www.1edtech.org/standards/oneroster
 * @author AIVO Platform Team
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { createHash } from 'crypto';
import { logger } from '../logger.js';
import type {
  ISisProvider,
  SisSchool,
  SisClass,
  SisUser,
  SisEnrollment,
  SisUserRole,
  SisProviderCredentials,
  SisParentStudentRelationship,
} from './types.js';
import type {
  SyncEntityType,
  DeltaFetchOptions,
  DeltaResponse,
  DeltaRecord,
} from '../sync/delta-sync-engine.js';

/**
 * OneRoster 1.2 API configuration
 */
export interface OneRoster12Config {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  tokenEndpoint?: string;
  pageSize?: number;
  rateLimitMs?: number;
  tenantId?: string;
  providerId?: string;
  schoolFilter?: string[];
}

/**
 * OneRoster OAuth token response
 */
interface OneRosterTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * OneRoster 1.2 API Provider
 */
export class OneRoster12Provider implements ISisProvider {
  readonly type = 'oneroster';
  readonly name = 'OneRoster 1.2';
  readonly supportsDelta = true;
  readonly supportsDeletionDetection = true;
  readonly rateLimitDelay?: number;

  private config: OneRoster12Config;
  private http: AxiosInstance;
  private accessToken?: string;
  private tokenExpiry?: Date;

  constructor(config: OneRoster12Config) {
    this.config = {
      pageSize: 1000,
      rateLimitMs: 50,
      ...config,
    };
    this.rateLimitDelay = this.config.rateLimitMs;

    this.http = axios.create({
      baseURL: `${config.baseUrl}/ims/oneroster/v1p2`,
      timeout: 30000,
      headers: {
        Accept: 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Setup axios interceptors
   */
  private setupInterceptors(): void {
    this.http.interceptors.request.use(async (requestConfig) => {
      const token = await this.getAccessToken();
      requestConfig.headers.Authorization = `Bearer ${token}`;
      return requestConfig;
    });

    this.http.interceptors.response.use(
      (response) => response,
      async (error: any) => {
        if (error.response?.status === 401) {
          this.accessToken = undefined;
          const token = await this.getAccessToken();
          if (error.config) {
            error.config.headers.Authorization = `Bearer ${token}`;
            return this.http.request(error.config);
          }
        }
        throw error;
      }
    );
  }

  /**
   * Get OAuth access token
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    const tokenUrl =
      this.config.tokenEndpoint ||
      `${this.config.baseUrl}/oauth/token`;

    try {
      const response = await axios.post<OneRosterTokenResponse>(
        tokenUrl,
        new URLSearchParams({
          grant_type: 'client_credentials',
          scope: 'https://purl.imsglobal.org/spec/or/v1p2/scope/roster.readonly',
        }),
        {
          auth: {
            username: this.config.clientId,
            password: this.config.clientSecret,
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(
        Date.now() + (response.data.expires_in - 300) * 1000
      );

      return this.accessToken;
    } catch (error) {
      logger.error({ err: error }, '[OneRoster12] Failed to get access token');
      throw new Error('OneRoster authentication failed');
    }
  }

  /**
   * Initialize provider
   */
  async initialize(credentials: SisProviderCredentials): Promise<void> {
    if (credentials.clientId && credentials.clientSecret) {
      this.config.clientId = credentials.clientId;
      this.config.clientSecret = credentials.clientSecret;
    }
    await this.getAccessToken();
    logger.info('[OneRoster12] Initialized successfully');
  }

  /**
   * Fetch all schools (orgs)
   */
  async fetchSchools(): Promise<SisSchool[]> {
    const schools: SisSchool[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await this.http.get<{ orgs: OneRosterOrg[] }>('/orgs', {
        params: {
          filter: "type='school'",
          limit: this.config.pageSize,
          offset,
        },
      });

      const orgs = response.data.orgs || [];
      schools.push(...orgs.map((o) => this.mapOrg(o)));

      hasMore = orgs.length === this.config.pageSize;
      offset += orgs.length;

      if (hasMore && this.rateLimitDelay) {
        await this.delay(this.rateLimitDelay);
      }
    }

    return schools;
  }

  /**
   * Fetch all classes
   */
  async fetchClasses(): Promise<SisClass[]> {
    const classes: SisClass[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await this.http.get<{ classes: OneRosterClass[] }>('/classes', {
        params: {
          limit: this.config.pageSize,
          offset,
        },
      });

      const items = response.data.classes || [];
      classes.push(...items.map((c) => this.mapClass(c)));

      hasMore = items.length === this.config.pageSize;
      offset += items.length;

      if (hasMore && this.rateLimitDelay) {
        await this.delay(this.rateLimitDelay);
      }
    }

    return classes;
  }

  /**
   * Fetch all users
   */
  async fetchUsers(): Promise<SisUser[]> {
    const users: SisUser[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await this.http.get<{ users: OneRosterUser[] }>('/users', {
        params: {
          limit: this.config.pageSize,
          offset,
        },
      });

      const items = response.data.users || [];
      users.push(...items.map((u) => this.mapUser(u)));

      hasMore = items.length === this.config.pageSize;
      offset += items.length;

      if (hasMore && this.rateLimitDelay) {
        await this.delay(this.rateLimitDelay);
      }
    }

    return users;
  }

  /**
   * Fetch all enrollments
   */
  async fetchEnrollments(): Promise<SisEnrollment[]> {
    const enrollments: SisEnrollment[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await this.http.get<{ enrollments: OneRosterEnrollment[] }>(
        '/enrollments',
        {
          params: {
            limit: this.config.pageSize,
            offset,
          },
        }
      );

      const items = response.data.enrollments || [];
      enrollments.push(...items.map((e) => this.mapEnrollment(e)));

      hasMore = items.length === this.config.pageSize;
      offset += items.length;

      if (hasMore && this.rateLimitDelay) {
        await this.delay(this.rateLimitDelay);
      }
    }

    return enrollments;
  }

  /**
   * Fetch parent-student relationships
   */
  async fetchRelationships(): Promise<SisParentStudentRelationship[]> {
    const relationships: SisParentStudentRelationship[] = [];

    // OneRoster 1.2 has parent relationships in users via agents field
    const users = await this.fetchUsers();

    for (const user of users) {
      if (user.role === 'student') {
        // Find parents/guardians linked to this student
        const studentDetails = await this.fetchUserDetails(user.sourceId);

        if (studentDetails.agents) {
          for (const agent of studentDetails.agents) {
            relationships.push({
              sourceId: `${agent.sourcedId}_${user.sourceId}`,
              parentSourceId: agent.sourcedId,
              studentSourceId: user.sourceId,
              relationshipType: this.mapRelationshipType(agent.role),
              isPrimary: agent.primary ?? false,
              legalGuardian: agent.legalGuardian ?? true,
              emergencyContact: agent.emergencyContact ?? false,
              pickupAuthorized: agent.pickupAuthorized ?? false,
              receivesMailing: true,
              residesWithStudent: agent.livesWithStudent,
              contactPriority: agent.priority,
            });
          }
        }
      }
    }

    return relationships;
  }

  /**
   * Fetch user details including agent relationships
   */
  private async fetchUserDetails(userId: string): Promise<OneRosterUserDetails> {
    const response = await this.http.get<{ user: OneRosterUserDetails }>(
      `/users/${userId}`
    );
    return response.data.user;
  }

  /**
   * Fetch delta changes
   */
  async fetchDelta(
    entityType: SyncEntityType,
    options: DeltaFetchOptions
  ): Promise<DeltaResponse> {
    const records: DeltaRecord[] = [];
    const endpoint = this.getEntityEndpoint(entityType);

    if (!endpoint) {
      return { records, hasMore: false };
    }

    const params: Record<string, any> = {
      limit: options.limit,
      offset: options.cursor ? parseInt(options.cursor, 10) : 0,
    };

    // OneRoster 1.2 supports dateLastModified filter
    if (options.since) {
      params.filter = `dateLastModified>='${options.since.toISOString()}'`;
    }

    try {
      const response = await this.http.get<{ [key: string]: any[] }>(endpoint, { params });

      const items = Object.values(response.data)[0] || [];

      for (const item of items) {
        records.push({
          id: item.sourcedId,
          entityType,
          entityId: item.sourcedId,
          operation: item.status === 'tobedeleted' ? 'delete' : 'update',
          sourceData: item,
          currentHash: this.calculateHash(item),
          sourceSystem: 'oneroster',
          sourceId: item.sourcedId,
          timestamp: new Date(item.dateLastModified || Date.now()),
        });
      }

      const nextOffset = params.offset + items.length;
      const hasMore = items.length === options.limit;

      return {
        records,
        hasMore,
        nextCursor: hasMore ? nextOffset.toString() : undefined,
      };
    } catch (error) {
      logger.error({ err: error }, '[OneRoster12] Delta fetch failed');
      throw error;
    }
  }

  /**
   * Get all source IDs for deletion detection
   */
  async getAllSourceIds(
    entityType: SyncEntityType,
    _options?: { filters?: Record<string, unknown> }
  ): Promise<string[]> {
    const endpoint = this.getEntityEndpoint(entityType);

    if (!endpoint) {
      return [];
    }

    const ids: string[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await this.http.get<{ [key: string]: any[] }>(endpoint, {
        params: {
          limit: this.config.pageSize,
          offset,
          fields: 'sourcedId',
        },
      });

      const items = Object.values(response.data)[0] || [];
      ids.push(...items.map((item) => item.sourcedId));

      hasMore = items.length === this.config.pageSize;
      offset += items.length;
    }

    return ids;
  }

  /**
   * Get endpoint for entity type
   */
  private getEntityEndpoint(entityType: SyncEntityType): string | undefined {
    const endpoints: Record<string, string> = {
      org: '/orgs',
      student: '/users',
      teacher: '/users',
      parent: '/users',
      class: '/classes',
      enrollment: '/enrollments',
      term: '/academicSessions',
    };
    return endpoints[entityType];
  }

  // Mapping methods

  private mapOrg(org: OneRosterOrg): SisSchool {
    return {
      sourceId: org.sourcedId,
      name: org.name,
      schoolNumber: org.identifier,
      schoolType: this.mapSchoolType(org.type),
      nces: org.identifiers?.find((i) => i.type === 'NCES')?.identifier,
      stateId: org.identifiers?.find((i) => i.type === 'State')?.identifier,
      status: org.status === 'active' ? 'active' : 'inactive',
    };
  }

  private mapClass(cls: OneRosterClass): SisClass {
    return {
      sourceId: cls.sourcedId,
      name: cls.title,
      sectionCode: cls.classCode,
      courseCode: cls.course?.sourcedId,
      schoolSourceId: cls.school?.sourcedId || '',
      subjects: cls.subjects || [],
      grades: cls.grades || [],
      period: cls.periods?.[0],
      room: cls.location,
      termSourceIds: cls.terms?.map((t) => t.sourcedId) || [],
      status: cls.status === 'active' ? 'active' : 'inactive',
    };
  }

  private mapUser(user: OneRosterUser): SisUser {
    return {
      sourceId: user.sourcedId,
      firstName: user.givenName,
      lastName: user.familyName,
      middleName: user.middleName,
      email: user.email,
      username: user.username || user.identifier,
      role: this.mapRole(user.role),
      grade: user.grades?.[0],
      studentNumber: user.identifier,
      phone: user.phone,
      schoolSourceIds: user.orgs?.map((o) => o.sourcedId) || [],
      demographics: {
        birthDate: user.birthDate ? new Date(user.birthDate) : undefined,
        gender: this.mapGender(user.sex),
      },
      status: user.status === 'active' ? 'active' : 'inactive',
    };
  }

  private mapEnrollment(enrollment: OneRosterEnrollment): SisEnrollment {
    return {
      sourceId: enrollment.sourcedId,
      userSourceId: enrollment.user?.sourcedId || '',
      classSourceId: enrollment.class?.sourcedId || '',
      role: this.mapEnrollmentRole(enrollment.role),
      primary: enrollment.primary ?? false,
      beginDate: enrollment.beginDate ? new Date(enrollment.beginDate) : undefined,
      endDate: enrollment.endDate ? new Date(enrollment.endDate) : undefined,
      status: enrollment.status === 'active' ? 'active' : 'inactive',
    };
  }

  private mapRole(role: string): SisUserRole {
    const roleMap: Record<string, SisUserRole> = {
      student: 'student',
      teacher: 'teacher',
      administrator: 'administrator',
      aide: 'aide',
      parent: 'parent',
      guardian: 'guardian',
      proctor: 'aide',
      relative: 'guardian',
    };
    return roleMap[role?.toLowerCase()] || 'student';
  }

  private mapEnrollmentRole(role: string): 'student' | 'teacher' | 'aide' {
    const roleMap: Record<string, 'student' | 'teacher' | 'aide'> = {
      student: 'student',
      teacher: 'teacher',
      aide: 'aide',
      proctor: 'aide',
      administrator: 'teacher',
    };
    return roleMap[role?.toLowerCase()] || 'student';
  }

  private mapSchoolType(type: string): string {
    const typeMap: Record<string, string> = {
      school: 'school',
      district: 'district',
      local: 'district',
      state: 'state',
      national: 'national',
    };
    return typeMap[type?.toLowerCase()] || 'school';
  }

  private mapGender(sex?: string): 'male' | 'female' | 'non-binary' | undefined {
    if (!sex) return undefined;
    const lower = sex.toLowerCase();
    if (lower === 'male' || lower === 'm') return 'male';
    if (lower === 'female' || lower === 'f') return 'female';
    return 'non-binary';
  }

  private mapRelationshipType(
    role?: string
  ): 'parent' | 'guardian' | 'mother' | 'father' | 'grandparent' | 'other' {
    if (!role) return 'guardian';
    const lower = role.toLowerCase();
    if (lower.includes('mother')) return 'mother';
    if (lower.includes('father')) return 'father';
    if (lower.includes('grand')) return 'grandparent';
    if (lower.includes('parent')) return 'parent';
    if (lower.includes('guardian')) return 'guardian';
    return 'other';
  }

  private calculateHash(data: Record<string, any>): string {
    const normalized = JSON.stringify(data, Object.keys(data).sort());
    return createHash('sha256').update(normalized).digest('hex');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// OneRoster 1.2 Types

interface OneRosterOrg {
  sourcedId: string;
  status: string;
  dateLastModified?: string;
  name: string;
  type: string;
  identifier?: string;
  identifiers?: Array<{ type: string; identifier: string }>;
  parent?: { sourcedId: string };
}

interface OneRosterClass {
  sourcedId: string;
  status: string;
  dateLastModified?: string;
  title: string;
  classCode?: string;
  classType?: string;
  location?: string;
  grades?: string[];
  subjects?: string[];
  course?: { sourcedId: string };
  school?: { sourcedId: string };
  terms?: Array<{ sourcedId: string }>;
  periods?: string[];
}

interface OneRosterUser {
  sourcedId: string;
  status: string;
  dateLastModified?: string;
  enabledUser: boolean;
  role: string;
  givenName: string;
  familyName: string;
  middleName?: string;
  email?: string;
  username?: string;
  identifier?: string;
  phone?: string;
  sms?: string;
  birthDate?: string;
  sex?: string;
  grades?: string[];
  orgs?: Array<{ sourcedId: string }>;
  agents?: Array<{ sourcedId: string }>;
}

interface OneRosterUserDetails extends OneRosterUser {
  agents?: Array<{
    sourcedId: string;
    role?: string;
    primary?: boolean;
    legalGuardian?: boolean;
    emergencyContact?: boolean;
    pickupAuthorized?: boolean;
    livesWithStudent?: boolean;
    priority?: number;
  }>;
}

interface OneRosterEnrollment {
  sourcedId: string;
  status: string;
  dateLastModified?: string;
  role: string;
  primary?: boolean;
  beginDate?: string;
  endDate?: string;
  user?: { sourcedId: string };
  class?: { sourcedId: string };
  school?: { sourcedId: string };
}
