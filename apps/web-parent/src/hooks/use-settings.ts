/**
 * Settings Hooks
 *
 * React Query hooks for settings and parental controls management.
 * Provides real-time persistence with optimistic updates.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ParentSettings,
  ParentProfileSettings,
  AppSettings,
  NotificationSettings,
  ParentalControlSettings,
  ScreenTimeSettings,
  ContentFilterSettings,
  SubjectAccessSettings,
  SafetySettings,
  VerifyPinResponse,
  AccessibilitySettings,
} from '@aivo/ts-types';

import {
  settingsApi,
  getParentSettings,
  updateParentProfile,
  updateAppSettings,
  updateNotificationSettings,
  getParentalControls,
  updateScreenTimeSettings,
  updateContentFilterSettings,
  updateSubjectAccessSettings,
  updateSafetySettings,
  updateChildNotificationSettings,
  isPinEnabled,
  verifyPin,
  setPin,
  removePin,
  getAccessibilitySettings,
  updateAccessibilitySettings,
} from '@/lib/api/settings.api';

// ============================================================================
// Query Keys
// ============================================================================

export const settingsKeys = {
  all: ['settings'] as const,
  parent: () => [...settingsKeys.all, 'parent'] as const,
  controls: (childId: string) => [...settingsKeys.all, 'controls', childId] as const,
  pin: () => [...settingsKeys.all, 'pin'] as const,
  accessibility: (learnerId: string) => [...settingsKeys.all, 'accessibility', learnerId] as const,
};

// ============================================================================
// Parent Settings Hooks
// ============================================================================

/**
 * Fetch parent settings
 */
export function useParentSettings() {
  return useQuery({
    queryKey: settingsKeys.parent(),
    queryFn: getParentSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });
}

/**
 * Update parent profile
 */
export function useUpdateParentProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (profile: Partial<ParentProfileSettings>) => updateParentProfile(profile),
    onMutate: async (newProfile) => {
      await queryClient.cancelQueries({ queryKey: settingsKeys.parent() });
      const previousSettings = queryClient.getQueryData<ParentSettings>(settingsKeys.parent());

      if (previousSettings) {
        queryClient.setQueryData<ParentSettings>(settingsKeys.parent(), {
          ...previousSettings,
          profile: { ...previousSettings.profile, ...newProfile },
        });
      }

      return { previousSettings };
    },
    onError: (err, _, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(settingsKeys.parent(), context.previousSettings);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.parent() });
    },
  });
}

/**
 * Update app settings
 */
export function useUpdateAppSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: Partial<AppSettings>) => updateAppSettings(settings),
    onMutate: async (newSettings) => {
      await queryClient.cancelQueries({ queryKey: settingsKeys.parent() });
      const previousSettings = queryClient.getQueryData<ParentSettings>(settingsKeys.parent());

      if (previousSettings) {
        queryClient.setQueryData<ParentSettings>(settingsKeys.parent(), {
          ...previousSettings,
          app: { ...previousSettings.app, ...newSettings },
        });
      }

      return { previousSettings };
    },
    onError: (err, _, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(settingsKeys.parent(), context.previousSettings);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.parent() });
    },
  });
}

/**
 * Update notification settings
 */
export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: Partial<NotificationSettings>) => updateNotificationSettings(settings),
    onMutate: async (newSettings) => {
      await queryClient.cancelQueries({ queryKey: settingsKeys.parent() });
      const previousSettings = queryClient.getQueryData<ParentSettings>(settingsKeys.parent());

      if (previousSettings) {
        queryClient.setQueryData<ParentSettings>(settingsKeys.parent(), {
          ...previousSettings,
          notifications: { ...previousSettings.notifications, ...newSettings },
        });
      }

      return { previousSettings };
    },
    onError: (err, _, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(settingsKeys.parent(), context.previousSettings);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.parent() });
    },
  });
}

// ============================================================================
// Parental Controls Hooks
// ============================================================================

/**
 * Fetch parental controls for a child
 */
export function useChildParentalControls(childId: string | null) {
  return useQuery({
    queryKey: settingsKeys.controls(childId || ''),
    queryFn: () => {
      if (!childId) throw new Error('No child ID');
      return getParentalControls(childId);
    },
    enabled: !!childId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 3,
  });
}

/**
 * Update screen time settings with PIN protection
 */
