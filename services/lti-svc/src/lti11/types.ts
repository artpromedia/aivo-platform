/**
 * LTI 1.1 Types and Interfaces
 *
 * Based on IMS Global LTI 1.0/1.1 specification:
 * https://www.imsglobal.org/specs/ltiv1p1
 *
 * LTI 1.1 uses OAuth 1.0a for message signing, unlike LTI 1.3's OIDC flow.
 */

import { z } from 'zod';

// ══════════════════════════════════════════════════════════════════════════════
// LTI 1.1 LAUNCH PARAMETERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * LTI 1.1 launch parameters as received in POST body
 */
export interface Lti11LaunchParams {
  // Required OAuth 1.0a parameters
  oauth_consumer_key: string;
  oauth_signature_method: string;
  oauth_timestamp: string;
  oauth_nonce: string;
  oauth_version: string;
  oauth_signature: string;

  // Required LTI parameters
  lti_message_type: string;
  lti_version: string;
  resource_link_id: string;

  // Recommended user parameters
  user_id?: string;
  roles?: string;
  lis_person_name_full?: string;
  lis_person_name_given?: string;
  lis_person_name_family?: string;
  lis_person_contact_email_primary?: string;

  // Context (course/class) parameters
  context_id?: string;
  context_title?: string;
  context_label?: string;
  context_type?: string;

  // Outcomes Service (grade passback) parameters
  lis_outcome_service_url?: string;
  lis_result_sourcedid?: string;

  // Tool consumer (LMS) info
  tool_consumer_instance_guid?: string;
  tool_consumer_instance_name?: string;
  tool_consumer_info_product_family_code?: string;
  tool_consumer_info_version?: string;

  // Content-Item Selection parameters
  content_item_return_url?: string;
  accept_media_types?: string;
  accept_presentation_document_targets?: string;
  accept_unsigned?: string;
  accept_multiple?: string;
  accept_copy_advice?: string;
  auto_create?: string;
  data?: string;

  // Launch presentation
  launch_presentation_locale?: string;
  launch_presentation_document_target?: string;
  launch_presentation_css_url?: string;
  launch_presentation_width?: string;
  launch_presentation_height?: string;
  launch_presentation_return_url?: string;

  // LIS (Learning Information Services) parameters
  lis_course_offering_sourcedid?: string;
  lis_course_section_sourcedid?: string;

  // Custom parameters (prefixed with custom_)
  [key: string]: string | undefined;
}

/**
 * LTI 1.1 Consumer (Tool Consumer) configuration
 */
