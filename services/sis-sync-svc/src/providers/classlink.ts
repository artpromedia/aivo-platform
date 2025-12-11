/**
 * ClassLink SIS Provider
 * 
 * Implements the ISisProvider interface for ClassLink (https://www.classlink.com)
 * Uses ClassLink's Roster Server API (OneRoster 1.1 compatible)
 * 
 * @see https://developer.classlink.com/
 */

import {
  ISisProvider,
  ClassLinkConfig,
  SisSchool,
  SisClass,
  SisUser,
  SisEnrollment,
  SyncEntityResult,
  SisUserRole,
  EnrollmentRole,
} from './types';

const CLASSLINK_ROSTER_BASE = 'https://roster.classlink.com';
const PAGE_SIZE = 100;

interface ClassLinkOrg {
  sourcedId: string;
  status: 'active' | 'tobedeleted';
  dateLastModified?: string;
  name: string;
  type: 'school' | 'district' | 'local' | 'state' | 'national';
  identifier?: string;
  parent?: { sourcedId: string };
}

interface ClassLinkClass {
  sourcedId: string;
  status: 'active' | 'tobedeleted';
  dateLastModified?: string;
  title: string;
  classCode?: string;
  classType?: string;
  location?: string;
  grades?: string[];
  subjects?: string[];
  course?: { sourcedId: string };
  school: { sourcedId: string };
  terms?: Array<{ sourcedId: string }>;
  subjectCodes?: string[];
  periods?: string[];
}

interface ClassLinkUser {
  sourcedId: string;
  status: 'active' | 'tobedeleted';
  dateLastModified?: string;
  enabledUser: boolean;
  orgs: Array<{ sourcedId: string }>;
  role: 'student' | 'teacher' | 'administrator' | 'aide' | 'parent' | 'guardian';
  username?: string;
  userIds?: Array<{ type: string; identifier: string }>;
  givenName: string;
  familyName: string;
  middleName?: string;
  email?: string;
  grades?: string[];
  phone?: string;
}

interface ClassLinkEnrollment {
  sourcedId: string;
  status: 'active' | 'tobedeleted';
  dateLastModified?: string;
  class: { sourcedId: string };
  user: { sourcedId: string };
  role: 'student' | 'teacher' | 'aide';
  primary?: boolean;
  beginDate?: string;
  endDate?: string;
}

interface ClassLinkResponse<T> {
  [key: string]: T[];
}

export class ClassLinkProvider implements ISisProvider {
  readonly providerType = 'CLASSLINK' as const;
  private config: ClassLinkConfig | null = null;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  async initialize(config: ClassLinkConfig): Promise<void> {
    this.config = config;
    if (config.accessToken) {
      this.accessToken = config.accessToken;
      this.tokenExpiry = config.tokenExpiry || null;
    }
    
    // Refresh token if needed
    if (!this.accessToken || this.isTokenExpired()) {
      await this.refreshAccessToken();
    }
  }

