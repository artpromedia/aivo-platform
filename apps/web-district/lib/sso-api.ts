/**
 * SSO Configuration API
 *
 * API client for managing IdP configurations.
 */

// ============================================================================
// TYPES
// ============================================================================

export type IdpProtocol = 'SAML' | 'OIDC';

export interface IdpConfig {
  id: string;
  tenantId: string;
  protocol: IdpProtocol;
  name: string;
  issuer: string;
  enabled: boolean;
  // SAML
  ssoUrl?: string;
  sloUrl?: string;
  x509Certificate?: string;
  metadataXml?: string;
  // OIDC
  clientId?: string;
  clientSecretRef?: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  userinfoEndpoint?: string;
  jwksUri?: string;
  scopes?: string[];
  // Claims mapping
  emailClaim: string;
  nameClaim: string;
  firstNameClaim: string;
  lastNameClaim: string;
  roleClaim: string;
  externalIdClaim: string;
  // Role mapping
  roleMapping: Record<string, string>;
  // Provisioning
  autoProvisionUsers: boolean;
  defaultRole: string;
  allowedUserTypes: string[];
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface TenantSsoSettings {
  ssoEnabled: boolean;
  ssoRequired: boolean;
  fallbackAdminEmails: string[];
}

export interface CreateIdpConfigRequest {
  protocol: IdpProtocol;
  name: string;
  issuer: string;
  // SAML
  ssoUrl?: string;
  sloUrl?: string;
  x509Certificate?: string;
  metadataXml?: string;
  // OIDC
  clientId?: string;
  clientSecret?: string; // Will be stored securely
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  userinfoEndpoint?: string;
  jwksUri?: string;
  scopes?: string[];
  // Claims
  emailClaim?: string;
  nameClaim?: string;
  roleClaim?: string;
  roleMapping?: Record<string, string>;
  // Provisioning
  autoProvisionUsers?: boolean;
  defaultRole?: string;
  allowedUserTypes?: string[];
}

export interface UpdateIdpConfigRequest extends Partial<CreateIdpConfigRequest> {
  enabled?: boolean;
}

export interface SsoTestResult {
  success: boolean;
  message: string;
  details?: {
    issuerValid?: boolean;
    endpointsReachable?: boolean;
    certificateValid?: boolean;
    certificateExpiry?: string;
  };
}

export interface OidcDiscoveryResult {
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint?: string;
  jwksUri: string;
  scopesSupported?: string[];
}

// ============================================================================
// API CLIENT
// ============================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `Request failed: ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// SSO CONFIG API
// ============================================================================

/**
 * Get IdP configuration for the current tenant.
 */
export async function getIdpConfig(): Promise<IdpConfig | null> {
  try {
    return await apiRequest<IdpConfig>('/api/sso/config');
  } catch {
    return null;
  }
}

/**
 * Create or update IdP configuration.
 */
export async function saveIdpConfig(
  config: CreateIdpConfigRequest | UpdateIdpConfigRequest
): Promise<IdpConfig> {
  return apiRequest<IdpConfig>('/api/sso/config', {
    method: 'PUT',
    body: JSON.stringify(config),
  });
}

/**
 * Delete IdP configuration.
 */
export async function deleteIdpConfig(): Promise<void> {
  await apiRequest<void>('/api/sso/config', {
    method: 'DELETE',
  });
}

/**
 * Enable or disable IdP configuration.
 */
export async function setIdpEnabled(enabled: boolean): Promise<IdpConfig> {
  return apiRequest<IdpConfig>('/api/sso/config/enabled', {
    method: 'PUT',
    body: JSON.stringify({ enabled }),
  });
}

// ============================================================================
// TENANT SSO SETTINGS API
// ============================================================================

/**
 * Get tenant SSO settings.
 */
export async function getTenantSsoSettings(): Promise<TenantSsoSettings> {
  return apiRequest<TenantSsoSettings>('/api/sso/settings');
}

/**
 * Update tenant SSO settings.
 */
export async function updateTenantSsoSettings(
  settings: Partial<TenantSsoSettings>
): Promise<TenantSsoSettings> {
  return apiRequest<TenantSsoSettings>('/api/sso/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

// ============================================================================
// SSO TESTING & DISCOVERY
// ============================================================================

/**
 * Test SSO configuration.
 */
export async function testSsoConnection(): Promise<SsoTestResult> {
  return apiRequest<SsoTestResult>('/api/sso/test');
}

/**
 * Discover OIDC configuration from issuer URL.
 */
export async function discoverOidc(issuerUrl: string): Promise<OidcDiscoveryResult> {
  return apiRequest<OidcDiscoveryResult>('/api/sso/discover', {
    method: 'POST',
    body: JSON.stringify({ issuerUrl }),
  });
}

/**
 * Parse SAML metadata XML and extract configuration.
 */
export async function parseSamlMetadata(
  metadataXml: string
): Promise<{
  issuer: string;
  ssoUrl: string;
  sloUrl?: string;
  x509Certificate: string;
}> {
  return apiRequest('/api/sso/parse-metadata', {
    method: 'POST',
    body: JSON.stringify({ metadataXml }),
  });
}

// ============================================================================
// SP METADATA
// ============================================================================

/**
 * Get SP metadata URL for IdP configuration.
 */
export function getSpMetadataUrl(tenantSlug: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || '';
  return `${baseUrl}/auth/sso/metadata/${tenantSlug}`;
}

/**
 * Get SSO callback URL for IdP configuration.
 */
export function getSsoCallbackUrl(tenantSlug: string, protocol: IdpProtocol): string {
  const baseUrl = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || '';
  if (protocol === 'SAML') {
    return `${baseUrl}/auth/saml/acs/${tenantSlug}`;
  }
  return `${baseUrl}/auth/oidc/callback/${tenantSlug}`;
}

// ============================================================================
// SSO ATTEMPT LOGS
// ============================================================================

export interface SsoAttemptLog {
  id: string;
  userIdentifier: string | null;
  ipAddress: string | null;
  success: boolean;
  errorCode: string | null;
  errorMessage: string | null;
  initiatedAt: string;
  completedAt: string | null;
}

export interface SsoAttemptLogsResponse {
  logs: SsoAttemptLog[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Get SSO attempt logs for the tenant.
 */
export async function getSsoAttemptLogs(options?: {
  page?: number;
  pageSize?: number;
  success?: boolean;
}): Promise<SsoAttemptLogsResponse> {
  const params = new URLSearchParams();
  if (options?.page) params.set('page', String(options.page));
  if (options?.pageSize) params.set('pageSize', String(options.pageSize));
  if (options?.success !== undefined) params.set('success', String(options.success));

  return apiRequest<SsoAttemptLogsResponse>(`/api/sso/logs?${params}`);
}
