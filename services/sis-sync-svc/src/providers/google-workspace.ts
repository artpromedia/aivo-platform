/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
/**
 * Google Workspace for Education SIS Provider
 *
 * Implements the ISisProvider interface for Google Workspace.
 * Uses:
 * - Google Admin SDK Directory API for users and organizational units
 * - Google Classroom API for classes and enrollments (optional)
 *
 * @see https://developers.google.com/admin-sdk/directory
 * @see https://developers.google.com/classroom
 */

import {
  ISisProvider,
  GoogleWorkspaceConfig,
  SisSchool,
  SisClass,
  SisUser,
  SisEnrollment,
  SyncEntityResult,
  SisUserRole,
  EnrollmentRole,
} from './types';

// ============================================================================
// Google API Constants
// ============================================================================

const GOOGLE_DIRECTORY_API = 'https://admin.googleapis.com/admin/directory/v1';
const GOOGLE_CLASSROOM_API = 'https://classroom.googleapis.com/v1';
const PAGE_SIZE = 100;

// Required OAuth scopes for rostering
export const GOOGLE_ROSTERING_SCOPES = [
  'https://www.googleapis.com/auth/admin.directory.user.readonly',
  'https://www.googleapis.com/auth/admin.directory.orgunit.readonly',
  'https://www.googleapis.com/auth/admin.directory.group.readonly',
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
  'https://www.googleapis.com/auth/classroom.profile.emails',
];

// SSO scopes (OpenID Connect)
export const GOOGLE_SSO_SCOPES = [
  'openid',
  'email',
  'profile',
];

// ============================================================================
// Google API Response Types
// ============================================================================

interface GoogleUser {
  id: string;
  primaryEmail: string;
  name: {
    givenName: string;
    familyName: string;
    fullName?: string;
  };
  isAdmin?: boolean;
  isDelegatedAdmin?: boolean;
  suspended?: boolean;
  orgUnitPath?: string;
  customSchemas?: Record<string, Record<string, unknown>>;
  relations?: Array<{ type: string; value: string }>;
  externalIds?: Array<{ type: string; value: string }>;
  organizations?: Array<{
    title?: string;
    department?: string;
    primary?: boolean;
  }>;
  creationTime?: string;
  lastLoginTime?: string;
}

interface GoogleOrgUnit {
  orgUnitId: string;
  name: string;
  orgUnitPath: string;
  parentOrgUnitPath?: string;
  description?: string;
  etag?: string;
}

interface GoogleCourse {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
  description?: string;
  room?: string;
  ownerId: string;
  creationTime?: string;
  updateTime?: string;
  courseState: 'ACTIVE' | 'ARCHIVED' | 'PROVISIONED' | 'DECLINED' | 'SUSPENDED';
  alternateLink?: string;
  teacherGroupEmail?: string;
  courseGroupEmail?: string;
  guardiansEnabled?: boolean;
}

interface GoogleStudent {
  courseId: string;
  userId: string;
  profile: {
    id: string;
    name: { givenName: string; familyName: string; fullName?: string };
    emailAddress?: string;
  };
  studentWorkFolder?: { id: string; alternateLink?: string };
}

interface GoogleTeacher {
  courseId: string;
  userId: string;
  profile: {
    id: string;
    name: { givenName: string; familyName: string; fullName?: string };
    emailAddress?: string;
  };
}

interface GoogleListResponse<T> {
  nextPageToken?: string;
}

interface GoogleUsersResponse extends GoogleListResponse<GoogleUser> {
  users?: GoogleUser[];
}

interface GoogleOrgUnitsResponse {
  organizationUnits?: GoogleOrgUnit[];
}

interface GoogleCoursesResponse extends GoogleListResponse<GoogleCourse> {
  courses?: GoogleCourse[];
}

interface GoogleStudentsResponse extends GoogleListResponse<GoogleStudent> {
  students?: GoogleStudent[];
}

interface GoogleTeachersResponse extends GoogleListResponse<GoogleTeacher> {
  teachers?: GoogleTeacher[];
}

// ============================================================================
// Google Workspace Provider Implementation
// ============================================================================

export class GoogleWorkspaceProvider implements ISisProvider {
  readonly providerType = 'GOOGLE_WORKSPACE' as const;
  private config: GoogleWorkspaceConfig | null = null;
  private accessToken: string | null = null;

