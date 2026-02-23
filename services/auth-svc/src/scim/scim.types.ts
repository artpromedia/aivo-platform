/**
 * SCIM 2.0 Types & Zod Schemas
 *
 * Full type definitions and runtime validation for SCIM protocol
 * based on RFC 7643 (Core Schema) and RFC 7644 (Protocol).
 */

import { z } from 'zod';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMA CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

export const SCIM_SCHEMAS = {
  USER: 'urn:ietf:params:scim:schemas:core:2.0:User',
  GROUP: 'urn:ietf:params:scim:schemas:core:2.0:Group',
  ENTERPRISE_USER: 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User',
  LIST_RESPONSE: 'urn:ietf:params:scim:api:messages:2.0:ListResponse',
  ERROR: 'urn:ietf:params:scim:api:messages:2.0:Error',
  PATCH_OP: 'urn:ietf:params:scim:api:messages:2.0:PatchOp',
  SERVICE_PROVIDER_CONFIG: 'urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig',
  RESOURCE_TYPE: 'urn:ietf:params:scim:schemas:core:2.0:ResourceType',
  SCHEMA: 'urn:ietf:params:scim:schemas:core:2.0:Schema',
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// ZOD SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

export const ScimMetaSchema = z.object({
  resourceType: z.string(),
  created: z.string().optional(),
  lastModified: z.string().optional(),
  location: z.string().optional(),
  version: z.string().optional(),
});

export const ScimNameSchema = z.object({
  formatted: z.string().optional(),
  familyName: z.string().optional(),
  givenName: z.string().optional(),
  middleName: z.string().optional(),
  honorificPrefix: z.string().optional(),
  honorificSuffix: z.string().optional(),
});

export const ScimEmailSchema = z.object({
  value: z.string().email(),
  type: z.enum(['work', 'home', 'other']).optional(),
  primary: z.boolean().optional(),
});

export const ScimGroupMemberSchema = z.object({
  value: z.string(),
  $ref: z.string().optional(),
  display: z.string().optional(),
  type: z.enum(['User', 'Group']).optional(),
});

export const ScimGroupRefSchema = z.object({
  value: z.string(),
  $ref: z.string().optional(),
  display: z.string().optional(),
});

export const ScimUserSchema = z.object({
  schemas: z.array(z.string()).default([SCIM_SCHEMAS.USER]),
  id: z.string().optional(),
  externalId: z.string().optional(),
  meta: ScimMetaSchema.optional(),
  userName: z.string(),
  name: ScimNameSchema.optional(),
  displayName: z.string().optional(),
  active: z.boolean().optional().default(true),
  emails: z.array(ScimEmailSchema).optional(),
  groups: z.array(ScimGroupRefSchema).optional(),
  password: z.string().optional(),
});

export const ScimGroupSchema = z.object({
  schemas: z.array(z.string()).default([SCIM_SCHEMAS.GROUP]),
  id: z.string().optional(),
  externalId: z.string().optional(),
  meta: ScimMetaSchema.optional(),
  displayName: z.string(),
  members: z.array(ScimGroupMemberSchema).optional(),
});

export const ScimErrorSchema = z.object({
  schemas: z.array(z.string()).default([SCIM_SCHEMAS.ERROR]),
  detail: z.string(),
  status: z.string(),
  scimType: z.string().optional(),
});

export const ScimPatchOperationSchema = z.object({
  op: z.enum(['add', 'remove', 'replace']),
  path: z.string().optional(),
  value: z.unknown().optional(),
});

export const ScimPatchOpSchema = z.object({
  schemas: z.array(z.string()).default([SCIM_SCHEMAS.PATCH_OP]),
  Operations: z.array(ScimPatchOperationSchema),
});

export const ScimListResponseSchema = z.object({
  schemas: z.array(z.string()).default([SCIM_SCHEMAS.LIST_RESPONSE]),
  totalResults: z.number(),
  startIndex: z.number(),
  itemsPerPage: z.number(),
  Resources: z.array(z.unknown()),
});

// ══════════════════════════════════════════════════════════════════════════════
// TYPESCRIPT TYPES (derived from Zod schemas)
// ══════════════════════════════════════════════════════════════════════════════

export type ScimMeta = z.infer<typeof ScimMetaSchema>;
export type ScimName = z.infer<typeof ScimNameSchema>;
export type ScimEmail = z.infer<typeof ScimEmailSchema>;
export type ScimGroupMember = z.infer<typeof ScimGroupMemberSchema>;

export type ScimUser = z.infer<typeof ScimUserSchema>;
export type ScimGroup = z.infer<typeof ScimGroupSchema>;
export type ScimError = z.infer<typeof ScimErrorSchema>;
export type ScimPatchOp = z.infer<typeof ScimPatchOpSchema>;
export type ScimPatchOperation = z.infer<typeof ScimPatchOperationSchema>;

export interface ScimListResponse<T> {
  schemas: string[];
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  Resources: T[];
}
