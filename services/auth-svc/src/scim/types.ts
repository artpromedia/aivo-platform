/**
 * SCIM 2.0 Type Definitions
 *
 * Based on RFC 7643 (SCIM Core Schema) and RFC 7644 (SCIM Protocol)
 * https://datatracker.ietf.org/doc/html/rfc7643
 * https://datatracker.ietf.org/doc/html/rfc7644
 */

// ══════════════════════════════════════════════════════════════════════════════
// CORE SCHEMA TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ScimMeta {
  resourceType: 'User' | 'Group' | 'ServiceProviderConfig' | 'Schema' | 'ResourceType';
  created?: string;
  lastModified?: string;
  location?: string;
  version?: string;
}

export interface ScimName {
  formatted?: string;
  familyName?: string;
  givenName?: string;
  middleName?: string;
  honorificPrefix?: string;
  honorificSuffix?: string;
}

export interface ScimEmail {
  value: string;
  type?: 'work' | 'home' | 'other';
  primary?: boolean;
}

export interface ScimPhoneNumber {
  value: string;
  type?: 'work' | 'home' | 'mobile' | 'fax' | 'pager' | 'other';
  primary?: boolean;
}

export interface ScimAddress {
  formatted?: string;
  streetAddress?: string;
  locality?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  type?: 'work' | 'home' | 'other';
  primary?: boolean;
}

export interface ScimEnterpriseUser {
  employeeNumber?: string;
  costCenter?: string;
  organization?: string;
  division?: string;
  department?: string;
  manager?: {
    value?: string;
    $ref?: string;
    displayName?: string;
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// USER RESOURCE
// ══════════════════════════════════════════════════════════════════════════════

export interface ScimUser {
  schemas: string[];
  id?: string;
  externalId?: string;
  meta?: ScimMeta;

  // Core attributes
  userName: string;
  name?: ScimName;
  displayName?: string;
  nickName?: string;
  profileUrl?: string;
  title?: string;
  userType?: string;
  preferredLanguage?: string;
  locale?: string;
  timezone?: string;
  active?: boolean;
  password?: string;

  // Multi-valued attributes
  emails?: ScimEmail[];
  phoneNumbers?: ScimPhoneNumber[];
  addresses?: ScimAddress[];
  photos?: { value: string; type?: string; primary?: boolean }[];
  roles?: { value: string; display?: string; type?: string; primary?: boolean }[];

  // Enterprise extension
  'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'?: ScimEnterpriseUser;

  // Custom Aivo extension
  'urn:aivo:scim:schemas:extension:1.0:User'?: {
    role?: 'LEARNER' | 'PARENT' | 'TEACHER' | 'SCHOOL_ADMIN' | 'DISTRICT_ADMIN';
    schoolId?: string;
    gradeLevel?: string;
    studentId?: string;
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// GROUP RESOURCE
// ══════════════════════════════════════════════════════════════════════════════

export interface ScimGroupMember {
  value: string;
  $ref?: string;
  display?: string;
  type?: 'User' | 'Group';
}

export interface ScimGroup {
  schemas: string[];
  id?: string;
  externalId?: string;
  meta?: ScimMeta;
  displayName: string;
  members?: ScimGroupMember[];
}

// ══════════════════════════════════════════════════════════════════════════════
// PATCH OPERATION
// ══════════════════════════════════════════════════════════════════════════════

export interface ScimPatchOperation {
  op: 'add' | 'remove' | 'replace';
  path?: string;
  value?: unknown;
}

export interface ScimPatchRequest {
  schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'];
  Operations: ScimPatchOperation[];
}

// ══════════════════════════════════════════════════════════════════════════════
// LIST RESPONSE
// ══════════════════════════════════════════════════════════════════════════════

export interface ScimListResponse<T> {
  schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'];
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  Resources: T[];
}

// ══════════════════════════════════════════════════════════════════════════════
// ERROR RESPONSE
// ══════════════════════════════════════════════════════════════════════════════

export interface ScimError {
  schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'];
  detail?: string;
  status: string;
  scimType?:
    | 'invalidFilter'
    | 'tooMany'
    | 'uniqueness'
    | 'mutability'
    | 'invalidSyntax'
    | 'invalidPath'
    | 'noTarget'
    | 'invalidValue'
    | 'invalidVers'
    | 'sensitive';
}

// ══════════════════════════════════════════════════════════════════════════════
// BULK REQUEST/RESPONSE
// ══════════════════════════════════════════════════════════════════════════════

export interface ScimBulkOperation {
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  bulkId?: string;
  version?: string;
  data?: ScimUser | ScimGroup | ScimPatchRequest;
}

export interface ScimBulkRequest {
  schemas: ['urn:ietf:params:scim:api:messages:2.0:BulkRequest'];
  Operations: ScimBulkOperation[];
  failOnErrors?: number;
}

export interface ScimBulkOperationResult {
  method: string;
  bulkId?: string;
  version?: string;
  location?: string;
  status: string;
  response?: ScimUser | ScimGroup | ScimError;
}

export interface ScimBulkResponse {
  schemas: ['urn:ietf:params:scim:api:messages:2.0:BulkResponse'];
  Operations: ScimBulkOperationResult[];
}

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE PROVIDER CONFIG
// ══════════════════════════════════════════════════════════════════════════════

export interface ScimServiceProviderConfig {
  schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'];
  documentationUri?: string;
  patch: { supported: boolean };
  bulk: {
    supported: boolean;
    maxOperations: number;
    maxPayloadSize: number;
  };
  filter: {
    supported: boolean;
    maxResults: number;
  };
  changePassword: { supported: boolean };
  sort: { supported: boolean };
  etag: { supported: boolean };
  authenticationSchemes: {
    type: 'oauth2' | 'httpbasic' | 'oauthbearertoken';
    name: string;
    description: string;
    specUri?: string;
    documentationUri?: string;
    primary?: boolean;
  }[];
  meta: ScimMeta;
}

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMA DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════════

export const SCIM_SCHEMAS = {
  USER: 'urn:ietf:params:scim:schemas:core:2.0:User',
  GROUP: 'urn:ietf:params:scim:schemas:core:2.0:Group',
  ENTERPRISE_USER: 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User',
  AIVO_USER: 'urn:aivo:scim:schemas:extension:1.0:User',
  LIST_RESPONSE: 'urn:ietf:params:scim:api:messages:2.0:ListResponse',
  ERROR: 'urn:ietf:params:scim:api:messages:2.0:Error',
  PATCH_OP: 'urn:ietf:params:scim:api:messages:2.0:PatchOp',
  BULK_REQUEST: 'urn:ietf:params:scim:api:messages:2.0:BulkRequest',
  BULK_RESPONSE: 'urn:ietf:params:scim:api:messages:2.0:BulkResponse',
  SERVICE_PROVIDER_CONFIG: 'urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig',
} as const;
