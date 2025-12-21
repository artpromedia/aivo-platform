/**
 * LTI 1.3 Types and Interfaces
 *
 * Based on IMS Global LTI 1.3 specification:
 * https://www.imsglobal.org/spec/lti/v1p3
 */

import { z } from 'zod';

// ══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ══════════════════════════════════════════════════════════════════════════════

export enum LtiPlatformType {
  CANVAS = 'CANVAS',
  SCHOOLOGY = 'SCHOOLOGY',
  GOOGLE_CLASSROOM = 'GOOGLE_CLASSROOM',
  BLACKBOARD = 'BLACKBOARD',
  BRIGHTSPACE = 'BRIGHTSPACE',
  MOODLE = 'MOODLE',
  GENERIC = 'GENERIC',
}

export enum LtiUserRole {
  INSTRUCTOR = 'INSTRUCTOR',
  LEARNER = 'LEARNER',
  TEACHING_ASSISTANT = 'TEACHING_ASSISTANT',
  CONTENT_DEVELOPER = 'CONTENT_DEVELOPER',
  ADMINISTRATOR = 'ADMINISTRATOR',
  MENTOR = 'MENTOR',
}

export enum LtiLaunchStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  FAILED = 'FAILED',
}

export enum LtiGradeStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

// ══════════════════════════════════════════════════════════════════════════════
// LTI 1.3 MESSAGE CLAIM TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * LTI 1.3 standard role URIs
 * @see https://www.imsglobal.org/spec/lti/v1p3/#role-vocabularies
 */
export const LTI_ROLES = {
  // System Roles
  SYSTEM_ADMINISTRATOR: 'http://purl.imsglobal.org/vocab/lis/v2/system/person#Administrator',

  // Institution Roles
  INSTITUTION_INSTRUCTOR: 'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Instructor',
  INSTITUTION_STUDENT: 'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Student',
  INSTITUTION_ADMINISTRATOR:
    'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Administrator',

  // Context Roles (course-level)
  CONTEXT_INSTRUCTOR: 'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor',
  CONTEXT_LEARNER: 'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner',
  CONTEXT_CONTENT_DEVELOPER: 'http://purl.imsglobal.org/vocab/lis/v2/membership#ContentDeveloper',
  CONTEXT_MENTOR: 'http://purl.imsglobal.org/vocab/lis/v2/membership#Mentor',
  CONTEXT_TEACHING_ASSISTANT:
    'http://purl.imsglobal.org/vocab/lis/v2/membership/Instructor#TeachingAssistant',
} as const;

/**
 * LTI 1.3 Message Types
 */
export const LTI_MESSAGE_TYPES = {
  RESOURCE_LINK_REQUEST: 'LtiResourceLinkRequest',
  DEEP_LINKING_REQUEST: 'LtiDeepLinkingRequest',
  SUBMISSION_REVIEW_REQUEST: 'LtiSubmissionReviewRequest',
} as const;

/**
 * LTI 1.3 claim namespaces
 */
