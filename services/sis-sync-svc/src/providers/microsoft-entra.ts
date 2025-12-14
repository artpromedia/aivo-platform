/**
 * Microsoft Entra ID (Azure AD) SIS Provider
 * 
 * Implements the ISisProvider interface for Microsoft Entra ID.
 * Uses:
 * - Microsoft Graph API for users and groups
 * - Microsoft Education APIs for schools, classes, and enrollments (EDU tenants)
 * 
 * @see https://learn.microsoft.com/en-us/graph/api/overview
 * @see https://learn.microsoft.com/en-us/graph/api/resources/education-overview
 */

import {
  ISisProvider,
  MicrosoftEntraConfig,
  SisSchool,
  SisClass,
  SisUser,
  SisEnrollment,
  SyncEntityResult,
  SisUserRole,
  EnrollmentRole,
} from './types';

// ============================================================================
// Microsoft Graph API Constants
// ============================================================================

const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';
const GRAPH_BETA_API = 'https://graph.microsoft.com/beta';
const PAGE_SIZE = 100;

// Required OAuth scopes for rostering
export const MICROSOFT_ROSTERING_SCOPES = [
  'User.Read.All',
  'Group.Read.All',
  'Directory.Read.All',
  'EduRoster.Read.All', // For Education tenants
  'EduRoster.ReadBasic.All',
];

// SSO scopes (OpenID Connect)
export const MICROSOFT_SSO_SCOPES = [
  'openid',
  'email',
  'profile',
  'offline_access',
];

// ============================================================================
// Microsoft Graph Response Types
// ============================================================================

interface GraphUser {
  id: string;
  userPrincipalName: string;
  mail?: string;
  displayName: string;
  givenName?: string;
  surname?: string;
  jobTitle?: string;
  department?: string;
  officeLocation?: string;
  accountEnabled: boolean;
  userType?: string;
  createdDateTime?: string;
  assignedLicenses?: Array<{ skuId: string }>;
  memberOf?: Array<{ '@odata.type': string; id: string; displayName: string }>;
}

interface GraphGroup {
  id: string;
  displayName: string;
  description?: string;
  groupTypes?: string[];
  mailEnabled: boolean;
  securityEnabled: boolean;
  membershipRule?: string;
}

interface EduSchool {
  id: string;
  displayName: string;
  description?: string;
  principalEmail?: string;
  principalName?: string;
  externalId?: string;
  schoolNumber?: string;
  phone?: string;
  address?: {
    city?: string;
    countryOrRegion?: string;
    postalCode?: string;
    state?: string;
    street?: string;
  };
  createdBy?: { user?: { displayName?: string } };
  externalSource?: 'sis' | 'manual' | 'lms';
  externalSourceDetail?: string;
}

interface EduClass {
  id: string;
  displayName: string;
  description?: string;
  classCode?: string;
  externalId?: string;
  externalName?: string;
  externalSource?: 'sis' | 'manual' | 'lms';
  grade?: string;
  mailNickname?: string;
  term?: {
    displayName?: string;
    startDate?: string;
    endDate?: string;
  };
  course?: {
    displayName?: string;
    externalId?: string;
    subject?: string;
  };
}

interface EduUser {
  id: string;
  userPrincipalName: string;
  mail?: string;
  displayName: string;
  givenName?: string;
  surname?: string;
  primaryRole: 'student' | 'teacher' | 'none' | 'unknownFutureValue';
  externalSource?: 'sis' | 'manual' | 'lms';
  student?: {
    externalId?: string;
    birthDate?: string;
    grade?: string;
    studentNumber?: string;
  };
  teacher?: {
    externalId?: string;
    teacherNumber?: string;
  };
}

interface EduClassMember {
  id: string;
  displayName: string;
  primaryRole: 'student' | 'teacher' | 'none' | 'unknownFutureValue';
}

interface GraphListResponse<T> {
  '@odata.nextLink'?: string;
  '@odata.count'?: number;
  value: T[];
}

// ============================================================================
// Microsoft Entra Provider Implementation
// ============================================================================

export class MicrosoftEntraProvider implements ISisProvider {
  readonly providerType = 'MICROSOFT_ENTRA' as const;
  private config: MicrosoftEntraConfig | null = null;
  private accessToken: string | null = null;