  /**
   * Initialize the provider with configuration
   */
  async initialize(config: GoogleWorkspaceConfig): Promise<void> {
    this.config = config;
    this.accessToken = config.accessToken || null;

    if (!this.accessToken) {
      throw new Error('Google Workspace provider requires OAuth access token');
    }

    // Validate required config
    if (!config.domain) {
      throw new Error('Google Workspace provider requires domain configuration');
    }

    if (!config.customerId) {
      throw new Error('Google Workspace provider requires customerId (e.g., C01234567)');
    }
  }

  /**
   * Test the connection to Google APIs
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.accessToken) {
      return { success: false, message: 'No access token configured' };
    }

    try {
      // Try to fetch a single user to verify API access
      const response = await fetch(
        `${GOOGLE_DIRECTORY_API}/users?customer=${this.config?.customerId}&maxResults=1`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return { 
          success: false, 
          message: `API error: ${error.error?.message || response.statusText}` 
        };
      }

      return { 
        success: true, 
        message: 'Successfully connected to Google Workspace' 
      };
    } catch (error) {
      return { 
        success: false, 
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Fetch schools (organizational units in Google Workspace)
   * Google doesn't have a direct "school" concept, so we use Organizational Units
   */
  async fetchSchools(cursor?: string): Promise<SyncEntityResult<SisSchool>> {
    if (!this.config || !this.accessToken) {
      throw new Error('Provider not initialized');
    }

    const schools: SisSchool[] = [];
    const warnings: string[] = [];

    try {
      // Fetch organizational units (OUs are the closest to schools in Google)
      const response = await fetch(
        `${GOOGLE_DIRECTORY_API}/customer/${this.config.customerId}/orgunits?type=all`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch organizational units: ${response.statusText}`);
      }

      const data: GoogleOrgUnitsResponse = await response.json();

      // Filter to school-level OUs if orgUnitPaths are configured
      const orgUnits = data.organizationUnits || [];
      const filteredOrgUnits = this.config.orgUnitPaths?.length
        ? orgUnits.filter(ou => 
            this.config!.orgUnitPaths!.some(path => ou.orgUnitPath.startsWith(path))
          )
        : orgUnits;

      for (const ou of filteredOrgUnits) {
        // Only include OUs that look like schools (e.g., /Schools/Elementary, not /Schools)
        // This is heuristic - districts should configure orgUnitPaths for accuracy
        if (ou.orgUnitPath.split('/').filter(Boolean).length >= 2) {
          schools.push(this.mapOrgUnitToSchool(ou));
        }
      }
    } catch (error) {
      warnings.push(`Error fetching organizational units: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    return {
      entities: schools,
      count: schools.length,
      hasMore: false, // Google returns all OUs in one call
      warnings,
    };
  }

  /**
   * Fetch classes from Google Classroom
   */
  async fetchClasses(cursor?: string): Promise<SyncEntityResult<SisClass>> {
    if (!this.config || !this.accessToken) {
      throw new Error('Provider not initialized');
    }

    if (!this.config.useClassroomApi) {
      // If not using Classroom API, no classes to sync
      return {
        entities: [],
        count: 0,
        hasMore: false,
        warnings: ['Classroom API not enabled for this provider'],
      };
    }

    const classes: SisClass[] = [];
    const warnings: string[] = [];

    try {
      let pageToken: string | undefined = cursor;
      
      do {
        const url = new URL(`${GOOGLE_CLASSROOM_API}/courses`);
        url.searchParams.set('pageSize', String(PAGE_SIZE));
        url.searchParams.set('courseStates', 'ACTIVE');
        if (pageToken) {
          url.searchParams.set('pageToken', pageToken);
        }

        const response = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch courses: ${response.statusText}`);
        }

        const data: GoogleCoursesResponse = await response.json();

        for (const course of data.courses || []) {
          classes.push(this.mapCourseToClass(course));
        }

        pageToken = data.nextPageToken;

        // Return one page at a time for pagination
        if (pageToken && classes.length >= PAGE_SIZE) {
          return {
            entities: classes,
            count: classes.length,
            hasMore: true,
            nextCursor: pageToken,
            warnings,
          };
        }
      } while (pageToken);
    } catch (error) {
      warnings.push(`Error fetching courses: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    return {
      entities: classes,
      count: classes.length,
      hasMore: false,
      warnings,
    };
  }

  /**
   * Fetch users from Google Directory
   */
  async fetchUsers(cursor?: string): Promise<SyncEntityResult<SisUser>> {
    if (!this.config || !this.accessToken) {
      throw new Error('Provider not initialized');
    }

    const users: SisUser[] = [];
    const warnings: string[] = [];

    try {
      const url = new URL(`${GOOGLE_DIRECTORY_API}/users`);
      url.searchParams.set('customer', this.config.customerId);
      url.searchParams.set('maxResults', String(PAGE_SIZE));
      url.searchParams.set('projection', 'full');
      if (cursor) {
        url.searchParams.set('pageToken', cursor);
      }

      // Filter by domain
      url.searchParams.set('domain', this.config.domain);

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`);
      }

      const data: GoogleUsersResponse = await response.json();

      for (const user of data.users || []) {
        // Skip suspended users
        if (user.suspended) {
          continue;
        }

        // Filter by organizational unit if configured
        if (this.config.orgUnitPaths?.length && user.orgUnitPath) {
          const matchesOrgUnit = this.config.orgUnitPaths.some(
            path => user.orgUnitPath!.startsWith(path)
          );
          if (!matchesOrgUnit) {
            continue;
          }
        }

        users.push(this.mapGoogleUserToSisUser(user));
      }

      return {
        entities: users,
        count: users.length,
        hasMore: !!data.nextPageToken,
        nextCursor: data.nextPageToken,
        warnings,
      };
    } catch (error) {
      warnings.push(`Error fetching users: ${error instanceof Error ? error.message : 'Unknown'}`);
      return {
        entities: users,
        count: users.length,
        hasMore: false,
        warnings,
      };
    }
  }

  /**
   * Fetch enrollments from Google Classroom
   */
  async fetchEnrollments(cursor?: string): Promise<SyncEntityResult<SisEnrollment>> {
    if (!this.config || !this.accessToken) {
      throw new Error('Provider not initialized');
    }

    if (!this.config.useClassroomApi) {
      return {
        entities: [],
        count: 0,
        hasMore: false,
        warnings: ['Classroom API not enabled for this provider'],
      };
    }

    const enrollments: SisEnrollment[] = [];
    const warnings: string[] = [];

    // Parse cursor: "courseId|studentPageToken|teacherPhase"
    let currentCourseId: string | undefined;
    let studentPageToken: string | undefined;
    let inTeacherPhase = false;

    if (cursor) {
      const parts = cursor.split('|');
      currentCourseId = parts[0] || undefined;
      studentPageToken = parts[1] || undefined;
      inTeacherPhase = parts[2] === 'teachers';
    }

    try {
      // First, get all active courses
      const coursesResponse = await fetch(
        `${GOOGLE_CLASSROOM_API}/courses?courseStates=ACTIVE`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!coursesResponse.ok) {
        throw new Error(`Failed to fetch courses: ${coursesResponse.statusText}`);
      }

      const coursesData: GoogleCoursesResponse = await coursesResponse.json();
      const courses = coursesData.courses || [];

      // Find starting point in course list
      let startIndex = 0;
      if (currentCourseId) {
        startIndex = courses.findIndex(c => c.id === currentCourseId);
        if (startIndex === -1) startIndex = 0;
      }

      // Process courses one at a time
      for (let i = startIndex; i < courses.length; i++) {
        const course = courses[i];

        // Fetch students for this course
        if (!inTeacherPhase) {
          const studentEnrollments = await this.fetchCourseStudents(
            course.id,
            studentPageToken
          );
          enrollments.push(...studentEnrollments.enrollments);

          if (studentEnrollments.hasMore) {
            return {
              entities: enrollments,
              count: enrollments.length,
              hasMore: true,
              nextCursor: `${course.id}|${studentEnrollments.nextPageToken}|students`,
              warnings,
            };
          }
        }

        // Fetch teachers for this course
        const teacherEnrollments = await this.fetchCourseTeachers(course.id);
        enrollments.push(...teacherEnrollments);

        // If we've accumulated enough, return with cursor
        if (enrollments.length >= PAGE_SIZE && i < courses.length - 1) {
          return {
            entities: enrollments,
            count: enrollments.length,
            hasMore: true,
            nextCursor: `${courses[i + 1].id}||students`,
            warnings,
          };
        }

        // Reset for next course
        studentPageToken = undefined;
        inTeacherPhase = false;
      }
    } catch (error) {
      warnings.push(`Error fetching enrollments: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    return {
      entities: enrollments,
      count: enrollments.length,
      hasMore: false,
      warnings,
    };
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    this.config = null;
    this.accessToken = null;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private mapOrgUnitToSchool(ou: GoogleOrgUnit): SisSchool {
    return {
      externalId: ou.orgUnitId,
      name: ou.name,
      schoolNumber: ou.orgUnitPath,
      schoolType: this.inferSchoolType(ou.name, ou.orgUnitPath),
      isActive: true,
      rawData: ou as unknown as Record<string, unknown>,
    };
  }

  private mapCourseToClass(course: GoogleCourse): SisClass {
    return {
      externalId: course.id,
      schoolExternalId: '', // Google Classroom doesn't have explicit school association
      name: course.name,
      courseCode: course.section,
      subject: this.inferSubject(course.name),
      grade: this.inferGrade(course.name),
      isActive: course.courseState === 'ACTIVE',
      rawData: course as unknown as Record<string, unknown>,
    };
  }

  private mapGoogleUserToSisUser(user: GoogleUser): SisUser {
    // Determine role based on organization path and admin status
    let role: SisUserRole = 'student';
    if (user.isAdmin || user.isDelegatedAdmin) {
      role = 'administrator';
    } else if (this.isTeacherPath(user.orgUnitPath)) {
      role = 'teacher';
    } else if (this.isStudentPath(user.orgUnitPath)) {
      role = 'student';
    }

    // Extract student number from external IDs if available
    const studentNumber = user.externalIds?.find(
      id => id.type === 'organization' || id.type === 'custom'
    )?.value;

    // Extract school association from org unit path
    const schoolExternalIds = user.orgUnitPath 
      ? [this.extractSchoolFromOrgUnit(user.orgUnitPath)] 
      : [];

    return {
      externalId: user.id,
      role,
      email: user.primaryEmail,
      firstName: user.name.givenName,
      lastName: user.name.familyName,
      username: user.primaryEmail.split('@')[0],
      studentNumber,
      schoolExternalIds: schoolExternalIds.filter(Boolean) as string[],
      isActive: !user.suspended,
      rawData: user as unknown as Record<string, unknown>,
    };
  }

  private async fetchCourseStudents(
    courseId: string,
    pageToken?: string
  ): Promise<{ enrollments: SisEnrollment[]; hasMore: boolean; nextPageToken?: string }> {
    const url = new URL(`${GOOGLE_CLASSROOM_API}/courses/${courseId}/students`);
    url.searchParams.set('pageSize', String(PAGE_SIZE));
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { enrollments: [], hasMore: false };
      }
      throw new Error(`Failed to fetch students: ${response.statusText}`);
    }

    const data: GoogleStudentsResponse = await response.json();

    const enrollments: SisEnrollment[] = (data.students || []).map(student => ({
      externalId: `${courseId}_${student.userId}_student`,
      userExternalId: student.userId,
      classExternalId: courseId,
      role: 'student' as EnrollmentRole,
      isPrimary: true,
      isActive: true,
      rawData: student as unknown as Record<string, unknown>,
    }));

    return {
      enrollments,
      hasMore: !!data.nextPageToken,
      nextPageToken: data.nextPageToken,
    };
  }

  private async fetchCourseTeachers(courseId: string): Promise<SisEnrollment[]> {
    const response = await fetch(
      `${GOOGLE_CLASSROOM_API}/courses/${courseId}/teachers`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(`Failed to fetch teachers: ${response.statusText}`);
    }

    const data: GoogleTeachersResponse = await response.json();

    return (data.teachers || []).map((teacher, index) => ({
      externalId: `${courseId}_${teacher.userId}_teacher`,
      userExternalId: teacher.userId,
      classExternalId: courseId,
      role: 'teacher' as EnrollmentRole,
      isPrimary: index === 0, // First teacher is primary
      isActive: true,
      rawData: teacher as unknown as Record<string, unknown>,
    }));
  }

  private inferSchoolType(name: string, path: string): string {
    const nameLower = name.toLowerCase();
    const pathLower = path.toLowerCase();
    
    if (nameLower.includes('elementary') || pathLower.includes('elementary')) {
      return 'elementary';
    }
    if (nameLower.includes('middle') || pathLower.includes('middle')) {
      return 'middle';
    }
    if (nameLower.includes('high') || pathLower.includes('high')) {
      return 'high';
    }
    if (nameLower.includes('preschool') || nameLower.includes('pre-k')) {
      return 'preschool';
    }
    return 'other';
  }

  private inferSubject(courseName: string): string | undefined {
    const nameLower = courseName.toLowerCase();
    
    if (nameLower.includes('math') || nameLower.includes('algebra') || nameLower.includes('geometry')) {
      return 'MATH';
    }
    if (nameLower.includes('english') || nameLower.includes('ela') || nameLower.includes('reading') || nameLower.includes('writing')) {
      return 'ELA';
    }
    if (nameLower.includes('science') || nameLower.includes('biology') || nameLower.includes('chemistry') || nameLower.includes('physics')) {
      return 'SCIENCE';
    }
    if (nameLower.includes('history') || nameLower.includes('social')) {
      return 'SOCIAL_STUDIES';
    }
    
    return undefined;
  }

  private inferGrade(courseName: string): string | undefined {
    // Look for grade patterns like "Grade 5", "5th Grade", "G5", etc.
    const gradeMatch = courseName.match(/(?:grade|gr?)\s*(\d+)|(\d+)(?:st|nd|rd|th)\s*grade/i);
    if (gradeMatch) {
      const grade = gradeMatch[1] || gradeMatch[2];
      return grade;
    }
    return undefined;
  }

  private isTeacherPath(orgUnitPath?: string): boolean {
    if (!orgUnitPath) return false;
    const pathLower = orgUnitPath.toLowerCase();
    return pathLower.includes('staff') || 
           pathLower.includes('teacher') || 
           pathLower.includes('faculty');
  }

  private isStudentPath(orgUnitPath?: string): boolean {
    if (!orgUnitPath) return true; // Default to student
    const pathLower = orgUnitPath.toLowerCase();
    return pathLower.includes('student') || 
           pathLower.includes('pupil') ||
           pathLower.includes('learner');
  }

  private extractSchoolFromOrgUnit(orgUnitPath: string): string {
    // Extract school identifier from org unit path
    // e.g., /Schools/Lincoln Elementary -> /Schools/Lincoln Elementary
    const parts = orgUnitPath.split('/').filter(Boolean);
    if (parts.length >= 2) {
      return `/${parts.slice(0, 2).join('/')}`;
    }
    return orgUnitPath;
  }
}

/**
 * OAuth helper functions for Google Workspace
 */
export const GoogleOAuthHelpers = {
  /**
   * Generate OAuth authorization URL for Google Workspace
   */
  getAuthorizationUrl(params: {
    clientId: string;
    redirectUri: string;
    state: string;
    nonce: string;
    loginHint?: string;
    scopes?: string[];
    accessType?: 'online' | 'offline';
    prompt?: 'none' | 'consent' | 'select_account';
    hostedDomain?: string;
  }): string {
    const scopes = params.scopes || [...GOOGLE_ROSTERING_SCOPES, ...GOOGLE_SSO_SCOPES];
    
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', params.clientId);
    url.searchParams.set('redirect_uri', params.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', scopes.join(' '));
    url.searchParams.set('state', params.state);
    url.searchParams.set('nonce', params.nonce);
    url.searchParams.set('access_type', params.accessType || 'offline');
    url.searchParams.set('prompt', params.prompt || 'consent');
    
    if (params.loginHint) {
      url.searchParams.set('login_hint', params.loginHint);
    }
    if (params.hostedDomain) {
      url.searchParams.set('hd', params.hostedDomain);
    }
    
    return url.toString();
  },

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(params: {
    code: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  }): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
    tokenType: string;
    idToken?: string;
    scope: string;
  }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: params.code,
        client_id: params.clientId,
        client_secret: params.clientSecret,
        redirect_uri: params.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      idToken: data.id_token,
      scope: data.scope,
    };
  },

  /**
   * Refresh an access token using a refresh token
   */
  async refreshAccessToken(params: {
    refreshToken: string;
    clientId: string;
    clientSecret: string;
  }): Promise<{
    accessToken: string;
    expiresIn: number;
    tokenType: string;
  }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        refresh_token: params.refreshToken,
        client_id: params.clientId,
        client_secret: params.clientSecret,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token refresh failed: ${error.error_description || error.error}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
    };
  },

  /**
   * Revoke access token or refresh token
   */
  async revokeToken(token: string): Promise<void> {
    const response = await fetch(
      `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`,
      { method: 'POST' }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token revocation failed: ${error}`);
    }
  },
};
