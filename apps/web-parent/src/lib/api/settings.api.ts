/**
 * Settings API Client
 *
 * Type-safe API functions for settings and parental controls:
 * - Parent Settings (profile, notifications, privacy)
 * - Parental Controls (screen time, content filter, subject access, safety)
 * - Accessibility Settings
 * - PIN Protection
 *
 * All settings are persisted to profile-svc/parent-svc and synced across devices.
 */

import type {
  ParentalControlSettings,
  ScreenTimeSettings,
  ContentFilterSettings,
  SubjectAccessSettings,
  SafetySettings,
  NotificationSettings,
  AccessibilitySettings,
  ParentSettings,
  ParentProfileSettings,
  AppSettings,
  VerifyPinRequest,
  VerifyPinResponse,
  SetPinRequest,
  SettingsSyncMetadata,
  DEFAULT_SCREEN_TIME_SETTINGS,
  DEFAULT_CONTENT_FILTER_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_ACCESSIBILITY_SETTINGS,
} from '@aivo/ts-types';

import { apiClient } from './client';

// ============================================================================
// Cache Management
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

const CACHE_TTL = {
  settings: 5 * 60 * 1000, // 5 minutes
  controls: 2 * 60 * 1000, // 2 minutes
  accessibility: 5 * 60 * 1000, // 5 minutes
};

function getCacheKey(prefix: string, params?: Record<string, unknown>): string {
  if (!params) return prefix;
  return `${prefix}:${JSON.stringify(params)}`;
}

function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T, ttl: number): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + ttl,
  });
}

function invalidateCache(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

// ============================================================================
// Parent Settings API
// ============================================================================

/**
 * Get parent settings (profile, app settings, notifications)
 */
export async function getParentSettings(): Promise<ParentSettings> {
  const cacheKey = getCacheKey('parent-settings');
  const cached = getFromCache<ParentSettings>(cacheKey);
  if (cached) return cached;

  const data = await apiClient.get<ParentSettings>('/parent/settings');
  setCache(cacheKey, data, CACHE_TTL.settings);
  return data;
}

/**
 * Update parent profile settings
 */
export async function updateParentProfile(
  profile: Partial<ParentProfileSettings>
): Promise<ParentProfileSettings> {
  const data = await apiClient.patch<ParentProfileSettings>('/parent/settings/profile', profile);
  invalidateCache('parent-settings');
  return data;
}

/**
 * Update parent app settings
 */
export async function updateAppSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const data = await apiClient.patch<AppSettings>('/parent/settings/app', settings);
  invalidateCache('parent-settings');
  return data;
}

/**
 * Update parent notification settings
 */
export async function updateNotificationSettings(
  settings: Partial<NotificationSettings>
): Promise<NotificationSettings> {
  const data = await apiClient.patch<NotificationSettings>(
    '/parent/settings/notifications',
    settings
  );
  invalidateCache('parent-settings');
  return data;
}

// ============================================================================
// Parental Controls API
// ============================================================================

/**
 * Get parental controls for a specific child
 */
export async function getParentalControls(childId: string): Promise<ParentalControlSettings> {
  const cacheKey = getCacheKey('parental-controls', { childId });
  const cached = getFromCache<ParentalControlSettings>(cacheKey);
  if (cached) return cached;

  const data = await apiClient.get<ParentalControlSettings>(
    `/parent/children/${childId}/controls`
  );
  setCache(cacheKey, data, CACHE_TTL.controls);
  return data;
}

/**
 * Update screen time settings for a child
 */
export async function updateScreenTimeSettings(
  childId: string,
  settings: Partial<ScreenTimeSettings>,
  pinToken?: string
): Promise<ScreenTimeSettings> {
  const headers = pinToken ? { 'X-Pin-Token': pinToken } : undefined;
  const data = await apiClient.put<ScreenTimeSettings>(
    `/parent/children/${childId}/controls/screenTime`,
    settings,
    { headers }
  );
  invalidateCache(`parental-controls:{"childId":"${childId}"}`);
  return data;
}

/**
 * Update content filter settings for a child
 */
export async function updateContentFilterSettings(
  childId: string,
  settings: Partial<ContentFilterSettings>,
  pinToken?: string
): Promise<ContentFilterSettings> {
  const headers = pinToken ? { 'X-Pin-Token': pinToken } : undefined;
  const data = await apiClient.put<ContentFilterSettings>(
    `/parent/children/${childId}/controls/contentFilter`,
    settings,
    { headers }
  );
  invalidateCache(`parental-controls:{"childId":"${childId}"}`);
  return data;
}

/**
 * Update subject access settings for a child
 */
export async function updateSubjectAccessSettings(
  childId: string,
  settings: Partial<SubjectAccessSettings>,
  pinToken?: string
): Promise<SubjectAccessSettings> {
  const headers = pinToken ? { 'X-Pin-Token': pinToken } : undefined;
  const data = await apiClient.put<SubjectAccessSettings>(
    `/parent/children/${childId}/controls/subjectAccess`,
    settings,
    { headers }
  );
  invalidateCache(`parental-controls:{"childId":"${childId}"}`);
  return data;
}

/**
 * Update safety settings for a child
 */