export function useUpdateScreenTime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      childId,
      settings,
      pinToken,
    }: {
      childId: string;
      settings: Partial<ScreenTimeSettings>;
      pinToken?: string;
    }) => updateScreenTimeSettings(childId, settings, pinToken),
    onSuccess: (_, { childId }) => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.controls(childId) });
    },
  });
}

/**
 * Update content filter settings with PIN protection
 */
export function useUpdateContentFilter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      childId,
      settings,
      pinToken,
    }: {
      childId: string;
      settings: Partial<ContentFilterSettings>;
      pinToken?: string;
    }) => updateContentFilterSettings(childId, settings, pinToken),
    onSuccess: (_, { childId }) => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.controls(childId) });
    },
  });
}

/**
 * Update subject access settings with PIN protection
 */
export function useUpdateSubjectAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      childId,
      settings,
      pinToken,
    }: {
      childId: string;
      settings: Partial<SubjectAccessSettings>;
      pinToken?: string;
    }) => updateSubjectAccessSettings(childId, settings, pinToken),
    onSuccess: (_, { childId }) => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.controls(childId) });
    },
  });
}

/**
 * Update safety settings with PIN protection
 */
export function useUpdateSafetySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      childId,
      settings,
      pinToken,
    }: {
      childId: string;
      settings: Partial<SafetySettings>;
      pinToken?: string;
    }) => updateSafetySettings(childId, settings, pinToken),
    onSuccess: (_, { childId }) => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.controls(childId) });
    },
  });
}

/**
 * Update child notification settings
 */
export function useUpdateChildNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      childId,
      settings,
    }: {
      childId: string;
      settings: Partial<NotificationSettings>;
    }) => updateChildNotificationSettings(childId, settings),
    onSuccess: (_, { childId }) => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.controls(childId) });
    },
  });
}

// ============================================================================
// PIN Protection Hooks
// ============================================================================

/**
 * Check if PIN protection is enabled
 */
export function usePinStatus() {
  return useQuery({
    queryKey: settingsKeys.pin(),
    queryFn: isPinEnabled,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Verify PIN
 */
export function useVerifyPin() {
  return useMutation({
    mutationFn: ({ pin, action }: { pin: string; action: string }) =>
      verifyPin({ pin, action }),
  });
}

/**
 * Set or update PIN
 */
export function useSetPin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ newPin, currentPin }: { newPin: string; currentPin?: string }) =>
      setPin({ newPin, currentPin }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.pin() });
    },
  });
}

/**
 * Remove PIN protection
 */
export function useRemovePin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (currentPin: string) => removePin(currentPin),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.pin() });
    },
  });
}

// ============================================================================
// Accessibility Settings Hooks
// ============================================================================

/**
 * Fetch accessibility settings for a learner
 */
export function useAccessibilitySettings(learnerId: string | null) {
  return useQuery({
    queryKey: settingsKeys.accessibility(learnerId || ''),
    queryFn: () => {
      if (!learnerId) throw new Error('No learner ID');
      return getAccessibilitySettings(learnerId);
    },
    enabled: !!learnerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Update accessibility settings
 */
export function useUpdateAccessibilitySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      learnerId,
      settings,
    }: {
      learnerId: string;
      settings: Partial<AccessibilitySettings>;
    }) => updateAccessibilitySettings(learnerId, settings),
    onSuccess: (_, { learnerId }) => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.accessibility(learnerId) });
    },
  });
}

// ============================================================================
// Settings Sync Hooks
// ============================================================================

/**
 * Sync settings from server on login or app initialization
 * This ensures the user has the latest settings from all their devices
 */
export function useSyncSettingsOnLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Pull latest settings from server
      const settings = await settingsApi.syncSettingsFromServer();
      return settings;
    },
    onSuccess: (settings) => {
      // Update the cache with synced settings
      queryClient.setQueryData(settingsKeys.parent(), settings);
    },
  });
}

/**
 * Push local settings changes to server for cross-device sync
 */
export function usePushSettingsToServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: Partial<ParentSettings>) =>
      settingsApi.syncSettingsToServer(settings),
    onSuccess: (settings) => {
      queryClient.setQueryData(settingsKeys.parent(), settings);
    },
  });
}

/**
 * Get settings sync metadata
 */
export function useSettingsSyncMetadata() {
  return useQuery({
    queryKey: [...settingsKeys.all, 'sync-metadata'] as const,
    queryFn: () => settingsApi.getSettingsSyncMetadata(),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}
