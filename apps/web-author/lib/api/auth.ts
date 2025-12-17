/**
 * Auth API Module
 *
 * Authentication and authorization API calls for the web author app.
 */

import apiClient, { tokenManager, ApiClientError } from './client';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  tenantId: string | null;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  tenantId?: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantId?: string;
  inviteCode?: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// AUTH API
// ══════════════════════════════════════════════════════════════════════════════

const AUTH_BASE = '/api/auth';

/**
 * Login with email and password
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>(`${AUTH_BASE}/login`, credentials);

  // Store tokens
  tokenManager.setTokens(response.accessToken, response.refreshToken);
  if (response.user.tenantId) {
    tokenManager.setTenantId(response.user.tenantId);
  }
  tokenManager.setUserId(response.user.id);

  return response;
}

/**
 * Register a new user
 */
export async function register(data: RegisterRequest): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>(`${AUTH_BASE}/register`, data);

  // Store tokens
  tokenManager.setTokens(response.accessToken, response.refreshToken);
  if (response.user.tenantId) {
    tokenManager.setTenantId(response.user.tenantId);
  }
  tokenManager.setUserId(response.user.id);

  return response;
}

/**
 * Logout current user
 */
export async function logout(): Promise<void> {
  try {
    await apiClient.post(`${AUTH_BASE}/logout`);
  } finally {
    tokenManager.clearTokens();
  }
}

/**
 * Get current user profile
 */
export async function getCurrentUser(): Promise<User> {
  return apiClient.get<User>(`${AUTH_BASE}/me`);
}

/**
 * Update current user profile
 */
export async function updateProfile(data: {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}): Promise<User> {
  return apiClient.patch<User>(`${AUTH_BASE}/me`, data);
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  return apiClient.post(`${AUTH_BASE}/password-reset`, { email });
}

/**
 * Confirm password reset with token
 */
export async function confirmPasswordReset(
  token: string,
  password: string
): Promise<{ message: string }> {
  return apiClient.post(`${AUTH_BASE}/password-reset/confirm`, { token, password });
}

/**
 * Change password for authenticated user
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ message: string }> {
  return apiClient.post(`${AUTH_BASE}/change-password`, {
    currentPassword,
    newPassword,
  });
}

/**
 * Refresh access token
 */
export async function refreshToken(): Promise<RefreshResponse> {
  const refreshTokenValue = tokenManager.getRefreshToken();
  if (!refreshTokenValue) {
    throw new ApiClientError({ message: 'No refresh token available', code: 'NO_TOKEN' });
  }

  const response = await apiClient.post<RefreshResponse>(`${AUTH_BASE}/refresh`, {
    refreshToken: refreshTokenValue,
  });

  tokenManager.setTokens(response.accessToken, response.refreshToken);
  return response;
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string): Promise<{ message: string }> {
  return apiClient.post(`${AUTH_BASE}/verify-email`, { token });
}

/**
 * Resend email verification
 */
export async function resendVerification(): Promise<{ message: string }> {
  return apiClient.post(`${AUTH_BASE}/resend-verification`);
}

/**
 * Check if user is authenticated (has valid token)
 */
export function isAuthenticated(): boolean {
  return !!tokenManager.getAccessToken();
}

/**
 * Get current user ID from stored token
 */
export function getCurrentUserId(): string | null {
  return tokenManager.getUserId();
}

/**
 * Get current tenant ID
 */
export function getCurrentTenantId(): string | null {
  return tokenManager.getTenantId();
}