  private isTokenExpired(): boolean {
    if (!this.tokenExpiry) return true;
    // Refresh 5 minutes before expiry
    return new Date() >= new Date(this.tokenExpiry.getTime() - 5 * 60 * 1000);
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    const tokenUrl = this.config.oauthUrl || 'https://launchpad.classlink.com/oauth2/v2/token';
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        scope: 'oneroster',
      }),
    });

    if (!response.ok) {
      throw new Error(`ClassLink OAuth error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = new Date(Date.now() + data.expires_in * 1000);
  }

  private async fetchFromClassLink<T>(endpoint: string): Promise<ClassLinkResponse<T>> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    if (!this.accessToken || this.isTokenExpired()) {
      await this.refreshAccessToken();
    }

    const url = `${CLASSLINK_ROSTER_BASE}/v1p1/${this.config.tenantId}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        await this.refreshAccessToken();
        return this.fetchFromClassLink(endpoint);
      }
      throw new Error(`ClassLink API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.fetchFromClassLink<ClassLinkOrg>('/orgs?limit=1');
      return { success: true, message: 'Successfully connected to ClassLink' };
    } catch (error) {
      return {
        success: false,
        message: `Failed to connect to ClassLink: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async fetchSchools(cursor?: string): Promise<SyncEntityResult<SisSchool>> {
    const offset = cursor ? parseInt(cursor, 10) : 0;
    const endpoint = `/orgs?limit=${PAGE_SIZE}&offset=${offset}&filter=type='school'`;
    
    const response = await this.fetchFromClassLink<ClassLinkOrg>(endpoint);
    const orgs = response.orgs || [];

    const schools: SisSchool[] = orgs
      .filter((org) => org.type === 'school')
      .map((org) => ({
        externalId: org.sourcedId,
        name: org.name,
        schoolNumber: org.identifier,
        isActive: org.status === 'active',
        rawData: org as unknown as Record<string, unknown>,
      }));

    return {
      entities: schools,
      count: schools.length,
      hasMore: orgs.length === PAGE_SIZE,
      nextCursor: orgs.length === PAGE_SIZE ? String(offset + PAGE_SIZE) : undefined,
      warnings: [],
    };
  }

  async fetchClasses(cursor?: string): Promise<SyncEntityResult<SisClass>> {
    const offset = cursor ? parseInt(cursor, 10) : 0;
    const endpoint = `/classes?limit=${PAGE_SIZE}&offset=${offset}`;
    
    const response = await this.fetchFromClassLink<ClassLinkClass>(endpoint);
    const classes = response.classes || [];

    const sisClasses: SisClass[] = classes.map((cls) => ({
      externalId: cls.sourcedId,
      schoolExternalId: cls.school.sourcedId,
      name: cls.title,
      courseCode: cls.classCode,
      subject: cls.subjects?.[0],
      grade: cls.grades?.[0],
      sectionNumber: cls.periods?.[0],
      isActive: cls.status === 'active',
      rawData: cls as unknown as Record<string, unknown>,
    }));

    return {
      entities: sisClasses,
      count: sisClasses.length,
      hasMore: classes.length === PAGE_SIZE,
      nextCursor: classes.length === PAGE_SIZE ? String(offset + PAGE_SIZE) : undefined,
      warnings: [],
    };
  }

  async fetchUsers(cursor?: string): Promise<SyncEntityResult<SisUser>> {
    const offset = cursor ? parseInt(cursor, 10) : 0;
    const endpoint = `/users?limit=${PAGE_SIZE}&offset=${offset}`;
    
    const response = await this.fetchFromClassLink<ClassLinkUser>(endpoint);
    const users = response.users || [];

    const sisUsers: SisUser[] = users.map((user) => {
      const studentNumber = user.userIds?.find((id) => id.type === 'student_number')?.identifier;
      const staffId = user.userIds?.find((id) => id.type === 'staff_id')?.identifier;

      return {
        externalId: user.sourcedId,
        role: this.mapRole(user.role),
        email: user.email,
        firstName: user.givenName,
        lastName: user.familyName,
        middleName: user.middleName,
        username: user.username,
        studentNumber,
        staffId,
        grade: user.grades?.[0],
        schoolExternalIds: user.orgs.map((org) => org.sourcedId),
        isActive: user.status === 'active' && user.enabledUser,
        rawData: user as unknown as Record<string, unknown>,
      };
    });

    return {
      entities: sisUsers,
      count: sisUsers.length,
      hasMore: users.length === PAGE_SIZE,
      nextCursor: users.length === PAGE_SIZE ? String(offset + PAGE_SIZE) : undefined,
      warnings: [],
    };
  }

  async fetchEnrollments(cursor?: string): Promise<SyncEntityResult<SisEnrollment>> {
    const offset = cursor ? parseInt(cursor, 10) : 0;
    const endpoint = `/enrollments?limit=${PAGE_SIZE}&offset=${offset}`;
    
    const response = await this.fetchFromClassLink<ClassLinkEnrollment>(endpoint);
    const enrollments = response.enrollments || [];

    const sisEnrollments: SisEnrollment[] = enrollments.map((enrollment) => ({
      externalId: enrollment.sourcedId,
      userExternalId: enrollment.user.sourcedId,
      classExternalId: enrollment.class.sourcedId,
      role: this.mapEnrollmentRole(enrollment.role),
      isPrimary: enrollment.primary ?? true,
      startDate: enrollment.beginDate ? new Date(enrollment.beginDate) : undefined,
      endDate: enrollment.endDate ? new Date(enrollment.endDate) : undefined,
      isActive: enrollment.status === 'active',
      rawData: enrollment as unknown as Record<string, unknown>,
    }));

    return {
      entities: sisEnrollments,
      count: sisEnrollments.length,
      hasMore: enrollments.length === PAGE_SIZE,
      nextCursor: enrollments.length === PAGE_SIZE ? String(offset + PAGE_SIZE) : undefined,
      warnings: [],
    };
  }

  async cleanup(): Promise<void> {
    this.config = null;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  private mapRole(role: ClassLinkUser['role']): SisUserRole {
    const roleMap: Record<ClassLinkUser['role'], SisUserRole> = {
      student: 'student',
      teacher: 'teacher',
      administrator: 'administrator',
      aide: 'aide',
      parent: 'parent',
      guardian: 'guardian',
    };
    return roleMap[role] || 'student';
  }

  private mapEnrollmentRole(role: ClassLinkEnrollment['role']): EnrollmentRole {
    const roleMap: Record<ClassLinkEnrollment['role'], EnrollmentRole> = {
      student: 'student',
      teacher: 'teacher',
      aide: 'aide',
    };
    return roleMap[role] || 'student';
  }
}
