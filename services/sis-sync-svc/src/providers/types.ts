/**
 * SIS Provider Types and Interfaces
 * 
 * This module defines the canonical types for SIS data that all providers
 * must normalize their data into.
 */

// ============================================================================
// Canonical SIS Entity Types
// ============================================================================

export interface SisSchool {
  /** External ID from the SIS provider (sourcedId in OneRoster) */
  externalId: string;
  /** School name */
  name: string;
  /** School number/identifier */
  schoolNumber?: string;
  /** Address information */
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  /** Grade levels offered (e.g., ['K', '1', '2', '3']) */
  gradeLevels?: string[];
  /** Phone number */
  phone?: string;
  /** School type (elementary, middle, high, etc.) */
  schoolType?: string;
  /** Whether the school is active in the SIS */
  isActive: boolean;
  /** Raw data from the provider for debugging */
  rawData: Record<string, unknown>;
}

export interface SisClass {
  /** External ID from the SIS provider */
  externalId: string;
  /** External ID of the parent school */
  schoolExternalId: string;
  /** Class/section name */
  name: string;
  /** Course code */
  courseCode?: string;
  /** Subject area (Math, ELA, Science, etc.) */
  subject?: string;
  /** Grade level */
  grade?: string;
  /** Section number/identifier */
  sectionNumber?: string;
  /** Term information */
  term?: {
    name?: string;
    startDate?: Date;
    endDate?: Date;
  };
  /** Whether the class is active */
  isActive: boolean;
  /** Raw data from the provider */
  rawData: Record<string, unknown>;
}

export type SisUserRole = 'teacher' | 'student' | 'administrator' | 'aide' | 'parent' | 'guardian';

export interface SisUser {
  /** External ID from the SIS provider */
  externalId: string;
  /** User's role in the SIS */
  role: SisUserRole;
  /** Email address */
  email?: string;
  /** First name */
  firstName: string;
  /** Last name */
  lastName: string;
  /** Middle name */
  middleName?: string;
  /** Username for login */
  username?: string;
  /** Student number (for students) */
  studentNumber?: string;
  /** Staff ID (for teachers/administrators) */
  staffId?: string;
  /** Grade level (for students) */
  grade?: string;
  /** Date of birth */
  dateOfBirth?: Date;
  /** Gender */
  gender?: string;
  /** Associated school external IDs */
  schoolExternalIds: string[];
  /** Whether the user is active */
  isActive: boolean;
  /** Raw data from the provider */
  rawData: Record<string, unknown>;
}

export type EnrollmentRole = 'student' | 'teacher' | 'aide';

export interface SisEnrollment {
  /** External ID from the SIS provider (if available) */
  externalId?: string;
  /** External ID of the user */
  userExternalId: string;
  /** External ID of the class */
  classExternalId: string;
  /** Role in the enrollment */
  role: EnrollmentRole;
  /** Whether this is the primary assignment (for teachers) */
  isPrimary: boolean;
  /** Start date of the enrollment */
  startDate?: Date;
  /** End date of the enrollment */
  endDate?: Date;
  /** Whether the enrollment is active */
  isActive: boolean;
  /** Raw data from the provider */
  rawData: Record<string, unknown>;
}

// ============================================================================
// Provider Configuration Types
// ============================================================================

export interface CleverConfig {
  clientId: string;
  clientSecret: string;
  districtId: string;
  /** OAuth redirect URI */
  redirectUri?: string;
  /** Access token (after OAuth) */
  accessToken?: string;
  /** Token expiry */
  tokenExpiry?: Date;
}

export interface ClassLinkConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  /** OAuth endpoint URL */
  oauthUrl?: string;
  /** Access token */
  accessToken?: string;
  /** Token expiry */
  tokenExpiry?: Date;
}

export interface OneRosterApiConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  /** OAuth 2.0 token endpoint */
  tokenEndpoint?: string;
  /** Access token */
  accessToken?: string;
  /** Token expiry */
  tokenExpiry?: Date;
}

export interface OneRosterCsvConfig {
  /** SFTP connection details */
  sftp: {
    host: string;
    port?: number;
    username: string;
    /** Path to SSH private key */
    privateKeyPath?: string;
    /** SSH private key content (alternative to path) */
    privateKey?: string;
    /** Password (if not using key-based auth) */
    password?: string;
  };
  /** Remote directory path containing CSV files */
  remotePath: string;
  /** Expected CSV file names (if non-standard) */
  fileNames?: {
    orgs?: string;
    classes?: string;
    users?: string;
    enrollments?: string;
  };
}

/**
 * Google Workspace for Education configuration
 * Uses Google Directory API for users and Classroom API for classes
 */
