/**
 * SCIM 2.0 Zod Schemas & Types
 *
 * RFC 7643 (Core Schema) + RFC 7644 (Protocol)
 * Used for request validation on all SCIM endpoints.
 */

import { z } from 'zod';

// ══════════════════════════════════════════════════════════════════════════════
// CORE SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

export const ScimMetaSchema = z.object({
  resourceType: z.enum(['User', 'Group', 'ServiceProviderConfig', 'Schema', 'ResourceType']),
  created: z.string().optional(),
  lastModified: z.string().optional(),
  location: z.string().optional(),
  version: z.string().optional(),
});
export type ScimMeta = z.infer<typeof ScimMetaSchema>;

export const ScimNameSchema = z.object({
  formatted: z.string().optional(),
  familyName: z.string().optional(),
  givenName: z.string().optional(),
  middleName: z.string().optional(),
  honorificPrefix: z.string().optional(),
  honorificSuffix: z.string().optional(),
});
export type ScimName = z.infer<typeof ScimNameSchema>;

export const ScimEmailSchema = z.object({
  value: z.string().email(),
  type: z.enum(['work', 'home', 'other']).optional(),
  primary: z.boolean().optional(),
});
export type ScimEmail = z.infer<typeof ScimEmailSchema>;

// ══════════════════════════════════════════════════════════════════════════════
// USER RESOURCE
// ══════════════════════════════════════════════════════════════════════════════

export const ScimUserSchema = z.object({
  schemas: z.array(z.string()).default(['urn:ietf:params:scim:schemas:core:2.0:User']),
  id: z.string().optional(),
  externalId: z.string().optional(),
  meta: ScimMetaSchema.optional(),
  userName: z.string().min(1),
  name: ScimNameSchema.optional(),
  displayName: z.string().optional(),
  active: z.boolean().optional().default(true),
  emails: z.array(ScimEmailSchema).optional(),
  password: z.string().optional(),
  groups: z.array(z.object({
    value: z.string(),
    display: z.string().optional(),
    $ref: z.string().optional(),
    type: z.enum(['direct', 'indirect']).optional(),
  })).optional(),
  // Aivo extension
  'urn:aivo:scim:schemas:extension:1.0:User': z.object({
    role: z.enum(['LEARNER', 'PARENT', 'TEACHER', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'THERAPIST', 'PLATFORM_ADMIN', 'SUPPORT']).optional(),
    schoolId: z.string().optional(),
    gradeLevel: z.string().optional(),
    studentId: z.string().optional(),
  }).optional(),
});
export type ScimUser = z.infer<typeof ScimUserSchema>;

// ══════════════════════════════════════════════════════════════════════════════
// GROUP RESOURCE
// ══════════════════════════════════════════════════════════════════════════════

export const ScimGroupMemberSchema = z.object({
  value: z.string(),
  $ref: z.string().optional(),
  display: z.string().optional(),
  type: z.enum(['User', 'Group']).optional(),
});
export type ScimGroupMember = z.infer<typeof ScimGroupMemberSchema>;

export const ScimGroupSchema = z.object({
  schemas: z.array(z.string()).default(['urn:ietf:params:scim:schemas:core:2.0:Group']),
  id: z.string().optional(),
  externalId: z.string().optional(),
  meta: ScimMetaSchema.optional(),
  displayName: z.string(),
  members: z.array(ScimGroupMemberSchema).optional(),
});
export type ScimGroup = z.infer<typeof ScimGroupSchema>;

// ══════════════════════════════════════════════════════════════════════════════
// PATCH OPERATION
// ══════════════════════════════════════════════════════════════════════════════

export const ScimPatchOperationSchema = z.object({
  op: z.enum(['add', 'remove', 'replace']),
  path: z.string().optional(),
  value: z.unknown().optional(),
});

export const ScimPatchOpSchema = z.object({
  schemas: z.array(z.string()).default(['urn:ietf:params:scim:api:messages:2.0:PatchOp']),
  Operations: z.array(ScimPatchOperationSchema).min(1),
});
export type ScimPatchOp = z.infer<typeof ScimPatchOpSchema>;

// ══════════════════════════════════════════════════════════════════════════════
// LIST RESPONSE
// ══════════════════════════════════════════════════════════════════════════════

export interface ScimListResponse<T> {
  schemas: string[];
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  Resources: T[];
}

// ══════════════════════════════════════════════════════════════════════════════
// ERROR RESPONSE
// ══════════════════════════════════════════════════════════════════════════════

export interface ScimError {
  schemas: string[];
  detail: string;
  status: string;
  scimType?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

export const SCIM_SCHEMAS = {
  USER: 'urn:ietf:params:scim:schemas:core:2.0:User',
  GROUP: 'urn:ietf:params:scim:schemas:core:2.0:Group',
  ENTERPRISE_USER: 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User',
  AIVO_USER: 'urn:aivo:scim:schemas:extension:1.0:User',
  LIST_RESPONSE: 'urn:ietf:params:scim:api:messages:2.0:ListResponse',
  ERROR: 'urn:ietf:params:scim:api:messages:2.0:Error',
  PATCH_OP: 'urn:ietf:params:scim:api:messages:2.0:PatchOp',
  SERVICE_PROVIDER_CONFIG: 'urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig',
} as const;
