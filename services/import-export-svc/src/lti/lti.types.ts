// ══════════════════════════════════════════════════════════════════════════════
// LTI 1.3 TYPE DEFINITIONS
// Learning Tools Interoperability types for tool and platform integration
// ══════════════════════════════════════════════════════════════════════════════

// ============================================================================
// LTI 1.3 CORE TYPES
// ============================================================================

export interface LTIPlatformConfig {
  /** Platform issuer URL (must match iss claim) */
  issuer: string;
  /** Client ID assigned by platform */
  clientId: string;
  /** Platform's OIDC authorization endpoint */
  authorizationEndpoint: string;
  /** Platform's token endpoint for token exchange */
  tokenEndpoint: string;
  /** Platform's JWKS endpoint for key verification */
  jwksEndpoint: string;
  /** Platform's public key (optional if JWKS is used) */
  publicKey?: string;
  /** Deployment ID for this tool deployment */
  deploymentId: string;
  /** Platform name for display */
  name: string;
}

export interface LTIToolConfig {
  /** Tool's client ID */
  clientId: string;
  /** Tool's OIDC login initiation URL */
  loginUrl: string;
  /** Tool's launch URL */
  launchUrl: string;
  /** Tool's redirect URIs */
  redirectUris: string[];
  /** Tool's JWKS endpoint */
  jwksEndpoint: string;
  /** Tool's private key for signing */
  privateKey: string;
  /** Tool's public key */
  publicKey: string;
  /** Key ID */
  keyId: string;
  /** Tool name */
  name: string;
  /** Tool description */
  description?: string;
  /** Deep linking support */
  supportsDeepLinking?: boolean;
}

// ============================================================================
// LTI MESSAGE TYPES
// ============================================================================

export type LTIMessageType = 
  | 'LtiResourceLinkRequest'
  | 'LtiDeepLinkingRequest'
  | 'LtiSubmissionReviewRequest'
  | 'LtiDataPrivacyLaunchRequest';

export interface LTILaunchRequest {
  /** Message type */
  messageType: LTIMessageType;
  /** LTI version */
  version: '1.3.0';
  /** Deployment ID */
  deploymentId: string;
  /** Target link URI */
  targetLinkUri: string;
  /** Resource link information */
  resourceLink?: LTIResourceLink;
  /** User claims */
  user?: LTIUserClaim;
  /** Context (course/class) claims */
  context?: LTIContextClaim;
  /** Platform instance claims */
  platformInstance?: LTIPlatformInstanceClaim;
  /** Launch presentation claims */
  launchPresentation?: LTILaunchPresentation;
  /** Custom parameters */
  custom?: Record<string, string>;
  /** Deep linking settings (for DL requests) */
  deepLinkingSettings?: LTIDeepLinkingSettings;
  /** Roles claim */
  roles?: string[];
  /** Role scope mentor */
  roleScopeMentor?: string[];
}

export interface LTIResourceLink {
  /** Resource link ID */
  id: string;
  /** Resource title */
  title?: string;
  /** Resource description */
  description?: string;
}

export interface LTIUserClaim {
  /** User's subject identifier */
  sub: string;
  /** User's name */
  name?: string;
  /** User's given name */
  givenName?: string;
  /** User's family name */
  familyName?: string;
  /** User's email */
  email?: string;
  /** User's picture URL */
  picture?: string;
  /** User's locale */
  locale?: string;
}

export interface LTIContextClaim {
  /** Context ID */
  id: string;
  /** Context label (e.g., course code) */
  label?: string;
  /** Context title */
  title?: string;
  /** Context types */
  type?: string[];
}

export interface LTIPlatformInstanceClaim {
  /** Platform GUID */
  guid: string;
  /** Platform contact email */
  contactEmail?: string;
  /** Platform description */
  description?: string;
  /** Platform name */
  name?: string;
  /** Platform URL */
  url?: string;
  /** Platform product family code */
  productFamilyCode?: string;
  /** Platform version */
  version?: string;
}