export interface GoogleWorkspaceConfig {
  /** Google Cloud Project ID */
  projectId?: string;
  /** Google Workspace customer ID (e.g., C01234567) */
  customerId: string;
  /** Primary domain (e.g., springfield.k12.us) */
  domain: string;
  /** Additional domains to include */
  additionalDomains?: string[];
  /** OAuth 2.0 Client ID */
  clientId: string;
  /** OAuth 2.0 Client Secret (stored in Vault) - reference only */
  clientSecretRef?: string;
  /** Service account email for admin SDK access */
  serviceAccountEmail?: string;
  /** Admin user email for domain-wide delegation */
  adminEmail?: string;
  /** OAuth access token */
  accessToken?: string;
  /** OAuth refresh token */
  refreshToken?: string;
  /** Token expiry */
  tokenExpiry?: Date;
  /** Scopes granted */
  scopes?: string[];
  /** Whether to use Classroom API for classes/enrollments */
  useClassroomApi?: boolean;
  /** Filter: only sync these organizational units */
  orgUnitPaths?: string[];
  /** Filter: only sync these user types */
  userTypes?: ('student' | 'teacher' | 'staff')[];
}

/**
 * Microsoft Entra ID (Azure AD) configuration
 * Uses Microsoft Graph API for users, groups, and Teams/Classes
 */
export interface MicrosoftEntraConfig {
  /** Azure AD Tenant ID */
  tenantId: string;
  /** Primary domain */
  domain: string;
  /** OAuth 2.0 Client/Application ID */
  clientId: string;
  /** OAuth 2.0 Client Secret (stored in Vault) - reference only */
  clientSecretRef?: string;
  /** OAuth access token */
  accessToken?: string;
  /** OAuth refresh token */
  refreshToken?: string;
  /** Token expiry */
  tokenExpiry?: Date;
  /** Scopes granted */
  scopes?: string[];
  /** Whether to use Education APIs (requires EDU tenant) */
  useEducationApis?: boolean;
  /** Whether to sync from Microsoft Teams for Education */
  syncTeamsClasses?: boolean;
  /** Filter: only sync users from these groups */
  groupFilters?: string[];
  /** Filter: only sync users with these licenses */
  licenseFilters?: string[];
}

export type ProviderConfig = 
  | CleverConfig 
  | ClassLinkConfig 
  | OneRosterApiConfig 
  | OneRosterCsvConfig
  | GoogleWorkspaceConfig
  | MicrosoftEntraConfig;

// ============================================================================
// Sync Results
// ============================================================================

export interface SyncEntityResult<T> {
  /** Successfully fetched entities */
  entities: T[];
  /** Number of entities fetched */
  count: number;
  /** Whether there are more pages to fetch */
  hasMore: boolean;
  /** Cursor for pagination */
  nextCursor?: string;
  /** Any warnings during fetch */
  warnings: string[];
}

export interface SyncStats {
  schools: {
    fetched: number;
    created: number;
    updated: number;
    deactivated: number;
    errors: number;
  };
  classes: {
    fetched: number;
    created: number;
    updated: number;
    deactivated: number;
    errors: number;
  };
  users: {
    fetched: number;
    created: number;
    updated: number;
    deactivated: number;
    errors: number;
  };
  enrollments: {
    fetched: number;
    created: number;
    updated: number;
    deactivated: number;
    errors: number;
  };
}

export function createEmptySyncStats(): SyncStats {
  return {
    schools: { fetched: 0, created: 0, updated: 0, deactivated: 0, errors: 0 },
    classes: { fetched: 0, created: 0, updated: 0, deactivated: 0, errors: 0 },
    users: { fetched: 0, created: 0, updated: 0, deactivated: 0, errors: 0 },
    enrollments: { fetched: 0, created: 0, updated: 0, deactivated: 0, errors: 0 },
  };
}

// ============================================================================
// Provider Interface
// ============================================================================

/** All supported SIS provider types */
export type SisProviderTypeId = 
  | 'CLEVER' 
  | 'CLASSLINK' 
  | 'ONEROSTER_API' 
  | 'ONEROSTER_CSV'
  | 'GOOGLE_WORKSPACE'
  | 'MICROSOFT_ENTRA';

export interface ISisProvider {
  /** Provider type identifier */
  readonly providerType: SisProviderTypeId;
  
  /** Initialize the provider with configuration */
  initialize(config: ProviderConfig): Promise<void>;
  
  /** Test the connection to the SIS provider */
  testConnection(): Promise<{ success: boolean; message: string }>;
  
  /** Fetch all schools */
  fetchSchools(cursor?: string): Promise<SyncEntityResult<SisSchool>>;
  
  /** Fetch all classes */
  fetchClasses(cursor?: string): Promise<SyncEntityResult<SisClass>>;
  
  /** Fetch all users (teachers and students) */
  fetchUsers(cursor?: string): Promise<SyncEntityResult<SisUser>>;
  
  /** Fetch all enrollments */
  fetchEnrollments(cursor?: string): Promise<SyncEntityResult<SisEnrollment>>;
  
  /** Clean up resources */
  cleanup(): Promise<void>;
}