export async function updateSafetySettings(
  childId: string,
  settings: Partial<SafetySettings>,
  pinToken?: string
): Promise<SafetySettings> {
  const headers = pinToken ? { 'X-Pin-Token': pinToken } : undefined;
  const data = await apiClient.put<SafetySettings>(
    `/parent/children/${childId}/controls/safety`,
    settings,
    { headers }
  );
  invalidateCache(`parental-controls:{"childId":"${childId}"}`);
  return data;
}

/**
 * Update notification settings for a child
 */
export async function updateChildNotificationSettings(
  childId: string,
  settings: Partial<NotificationSettings>
): Promise<NotificationSettings> {
  const data = await apiClient.put<NotificationSettings>(
    `/parent/children/${childId}/controls/notifications`,
    settings
  );
  invalidateCache(`parental-controls:{"childId":"${childId}"}`);
  return data;
}

/**
 * Generic parental controls section update
 */
export async function updateParentalControlsSection<K extends keyof ParentalControlSettings>(
  childId: string,
  section: K,
  settings: Partial<ParentalControlSettings[K]>,
  pinToken?: string
): Promise<ParentalControlSettings[K]> {
  const headers = pinToken ? { 'X-Pin-Token': pinToken } : undefined;
  const data = await apiClient.put<ParentalControlSettings[K]>(
    `/parent/children/${childId}/controls/${section}`,
    settings,
    { headers }
  );
  invalidateCache(`parental-controls:{"childId":"${childId}"}`);
  return data;
}

// ============================================================================
// PIN Protection API
// ============================================================================

/**
 * Check if PIN protection is enabled for the current parent
 */
export async function isPinEnabled(): Promise<{ enabled: boolean }> {
  return apiClient.get<{ enabled: boolean }>('/parent/settings/pin/status');
}

/**
 * Verify PIN and get a temporary token for protected operations
 */
export async function verifyPin(request: VerifyPinRequest): Promise<VerifyPinResponse> {
  return apiClient.post<VerifyPinResponse>('/parent/settings/pin/verify', request);
}

/**
 * Set or update PIN
 */
export async function setPin(request: SetPinRequest): Promise<{ success: boolean }> {
  return apiClient.post<{ success: boolean }>('/parent/settings/pin/set', request);
}

/**
 * Remove PIN protection
 */
export async function removePin(currentPin: string): Promise<{ success: boolean }> {
  return apiClient.post<{ success: boolean }>('/parent/settings/pin/remove', {
    currentPin,
  });
}

// ============================================================================
// Accessibility Settings API
// ============================================================================

/**
 * Get accessibility settings for a learner
 */
export async function getAccessibilitySettings(learnerId: string): Promise<AccessibilitySettings> {
  const cacheKey = getCacheKey('accessibility-settings', { learnerId });
  const cached = getFromCache<AccessibilitySettings>(cacheKey);
  if (cached) return cached;

  const data = await apiClient.get<AccessibilitySettings>(
    `/learners/${learnerId}/settings/accessibility`
  );
  setCache(cacheKey, data, CACHE_TTL.accessibility);
  return data;
}

/**
 * Update accessibility settings for a learner
 */
export async function updateAccessibilitySettings(
  learnerId: string,
  settings: Partial<AccessibilitySettings>
): Promise<AccessibilitySettings> {
  const data = await apiClient.patch<AccessibilitySettings>(
    `/learners/${learnerId}/settings/accessibility`,
    settings
  );
  invalidateCache(`accessibility-settings:{"learnerId":"${learnerId}"}`);
  return data;
}

// ============================================================================
// Settings Sync API
// ============================================================================

/**
 * Get sync metadata for settings
 */
export async function getSettingsSyncMetadata(): Promise<SettingsSyncMetadata> {
  return apiClient.get<SettingsSyncMetadata>('/parent/settings/sync/metadata');
}

/**
 * Force sync settings from server (pull)
 */
export async function syncSettingsFromServer(): Promise<ParentSettings> {
  invalidateCache('parent-settings');
  invalidateCache('parental-controls');
  return apiClient.post<ParentSettings>('/parent/settings/sync/pull', {});
}

/**
 * Push local settings to server
 */
export async function syncSettingsToServer(
  settings: Partial<ParentSettings>
): Promise<ParentSettings> {
  const data = await apiClient.post<ParentSettings>('/parent/settings/sync/push', settings);
  invalidateCache('parent-settings');
  return data;
}

// ============================================================================
// Settings Export Object
// ============================================================================

/**
 * Settings API object for centralized access
 */
export const settingsApi = {
  // Parent Settings
  getParentSettings,
  updateParentProfile,
  updateAppSettings,
  updateNotificationSettings,

  // Parental Controls
  getParentalControls,
  updateScreenTimeSettings,
  updateContentFilterSettings,
  updateSubjectAccessSettings,
  updateSafetySettings,
  updateChildNotificationSettings,
  updateParentalControlsSection,

  // PIN Protection
  isPinEnabled,
  verifyPin,
  setPin,
  removePin,

  // Accessibility
  getAccessibilitySettings,
  updateAccessibilitySettings,

  // Sync
  getSettingsSyncMetadata,
  syncSettingsFromServer,
  syncSettingsToServer,
};

export default settingsApi;