export interface Lti11Consumer {
  id: string;
  tenantId: string;
  name: string;
  consumerKey: string;
  sharedSecret: string;
  isActive: boolean;
  instanceGuid?: string | undefined;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Result from a successful LTI 1.1 launch
 */
export interface Lti11LaunchResult {
  user: {
    userId: string;
    displayName: string;
    email?: string | undefined;
    role: string;
    isNewUser: boolean;
  };
  session: {
    accessToken: string;
    expiresAt: Date;
  };
  consumer: Lti11Consumer;
  context: {
    id?: string | undefined;
    title?: string | undefined;
    label?: string | undefined;
    type?: string | undefined;
  };
  resourceLinkId: string;
  customParams: Record<string, string>;
  hasOutcomesService: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// OUTCOMES SERVICE TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Outcome submission to LMS
 */
export interface Lti11OutcomeSubmission {
  userId: string;
  resourceLinkId: string;
  score: number; // 0.0 to 1.0
  comment?: string | undefined;
  resultData?:
    | {
        text?: string | undefined;
        url?: string | undefined;
      }
    | undefined;
}

/**
 * Result of an outcome operation
 */
export interface Lti11OutcomeResult {
  success: boolean;
  messageId?: string;
  description?: string;
  errorCode?: string;
}

/**
 * Outcome binding - links user/resource to LMS grade column
 */
export interface Lti11OutcomeBinding {
  id: string;
  userId: string;
  consumerId: string;
  resourceLinkId: string;
  serviceUrl: string;
  sourcedId: string;
  createdAt: Date;
  updatedAt: Date;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTENT-ITEM MESSAGE TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Content item for deep linking response
 */
export interface Lti11ContentItem {
  '@type': 'LtiLinkItem' | 'FileItem' | 'ContentItem';
  '@id'?: string;
  title: string;
  text?: string;
  url?: string;
  mediaType?: string;
  placementAdvice?: {
    displayWidth?: number;
    displayHeight?: number;
    presentationDocumentTarget?: 'iframe' | 'window' | 'embed';
  };
  icon?: {
    '@id': string;
    width?: number;
    height?: number;
  };
  thumbnail?: {
    '@id': string;
    width?: number;
    height?: number;
  };
  custom?: Record<string, string>;
  lineItem?: {
    '@type': 'LineItem';
    label: string;
    scoreMaximum: number;
    resourceId?: string;
    tag?: string;
  };
}

/**
 * Content-item response to send back to LMS
 */
export interface Lti11ContentItemResponse {
  formAction: string;
  formMethod: 'POST';
  formParams: Record<string, string>;
}

// ══════════════════════════════════════════════════════════════════════════════
// ROLE MAPPINGS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * LTI 1.1 role URN prefixes
 */
export const LTI11_ROLE_URNS = {
  INSTRUCTOR: 'urn:lti:role:ims/lis/Instructor',
  LEARNER: 'urn:lti:role:ims/lis/Learner',
  STUDENT: 'urn:lti:role:ims/lis/Student', // Legacy alias for Learner
  ADMINISTRATOR: 'urn:lti:role:ims/lis/Administrator',
  TEACHING_ASSISTANT: 'urn:lti:role:ims/lis/TeachingAssistant',
  CONTENT_DEVELOPER: 'urn:lti:role:ims/lis/ContentDeveloper',
  MENTOR: 'urn:lti:role:ims/lis/Mentor',
} as const;

/**
 * Legacy role name to URN mapping
 */
export const LEGACY_ROLE_MAP: Record<string, string> = {
  Instructor: LTI11_ROLE_URNS.INSTRUCTOR,
  Learner: LTI11_ROLE_URNS.LEARNER,
  Student: LTI11_ROLE_URNS.LEARNER,
  Administrator: LTI11_ROLE_URNS.ADMINISTRATOR,
  TeachingAssistant: LTI11_ROLE_URNS.TEACHING_ASSISTANT,
  ContentDeveloper: LTI11_ROLE_URNS.CONTENT_DEVELOPER,
  Mentor: LTI11_ROLE_URNS.MENTOR,
};

// ══════════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for LTI 1.1 Consumer creation
 */
export const Lti11ConsumerCreateSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(255),
  consumerKey: z.string().min(8).max(255),
  sharedSecret: z.string().min(16).max(255),
  instanceGuid: z.string().optional(),
  settings: z.record(z.unknown()).optional().default({}),
});

export type Lti11ConsumerCreateInput = z.infer<typeof Lti11ConsumerCreateSchema>;

/**
 * Schema for grade submission
 */
export const Lti11GradeSubmitSchema = z.object({
  userId: z.string().uuid(),
  resourceLinkId: z.string().min(1),
  score: z.number().min(0).max(1),
  comment: z.string().optional(),
  resultData: z
    .object({
      text: z.string().optional(),
      url: z.string().url().optional(),
    })
    .optional(),
});

export type Lti11GradeSubmitInput = z.infer<typeof Lti11GradeSubmitSchema>;

/**
 * Schema for content item return
 */
export const Lti11ContentItemReturnSchema = z.object({
  consumerId: z.string().uuid(),
  returnUrl: z.string().url(),
  data: z.string().optional(),
  items: z.array(
    z.object({
      type: z.enum(['lesson', 'assessment', 'activity']),
      id: z.string(),
      title: z.string(),
      description: z.string().optional(),
      scoreMaximum: z.number().optional(),
    })
  ),
});

export type Lti11ContentItemReturnInput = z.infer<typeof Lti11ContentItemReturnSchema>;

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

export const LTI11_CONSTANTS = {
  /** LTI version string expected in launches */
  LTI_VERSION: 'LTI-1p0',

  /** Basic launch message type */
  BASIC_LAUNCH_MESSAGE_TYPE: 'basic-lti-launch-request',

  /** Content-item selection request message type */
  CONTENT_ITEM_MESSAGE_TYPE: 'ContentItemSelectionRequest',

  /** Content-item selection response message type */
  CONTENT_ITEM_RESPONSE_TYPE: 'ContentItemSelection',

  /** OAuth nonce expiry in seconds */
  NONCE_EXPIRY_SECONDS: 90,

  /** OAuth timestamp tolerance in seconds (5 minutes) */
  TIMESTAMP_TOLERANCE_SECONDS: 300,

  /** Supported OAuth signature methods */
  SUPPORTED_SIGNATURE_METHODS: ['HMAC-SHA1', 'HMAC-SHA256'] as const,
} as const;