export const LTI_CLAIMS = {
  MESSAGE_TYPE: 'https://purl.imsglobal.org/spec/lti/claim/message_type',
  VERSION: 'https://purl.imsglobal.org/spec/lti/claim/version',
  DEPLOYMENT_ID: 'https://purl.imsglobal.org/spec/lti/claim/deployment_id',
  TARGET_LINK_URI: 'https://purl.imsglobal.org/spec/lti/claim/target_link_uri',
  RESOURCE_LINK: 'https://purl.imsglobal.org/spec/lti/claim/resource_link',
  ROLES: 'https://purl.imsglobal.org/spec/lti/claim/roles',
  CONTEXT: 'https://purl.imsglobal.org/spec/lti/claim/context',
  TOOL_PLATFORM: 'https://purl.imsglobal.org/spec/lti/claim/tool_platform',
  LAUNCH_PRESENTATION: 'https://purl.imsglobal.org/spec/lti/claim/launch_presentation',
  CUSTOM: 'https://purl.imsglobal.org/spec/lti/claim/custom',
  LIS: 'https://purl.imsglobal.org/spec/lti/claim/lis',

  // LTI Advantage Services
  AGS: 'https://purl.imsglobal.org/spec/lti-ags/claim/endpoint',
  NRPS: 'https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice',
  DEEP_LINKING: 'https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings',
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// LTI ID TOKEN PAYLOAD INTERFACE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Resource Link claim structure
 */
export interface LtiResourceLink {
  id: string;
  title?: string;
  description?: string;
}

/**
 * Context (course/class) claim structure
 */
export interface LtiContext {
  id: string;
  label?: string;
  title?: string;
  type?: string[];
}

/**
 * Tool Platform claim structure
 */
export interface LtiToolPlatform {
  guid?: string;
  name?: string;
  version?: string;
  product_family_code?: string;
  contact_email?: string;
  description?: string;
  url?: string;
}

/**
 * Launch Presentation claim structure
 */
export interface LtiLaunchPresentation {
  document_target?: 'iframe' | 'window';
  height?: number;
  width?: number;
  return_url?: string;
  locale?: string;
}

/**
 * LIS (Learning Information Services) claim structure
 */
export interface LtiLis {
  person_sourcedid?: string;
  course_offering_sourcedid?: string;
  course_section_sourcedid?: string;
}

/**
 * Assignment and Grade Services claim structure
 */
export interface LtiAgsEndpoint {
  scope: string[];
  lineitems?: string;
  lineitem?: string;
}

/**
 * Names and Roles Provisioning Services claim structure
 */
export interface LtiNrpsEndpoint {
  context_memberships_url: string;
  service_versions: string[];
}

/**
 * Deep Linking Settings claim structure
 */
export interface LtiDeepLinkingSettings {
  deep_link_return_url: string;
  accept_types: string[];
  accept_presentation_document_targets: string[];
  accept_media_types?: string;
  accept_multiple?: boolean;
  auto_create?: boolean;
  title?: string;
  text?: string;
  data?: string;
}

/**
 * Full LTI 1.3 ID Token payload
 */
export interface LtiIdTokenPayload {
  // Standard OIDC claims
  iss: string; // Platform issuer
  sub: string; // User ID
  aud: string | string[]; // Tool client ID
  exp: number; // Expiration time
  iat: number; // Issued at
  nonce: string; // Replay protection

  // Optional OIDC claims
  azp?: string; // Authorized party
  name?: string; // User's full name
  given_name?: string; // First name
  family_name?: string; // Last name
  middle_name?: string;
  nickname?: string;
  email?: string;
  email_verified?: boolean;
  picture?: string;
  locale?: string;

  // LTI 1.3 claims (using bracket notation for namespaced keys)
  [LTI_CLAIMS.MESSAGE_TYPE]?: string;
  [LTI_CLAIMS.VERSION]?: string;
  [LTI_CLAIMS.DEPLOYMENT_ID]?: string;
  [LTI_CLAIMS.TARGET_LINK_URI]?: string;
  [LTI_CLAIMS.RESOURCE_LINK]?: LtiResourceLink;
  [LTI_CLAIMS.ROLES]?: string[];
  [LTI_CLAIMS.CONTEXT]?: LtiContext;
  [LTI_CLAIMS.TOOL_PLATFORM]?: LtiToolPlatform;
  [LTI_CLAIMS.LAUNCH_PRESENTATION]?: LtiLaunchPresentation;
  [LTI_CLAIMS.CUSTOM]?: Record<string, string>;
  [LTI_CLAIMS.LIS]?: LtiLis;

  // LTI Advantage services
  [LTI_CLAIMS.AGS]?: LtiAgsEndpoint;
  [LTI_CLAIMS.NRPS]?: LtiNrpsEndpoint;
  [LTI_CLAIMS.DEEP_LINKING]?: LtiDeepLinkingSettings;
}

// ══════════════════════════════════════════════════════════════════════════════
// ZOD SCHEMAS FOR VALIDATION
// ══════════════════════════════════════════════════════════════════════════════

export const LtiToolConfigSchema = z.object({
  tenantId: z.string().uuid(),
  platformType: z.nativeEnum(LtiPlatformType),
  platformName: z.string().min(1).max(255),
  clientId: z.string().min(1),
  deploymentId: z.string().min(1),
  issuer: z.string().url(),
  authLoginUrl: z.string().url(),
  authTokenUrl: z.string().url(),
  jwksUrl: z.string().url(),
  toolPrivateKeyRef: z.string().min(1),
  toolPublicKeyId: z.string().optional(),
  lineItemsUrl: z.string().url().optional(),
  membershipsUrl: z.string().url().optional(),
  deepLinkingUrl: z.string().url().optional(),
  enabled: z.boolean().default(true),
  configJson: z.record(z.unknown()).default({}),
});

export type LtiToolConfig = z.infer<typeof LtiToolConfigSchema>;

export const LtiLinkConfigSchema = z.object({
  tenantId: z.string().uuid(),
  ltiToolId: z.string().uuid(),
  lmsContextId: z.string().optional(),
  lmsResourceLinkId: z.string().optional(),
  classroomId: z.string().uuid().optional(),
  loVersionId: z.string().uuid().optional(),
  activityTemplateId: z.string().uuid().optional(),
  subject: z.string().optional(),
  gradeBand: z.string().optional(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  maxPoints: z.number().positive().optional(),
  gradingEnabled: z.boolean().default(false),
  lineItemId: z.string().optional(),
  configJson: z.record(z.unknown()).default({}),
  createdByUserId: z.string().uuid(),
});

export type LtiLinkConfig = z.infer<typeof LtiLinkConfigSchema>;

export const LaunchRequestSchema = z.object({
  id_token: z.string().min(1),
  state: z.string().optional(),
});

export type LaunchRequest = z.infer<typeof LaunchRequestSchema>;

// ══════════════════════════════════════════════════════════════════════════════
// HELPER TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Validated launch data after JWT verification
 */
export interface ValidatedLaunch {
  toolId: string;
  tenantId: string;
  linkId?: string | undefined;

  // User info
  lmsUserId: string;
  lmsUserEmail?: string | undefined;
  lmsUserName?: string | undefined;
  userRole: LtiUserRole;

  // Context info
  lmsContextId?: string | undefined;
  lmsContextTitle?: string | undefined;
  lmsResourceLinkId?: string | undefined;

  // Resolved Aivo entities
  aivoUserId?: string | undefined;
  aivoLearnerId?: string | undefined;

  // Activity target
  targetActivityId?: string | undefined;
  targetLoVersionId?: string | undefined;

  // Services
  agsEndpoint?: LtiAgsEndpoint | undefined;

  // Full payload for storage
  payload: LtiIdTokenPayload;
}

/**
 * Grade result to send back to LMS
 */
export interface GradeResult {
  launchId: string;
  scoreGiven: number;
  scoreMaximum: number;
  activityProgress: 'Initialized' | 'Started' | 'InProgress' | 'Submitted' | 'Completed';
  gradingProgress: 'FullyGraded' | 'Pending' | 'PendingManual' | 'Failed' | 'NotReady';
  comment?: string;
  timestamp?: Date;
}

/**
 * OIDC Login initiation request from LMS
 */
export interface OidcLoginRequest {
  iss: string; // Platform issuer
  login_hint: string; // User hint
  target_link_uri: string; // Where to redirect after auth
  lti_message_hint?: string; // LTI-specific message hint
  client_id?: string; // Optional client ID
  lti_deployment_id?: string; // Optional deployment ID
}

/**
 * OIDC Auth response to redirect to platform
 */
export interface OidcAuthResponse {
  scope: string;
  response_type: string;
  response_mode: string;
  prompt: string;
  client_id: string;
  redirect_uri: string;
  state: string;
  nonce: string;
  login_hint: string;
  lti_message_hint?: string;
}