  /**
   * Initialize the provider with configuration
   */
  async initialize(config: MicrosoftEntraConfig): Promise<void> {
    this.config = config;
    this.accessToken = config.accessToken || null;

    if (!this.accessToken) {
      throw new Error('Microsoft Entra provider requires OAuth access token');
    }

    if (!config.tenantId) {
      throw new Error('Microsoft Entra provider requires tenantId');
    }
  }

  /**
   * Test the connection to Microsoft Graph API
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.accessToken) {
      return { success: false, message: 'No access token configured' };
    }

    try {
      // Try to get organization info to verify access
      const response = await fetch(`${GRAPH_API_BASE}/organization`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          message: `API error: ${error.error?.message || response.statusText}`,
        };
      }

      // Check if this is an Education tenant
      let isEduTenant = false;
      if (this.config?.useEducationApis) {
        try {
          const eduResponse = await fetch(`${GRAPH_API_BASE}/education/me`, {
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json',
            },
          });
          isEduTenant = eduResponse.ok;
        } catch {
          // Not an EDU tenant or no EDU permissions
        }
      }

      return {
        success: true,
        message: `Successfully connected to Microsoft Entra ID${isEduTenant ? ' (Education tenant)' : ''}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Fetch schools from Microsoft Education API
   */
  async fetchSchools(cursor?: string): Promise<SyncEntityResult<SisSchool>> {
    if (!this.config || !this.accessToken) {
      throw new Error('Provider not initialized');
    }

    if (!this.config.useEducationApis) {
      // Without Education APIs, we can't fetch schools directly
      // Return empty - schools need to be created manually or inferred from groups
      return {
        entities: [],
        count: 0,
        hasMore: false,
        warnings: ['Education APIs not enabled - schools must be configured manually'],
      };
    }

    const schools: SisSchool[] = [];
    const warnings: string[] = [];

    try {
      const url = cursor || `${GRAPH_API_BASE}/education/schools?$top=${PAGE_SIZE}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          warnings.push('Education schools endpoint not available - this may not be an EDU tenant');
          return { entities: [], count: 0, hasMore: false, warnings };
        }
        throw new Error(`Failed to fetch schools: ${response.statusText}`);
      }

      const data: GraphListResponse<EduSchool> = await response.json();

      for (const school of data.value) {
        schools.push(this.mapEduSchoolToSisSchool(school));
      }

      return {
        entities: schools,
        count: schools.length,
        hasMore: !!data['@odata.nextLink'],
        nextCursor: data['@odata.nextLink'],
        warnings,
      };
    } catch (error) {
      warnings.push(`Error fetching schools: ${error instanceof Error ? error.message : 'Unknown'}`);
      return { entities: schools, count: schools.length, hasMore: false, warnings };
    }
  }

  /**
   * Fetch classes from Microsoft Education API or Teams
   */
  async fetchClasses(cursor?: string): Promise<SyncEntityResult<SisClass>> {
    if (!this.config || !this.accessToken) {
      throw new Error('Provider not initialized');
    }

    const classes: SisClass[] = [];
    const warnings: string[] = [];

    try {
      if (this.config.useEducationApis) {
        // Use Education Classes API
        const url = cursor || `${GRAPH_API_BASE}/education/classes?$top=${PAGE_SIZE}`;

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            warnings.push('Education classes endpoint not available');
          } else {
            throw new Error(`Failed to fetch classes: ${response.statusText}`);
          }
        } else {
          const data: GraphListResponse<EduClass> = await response.json();

          for (const eduClass of data.value) {
            classes.push(this.mapEduClassToSisClass(eduClass));
          }

          return {
            entities: classes,
            count: classes.length,
            hasMore: !!data['@odata.nextLink'],
            nextCursor: data['@odata.nextLink'],
            warnings,
          };
        }
      }

      // Fallback: Use Teams groups if Education API not available
      if (this.config.syncTeamsClasses) {
        const teamsClasses = await this.fetchTeamsClasses(cursor);
        return teamsClasses;
      }

      return { entities: classes, count: 0, hasMore: false, warnings };
    } catch (error) {
      warnings.push(`Error fetching classes: ${error instanceof Error ? error.message : 'Unknown'}`);
      return { entities: classes, count: classes.length, hasMore: false, warnings };
    }
  }

  /**
   * Fetch users from Microsoft Graph
   */
  async fetchUsers(cursor?: string): Promise<SyncEntityResult<SisUser>> {
    if (!this.config || !this.accessToken) {
      throw new Error('Provider not initialized');
    }

    const users: SisUser[] = [];
    const warnings: string[] = [];

    try {
      if (this.config.useEducationApis) {
        // Use Education Users API for richer data
        return await this.fetchEducationUsers(cursor);
      }

      // Standard Graph Users API
      let url = cursor;
      if (!url) {
        url = `${GRAPH_API_BASE}/users?$top=${PAGE_SIZE}&$select=id,userPrincipalName,mail,displayName,givenName,surname,jobTitle,department,accountEnabled,userType,assignedLicenses`;
        
        // Add domain filter if configured
        if (this.config.domain) {
          url += `&$filter=endswith(userPrincipalName,'@${this.config.domain}')`;
        }
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`);
      }