export interface LTILaunchPresentation {
  /** Document target */
  documentTarget?: 'iframe' | 'window';
  /** Preferred height */
  height?: number;
  /** Preferred width */
  width?: number;
  /** Return URL */
  returnUrl?: string;
  /** Locale */
  locale?: string;
}

export interface LTIDeepLinkingSettings {
  /** Deep link return URL */
  deepLinkReturnUrl: string;
  /** Accepted content types */
  acceptTypes: string[];
  /** Accepted presentation document targets */
  acceptPresentationDocumentTargets: string[];
  /** Accept media types */
  acceptMediaTypes?: string;
  /** Accept multiple items */
  acceptMultiple?: boolean;
  /** Auto create option */
  autoCreate?: boolean;
  /** Title */
  title?: string;
  /** Text */
  text?: string;
  /** Data to echo back */
  data?: string;
}

// ============================================================================
// LTI DEEP LINKING RESPONSE TYPES
// ============================================================================

export type LTIContentItemType = 
  | 'ltiResourceLink'
  | 'link'
  | 'file'
  | 'html'
  | 'image';

export interface LTIContentItem {
  type: LTIContentItemType;
  title?: string;
  text?: string;
  url?: string;
  icon?: { url: string; width?: number; height?: number };
  thumbnail?: { url: string; width?: number; height?: number };
  custom?: Record<string, string>;
}

export interface LTIResourceLinkItem extends LTIContentItem {
  type: 'ltiResourceLink';
  url: string;
  lineItem?: {
    scoreMaximum: number;
    label?: string;
    resourceId?: string;
    tag?: string;
  };
  available?: { startDateTime?: string; endDateTime?: string };
  submission?: { startDateTime?: string; endDateTime?: string };
  iframe?: { width?: number; height?: number };
  window?: { targetName?: string; width?: number; height?: number };
}

export interface LTILinkItem extends LTIContentItem {
  type: 'link';
  url: string;
  embed?: { html: string };
}

export interface LTIFileItem extends LTIContentItem {
  type: 'file';
  url: string;
  mediaType?: string;
  expiresAt?: string;
}

export interface LTIDeepLinkingResponse {
  /** Content items to return */
  contentItems: LTIContentItem[];
  /** Data echoed back from request */
  data?: string;
  /** Error message if any */
  errorMessage?: string;
  /** Error log */
  errorLog?: string;
}

// ============================================================================
// LTI ADVANTAGE SERVICES
// ============================================================================

// Assignment and Grade Services (AGS)
export interface LTILineItem {
  id?: string;
  scoreMaximum: number;
  label: string;
  resourceId?: string;
  resourceLinkId?: string;
  tag?: string;
  startDateTime?: string;
  endDateTime?: string;
  gradesReleased?: boolean;
}

export interface LTIScore {
  userId: string;
  activityProgress: 'Initialized' | 'Started' | 'InProgress' | 'Submitted' | 'Completed';
  gradingProgress: 'FullyGraded' | 'Pending' | 'PendingManual' | 'Failed' | 'NotReady';
  timestamp: string;
  scoreGiven?: number;
  scoreMaximum?: number;
  comment?: string;
}

export interface LTIResult {
  id: string;
  userId: string;
  resultScore?: number;
  resultMaximum?: number;
  comment?: string;
  scoreOf?: string;
}

// Names and Role Provisioning Services (NRPS)
export interface LTIMember {
  userId: string;
  roles: string[];
  status?: 'Active' | 'Inactive' | 'Deleted';
  name?: string;
  email?: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
  lis_person_sourcedid?: string;
}

export interface LTIMembershipContainer {
  id: string;
  context: LTIContextClaim;
  members: LTIMember[];
}

// ============================================================================
// LTI ROLES
// ============================================================================

export const LTI_ROLES = {
  // System roles
  ADMINISTRATOR: 'http://purl.imsglobal.org/vocab/lis/v2/system/person#Administrator',
  NONE: 'http://purl.imsglobal.org/vocab/lis/v2/system/person#None',
  
  // Institution roles
  FACULTY: 'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Faculty',
  INSTRUCTOR: 'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Instructor',
  LEARNER: 'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Learner',
  MEMBER: 'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Member',
  MENTOR: 'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Mentor',
  STAFF: 'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Staff',
  STUDENT: 'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Student',
  
  // Context roles
  CONTEXT_ADMINISTRATOR: 'http://purl.imsglobal.org/vocab/lis/v2/membership#Administrator',
  CONTENT_DEVELOPER: 'http://purl.imsglobal.org/vocab/lis/v2/membership#ContentDeveloper',
  CONTEXT_INSTRUCTOR: 'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor',
  CONTEXT_LEARNER: 'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner',
  CONTEXT_MENTOR: 'http://purl.imsglobal.org/vocab/lis/v2/membership#Mentor',
} as const;

// ============================================================================
// LTI CLAIMS
// ============================================================================

export const LTI_CLAIMS = {
  MESSAGE_TYPE: 'https://purl.imsglobal.org/spec/lti/claim/message_type',
  VERSION: 'https://purl.imsglobal.org/spec/lti/claim/version',
  DEPLOYMENT_ID: 'https://purl.imsglobal.org/spec/lti/claim/deployment_id',
  TARGET_LINK_URI: 'https://purl.imsglobal.org/spec/lti/claim/target_link_uri',
  RESOURCE_LINK: 'https://purl.imsglobal.org/spec/lti/claim/resource_link',
  ROLES: 'https://purl.imsglobal.org/spec/lti/claim/roles',
  ROLE_SCOPE_MENTOR: 'https://purl.imsglobal.org/spec/lti/claim/role_scope_mentor',
  CONTEXT: 'https://purl.imsglobal.org/spec/lti/claim/context',
  TOOL_PLATFORM: 'https://purl.imsglobal.org/spec/lti/claim/tool_platform',
  LAUNCH_PRESENTATION: 'https://purl.imsglobal.org/spec/lti/claim/launch_presentation',
  CUSTOM: 'https://purl.imsglobal.org/spec/lti/claim/custom',
  LIS: 'https://purl.imsglobal.org/spec/lti/claim/lis',
  DEEP_LINKING_SETTINGS: 'https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings',
  CONTENT_ITEMS: 'https://purl.imsglobal.org/spec/lti-dl/claim/content_items',
  AGS_ENDPOINT: 'https://purl.imsglobal.org/spec/lti-ags/claim/endpoint',
  NRPS_ENDPOINT: 'https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice',
} as const;

// ============================================================================
// LTI SERVICE ENDPOINTS
// ============================================================================

export interface LTIAGSEndpoint {
  scope: string[];
  lineitems?: string;
  lineitem?: string;
}

export interface LTINRPSEndpoint {
  contextMembershipsUrl: string;
  serviceVersions: string[];
}

// ============================================================================
// JWT & SECURITY TYPES
// ============================================================================

export interface LTIJWTPayload {
  iss: string;
  sub: string;
  aud: string | string[];
  exp: number;
  iat: number;
  nonce: string;
  azp?: string;
  [key: string]: any;
}

export interface LTIStatePayload {
  platformId: string;
  deploymentId: string;
  nonce: string;
  targetLinkUri: string;
  clientId: string;
  exp: number;
}

export interface LTIAccessToken {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  scope: string;
}

// ============================================================================
// DATABASE ENTITY INTERFACES
// ============================================================================

export interface LTIToolEntity {
  id: string;
  tenantId: string;
  clientId: string;
  name: string;
  description?: string;
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  jwksEndpoint: string;
  deploymentId: string;
  publicKey?: string;
  privateKey?: string;
  status: 'active' | 'inactive';
  supportsDeepLinking: boolean;
  supportsAGS: boolean;
  supportsNRPS: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LTIResourceLinkEntity {
  id: string;
  tenantId: string;
  toolId: string;
  resourceLinkId: string;
  contentId: string;
  contentType: string;
  title: string;
  description?: string;
  customParams?: Record<string, string>;
  lineItemId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LTILaunchEntity {
  id: string;
  tenantId: string;
  toolId: string;
  resourceLinkId: string;
  userId: string;
  roles: string[];
  contextId?: string;
  contextTitle?: string;
  launchData?: Record<string, any>;
  returnUrl?: string;
  createdAt: Date;
}