      const data: GraphListResponse<GraphUser> = await response.json();

      for (const user of data.value) {
        if (!user.accountEnabled) continue;
        
        // Apply license filters if configured
        if (this.config.licenseFilters?.length && user.assignedLicenses) {
          const hasMatchingLicense = user.assignedLicenses.some(
            license => this.config!.licenseFilters!.includes(license.skuId)
          );
          if (!hasMatchingLicense) continue;
        }

        users.push(this.mapGraphUserToSisUser(user));
      }

      return {
        entities: users,
        count: users.length,
        hasMore: !!data['@odata.nextLink'],
        nextCursor: data['@odata.nextLink'],
        warnings,
      };
    } catch (error) {
      warnings.push(`Error fetching users: ${error instanceof Error ? error.message : 'Unknown'}`);
      return { entities: users, count: users.length, hasMore: false, warnings };
    }
  }

  /**
   * Fetch enrollments from Microsoft Education API
   */
  async fetchEnrollments(cursor?: string): Promise<SyncEntityResult<SisEnrollment>> {
    if (!this.config || !this.accessToken) {
      throw new Error('Provider not initialized');
    }

    if (!this.config.useEducationApis) {
      return {
        entities: [],
        count: 0,
        hasMore: false,
        warnings: ['Education APIs required for enrollment sync'],
      };
    }

    const enrollments: SisEnrollment[] = [];
    const warnings: string[] = [];

    // Parse cursor: "classId|memberPageToken"
    let currentClassId: string | undefined;
    let memberPageToken: string | undefined;

    if (cursor) {
      const [classId, pageToken] = cursor.split('|');
      currentClassId = classId || undefined;
      memberPageToken = pageToken || undefined;
    }

    try {
      // First get all classes
      const classesResponse = await fetch(
        `${GRAPH_API_BASE}/education/classes?$top=100`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!classesResponse.ok) {
        throw new Error(`Failed to fetch classes: ${classesResponse.statusText}`);
      }

      const classesData: GraphListResponse<EduClass> = await classesResponse.json();
      const classes = classesData.value;

      // Find starting point
      let startIndex = 0;
      if (currentClassId) {
        startIndex = classes.findIndex(c => c.id === currentClassId);
        if (startIndex === -1) startIndex = 0;
      }

      // Process classes
      for (let i = startIndex; i < classes.length; i++) {
        const eduClass = classes[i];

        // Fetch members (students and teachers)
        const membersUrl = memberPageToken || 
          `${GRAPH_API_BASE}/education/classes/${eduClass.id}/members?$top=${PAGE_SIZE}`;

        const membersResponse = await fetch(membersUrl, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!membersResponse.ok) {
          warnings.push(`Failed to fetch members for class ${eduClass.id}`);
          continue;
        }

        const membersData: GraphListResponse<EduClassMember> = await membersResponse.json();

        for (const member of membersData.value) {
          enrollments.push(this.mapMemberToEnrollment(eduClass.id, member));
        }

        // Handle pagination within a class
        if (membersData['@odata.nextLink']) {
          return {
            entities: enrollments,
            count: enrollments.length,
            hasMore: true,
            nextCursor: `${eduClass.id}|${membersData['@odata.nextLink']}`,
            warnings,
          };
        }

        // Reset for next class
        memberPageToken = undefined;

        // If we have enough, return with cursor for next class
        if (enrollments.length >= PAGE_SIZE && i < classes.length - 1) {
          return {
            entities: enrollments,
            count: enrollments.length,
            hasMore: true,
            nextCursor: `${classes[i + 1].id}|`,
            warnings,
          };
        }
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

  private async fetchEducationUsers(cursor?: string): Promise<SyncEntityResult<SisUser>> {
    const users: SisUser[] = [];
    const warnings: string[] = [];

    const url = cursor || `${GRAPH_API_BASE}/education/users?$top=${PAGE_SIZE}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch education users: ${response.statusText}`);
    }

    const data: GraphListResponse<EduUser> = await response.json();

    for (const eduUser of data.value) {
      users.push(this.mapEduUserToSisUser(eduUser));
    }

    return {
      entities: users,
      count: users.length,
      hasMore: !!data['@odata.nextLink'],
      nextCursor: data['@odata.nextLink'],
      warnings,
    };
  }

  private async fetchTeamsClasses(cursor?: string): Promise<SyncEntityResult<SisClass>> {
    const classes: SisClass[] = [];
    const warnings: string[] = [];

    // Fetch unified groups that are Teams-enabled
    const url = cursor || 
      `${GRAPH_API_BASE}/groups?$filter=groupTypes/any(c:c eq 'Unified') and resourceProvisioningOptions/Any(x:x eq 'Team')&$top=${PAGE_SIZE}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      warnings.push(`Failed to fetch Teams groups: ${response.statusText}`);
      return { entities: classes, count: 0, hasMore: false, warnings };
    }

    const data: GraphListResponse<GraphGroup> = await response.json();

    for (const group of data.value) {
      classes.push({
        externalId: group.id,
        schoolExternalId: '',
        name: group.displayName,
        isActive: true,
        rawData: group,
      });
    }

    return {
      entities: classes,
      count: classes.length,
      hasMore: !!data['@odata.nextLink'],
      nextCursor: data['@odata.nextLink'],
      warnings,
    };
  }

  private mapEduSchoolToSisSchool(school: EduSchool): SisSchool {
    return {
      externalId: school.id,
      name: school.displayName,
      schoolNumber: school.schoolNumber || school.externalId,
      phone: school.phone,
      address: school.address ? {
        street: school.address.street,
        city: school.address.city,
        state: school.address.state,
        zip: school.address.postalCode,
        country: school.address.countryOrRegion,
      } : undefined,
      isActive: true,
      rawData: school,
    };
  }

  private mapEduClassToSisClass(eduClass: EduClass): SisClass {
    return {
      externalId: eduClass.id,
      schoolExternalId: '', // Would need to query school relationship
      name: eduClass.displayName,
      courseCode: eduClass.classCode,
      grade: eduClass.grade,
      subject: eduClass.course?.subject,
      term: eduClass.term ? {
        name: eduClass.term.displayName,
        startDate: eduClass.term.startDate ? new Date(eduClass.term.startDate) : undefined,
        endDate: eduClass.term.endDate ? new Date(eduClass.term.endDate) : undefined,
      } : undefined,
      isActive: true,
      rawData: eduClass,
    };
  }

  private mapGraphUserToSisUser(user: GraphUser): SisUser {
    // Infer role from job title or user type
    let role: SisUserRole = 'student';
    const jobTitleLower = (user.jobTitle || '').toLowerCase();
    
    if (jobTitleLower.includes('admin') || user.userType === 'Admin') {
      role = 'administrator';
    } else if (jobTitleLower.includes('teacher') || jobTitleLower.includes('instructor')) {
      role = 'teacher';
    } else if (jobTitleLower.includes('aide') || jobTitleLower.includes('assistant')) {
      role = 'aide';
    }

    return {
      externalId: user.id,
      role,
      email: user.mail || user.userPrincipalName,
      firstName: user.givenName || user.displayName.split(' ')[0],
      lastName: user.surname || user.displayName.split(' ').slice(1).join(' '),
      username: user.userPrincipalName.split('@')[0],
      schoolExternalIds: [],
      isActive: user.accountEnabled,
      rawData: user,
    };
  }

  private mapEduUserToSisUser(eduUser: EduUser): SisUser {
    let role: SisUserRole;
    switch (eduUser.primaryRole) {
      case 'student':
        role = 'student';
        break;
      case 'teacher':
        role = 'teacher';
        break;
      default:
        role = 'student'; // Default to student
    }

    return {
      externalId: eduUser.id,
      role,
      email: eduUser.mail || eduUser.userPrincipalName,
      firstName: eduUser.givenName || eduUser.displayName.split(' ')[0],
      lastName: eduUser.surname || eduUser.displayName.split(' ').slice(1).join(' '),
      username: eduUser.userPrincipalName.split('@')[0],
      studentNumber: eduUser.student?.studentNumber || eduUser.student?.externalId,
      staffId: eduUser.teacher?.teacherNumber || eduUser.teacher?.externalId,
      grade: eduUser.student?.grade,
      schoolExternalIds: [],
      isActive: true,
      rawData: eduUser,
    };
  }

  private mapMemberToEnrollment(classId: string, member: EduClassMember): SisEnrollment {
    let role: EnrollmentRole;
    switch (member.primaryRole) {
      case 'teacher':
        role = 'teacher';
        break;
      case 'student':
      default:
        role = 'student';
    }

    return {
      externalId: `${classId}_${member.id}`,
      userExternalId: member.id,
      classExternalId: classId,
      role,
      isPrimary: true,
      isActive: true,
      rawData: member,
    };
  }
}

/**
 * OAuth helper functions for Microsoft Entra ID
 */
export const MicrosoftOAuthHelpers = {
  /**
   * Generate OAuth authorization URL for Microsoft Entra ID
   */
  getAuthorizationUrl(params: {
    clientId: string;
    tenantId: string;
    redirectUri: string;
    state: string;
    nonce: string;
    scopes?: string[];
    loginHint?: string;
    prompt?: 'login' | 'select_account' | 'consent' | 'none';
    domainHint?: string;
  }): string {
    const scopes = params.scopes || [...MICROSOFT_ROSTERING_SCOPES, ...MICROSOFT_SSO_SCOPES];
    
    const url = new URL(`https://login.microsoftonline.com/${params.tenantId}/oauth2/v2.0/authorize`);
    url.searchParams.set('client_id', params.clientId);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', params.redirectUri);
    url.searchParams.set('scope', scopes.join(' '));
    url.searchParams.set('state', params.state);
    url.searchParams.set('nonce', params.nonce);
    url.searchParams.set('response_mode', 'query');
    
    if (params.loginHint) {
      url.searchParams.set('login_hint', params.loginHint);
    }
    if (params.prompt) {
      url.searchParams.set('prompt', params.prompt);
    }
    if (params.domainHint) {
      url.searchParams.set('domain_hint', params.domainHint);
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
    tenantId: string;
    redirectUri: string;
    scopes?: string[];
  }): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
    tokenType: string;
    idToken?: string;
    scope: string;
  }> {
    const scopes = params.scopes || [...MICROSOFT_ROSTERING_SCOPES, ...MICROSOFT_SSO_SCOPES];

    const response = await fetch(
      `https://login.microsoftonline.com/${params.tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: params.clientId,
          client_secret: params.clientSecret,
          code: params.code,
          redirect_uri: params.redirectUri,
          grant_type: 'authorization_code',
          scope: scopes.join(' '),
        }),
      }
    );

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
    tenantId: string;
    scopes?: string[];
  }): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
    tokenType: string;
  }> {
    const scopes = params.scopes || [...MICROSOFT_ROSTERING_SCOPES, ...MICROSOFT_SSO_SCOPES];

    const response = await fetch(
      `https://login.microsoftonline.com/${params.tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: params.clientId,
          client_secret: params.clientSecret,
          refresh_token: params.refreshToken,
          grant_type: 'refresh_token',
          scope: scopes.join(' '),
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token refresh failed: ${error.error_description || error.error}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token, // Microsoft may rotate refresh tokens
      expiresIn: data.expires_in,
      tokenType: data.token_type,
    };
  },
};
