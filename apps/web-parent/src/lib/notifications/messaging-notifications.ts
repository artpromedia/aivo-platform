/**
 * Messaging Notifications
 * Sprint 1.8: Integrate Web Parent Messaging with messaging-svc
 *
 * Browser notification support for real-time messaging events.
 * Handles permission requests, notification display, and click handling.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

import type { Message, Conversation } from '@/lib/api/messaging.api';

// ============================================================================
// Types
// ============================================================================

export interface NotificationOptions {
  /**
   * Whether to show notifications only when the tab is not focused
   */
  onlyWhenHidden?: boolean;

  /**
   * Whether to play a sound with notifications
   */
  playSound?: boolean;

  /**
   * Custom icon URL
   */
  iconUrl?: string;

  /**
   * Custom badge URL (for mobile)
   */
  badgeUrl?: string;

  /**
   * Tag to group related notifications
   */
  tag?: string;

  /**
   * Whether to require user interaction to dismiss
   */
  requireInteraction?: boolean;

  /**
   * Auto-close delay in milliseconds
   */
  autoCloseDelay?: number;

  /**
   * Click handler
   */
  onClick?: () => void;
}

export type NotificationPermission = 'default' | 'granted' | 'denied';

export interface NotificationState {
  permission: NotificationPermission;
  isSupported: boolean;
  isEnabled: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_OPTIONS: NotificationOptions = {
  onlyWhenHidden: true,
  playSound: true,
  iconUrl: '/icon.png',
  badgeUrl: '/badge.png',
  autoCloseDelay: 5000,
};

// Sound file for notification (base64 encoded short beep)
const NOTIFICATION_SOUND_URL = '/sounds/notification.mp3';

// ============================================================================
// Notification Manager
// ============================================================================

class MessagingNotificationManager {
  private options: NotificationOptions;
  private audioContext: AudioContext | null = null;
  private notificationSound: HTMLAudioElement | null = null;
  private activeNotifications = new Map<string, Notification>();

  constructor(options?: NotificationOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.initializeAudio();
  }

  /**
   * Initialize audio for notification sounds
   */
  private initializeAudio(): void {
    if (typeof window === 'undefined') return;

    try {
      this.notificationSound = new Audio(NOTIFICATION_SOUND_URL);
      this.notificationSound.volume = 0.5;
      // Preload the audio
      this.notificationSound.load();
    } catch (error) {
      console.warn('[Notifications] Failed to initialize audio:', error);
    }
  }

  /**
   * Check if notifications are supported
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  /**
   * Get current permission state
   */
  getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission as NotificationPermission;
  }

  /**
   * Get full notification state
   */
  getState(): NotificationState {
    return {
      isSupported: this.isSupported(),
      permission: this.getPermission(),
      isEnabled: this.getPermission() === 'granted',
    };
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      console.warn('[Notifications] Browser does not support notifications');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      console.warn('[Notifications] Permission was previously denied');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      return permission as NotificationPermission;
    } catch (error) {
      console.error('[Notifications] Failed to request permission:', error);
      return 'denied';
    }
  }

  /**
   * Check if should show notification
   */
  private shouldShowNotification(): boolean {
    if (!this.isSupported()) return false;
    if (Notification.permission !== 'granted') return false;

    // Only show when tab is hidden if configured
    if (this.options.onlyWhenHidden && typeof document !== 'undefined') {
      return document.hidden;
    }

    return true;
  }

  /**
   * Play notification sound
   */
  private playNotificationSound(): void {
    if (!this.options.playSound || !this.notificationSound) return;

    try {
      // Reset and play
      this.notificationSound.currentTime = 0;
      void this.notificationSound.play().catch(() => {
        // Ignore autoplay errors
      });
    } catch (error) {
      console.warn('[Notifications] Failed to play sound:', error);
    }
  }

  /**
   * Show notification for a new message
   */
  showMessageNotification(
    message: Message,
    conversation: Conversation,
    options?: NotificationOptions
  ): Notification | null {
    if (!this.shouldShowNotification()) return null;

    const mergedOptions = { ...this.options, ...options };
    const senderName = message.senderName || 'Someone';
    const preview = message.content.substring(0, 100);

    try {
      // Close existing notification for this conversation
      this.closeNotification(conversation.id);

      const notification = new Notification(`Message from ${senderName}`, {
        body: preview,
        icon: mergedOptions.iconUrl,
        badge: mergedOptions.badgeUrl,
        tag: `message-${conversation.id}`,
        requireInteraction: mergedOptions.requireInteraction,
        silent: true, // We handle sound ourselves
      });

      // Store for later management
      this.activeNotifications.set(conversation.id, notification);

      // Handle click
      notification.onclick = () => {
        window.focus();
        notification.close();
        this.activeNotifications.delete(conversation.id);
        mergedOptions.onClick?.();
      };

      // Auto-close
      if (mergedOptions.autoCloseDelay) {
        setTimeout(() => {
          notification.close();
          this.activeNotifications.delete(conversation.id);
        }, mergedOptions.autoCloseDelay);
      }

      // Play sound
      this.playNotificationSound();

      return notification;
    } catch (error) {
      console.error('[Notifications] Failed to show notification:', error);
      return null;
    }
  }

  /**
   * Show notification for multiple unread messages
   */
  showUnreadCountNotification(count: number, options?: NotificationOptions): Notification | null {
    if (!this.shouldShowNotification() || count === 0) return null;

    const mergedOptions = { ...this.options, ...options };

    try {
      this.closeNotification('unread-summary');

      const notification = new Notification('New Messages', {
        body: `You have ${count} unread message${count > 1 ? 's' : ''}`,
        icon: mergedOptions.iconUrl,
        badge: mergedOptions.badgeUrl,
        tag: 'unread-summary',
        requireInteraction: false,
        silent: true,
      });

      this.activeNotifications.set('unread-summary', notification);

      notification.onclick = () => {
        window.focus();
        notification.close();
        this.activeNotifications.delete('unread-summary');
        mergedOptions.onClick?.();
      };

      if (mergedOptions.autoCloseDelay) {
        setTimeout(() => {
          notification.close();
          this.activeNotifications.delete('unread-summary');
        }, mergedOptions.autoCloseDelay);
      }

      return notification;
    } catch (error) {
      console.error('[Notifications] Failed to show unread notification:', error);
      return null;
    }
  }

  /**
   * Close a specific notification
   */
  closeNotification(id: string): void {
    const notification = this.activeNotifications.get(id);
    if (notification) {
      notification.close();
      this.activeNotifications.delete(id);
    }
  }

  /**
   * Close all active notifications
   */
  closeAllNotifications(): void {
    this.activeNotifications.forEach((notification) => {
      notification.close();
    });
    this.activeNotifications.clear();
  }

  /**
   * Update options
   */
  setOptions(options: Partial<NotificationOptions>): void {
    this.options = { ...this.options, ...options };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let notificationManager: MessagingNotificationManager | null = null;

/**
 * Get or create the notification manager singleton
 */
export function getNotificationManager(
  options?: NotificationOptions
): MessagingNotificationManager {
  if (!notificationManager) {
    notificationManager = new MessagingNotificationManager(options);
  } else if (options) {
    notificationManager.setOptions(options);
  }
  return notificationManager;
}

// ============================================================================
// React Hook
// ============================================================================

// React imports moved to top of file

/**
 * Hook for managing messaging notifications
 */
export function useMessagingNotifications(options?: NotificationOptions) {
  const [state, setState] = useState<NotificationState>({
    isSupported: false,
    permission: 'default',
    isEnabled: false,
  });

  const manager = getNotificationManager(options);

  // Initialize state
  useEffect(() => {
    setState(manager.getState());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Request permission
  const requestPermission = useCallback(async () => {
    const permission = await manager.requestPermission();
    setState(manager.getState());
    return permission;
  }, [manager]);

  // Show message notification
  const showMessageNotification = useCallback(
    (message: Message, conversation: Conversation, notifyOptions?: NotificationOptions) => {
      return manager.showMessageNotification(message, conversation, notifyOptions);
    },
    [manager]
  );

  // Show unread count notification
  const showUnreadNotification = useCallback(
    (count: number, notifyOptions?: NotificationOptions) => {
      return manager.showUnreadCountNotification(count, notifyOptions);
    },
    [manager]
  );

  // Close notifications
  const closeNotification = useCallback(
    (id: string) => {
      manager.closeNotification(id);
    },
    [manager]
  );

  const closeAllNotifications = useCallback(() => {
    manager.closeAllNotifications();
  }, [manager]);

  return {
    ...state,
    requestPermission,
    showMessageNotification,
    showUnreadNotification,
    closeNotification,
    closeAllNotifications,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if browser supports notifications
 */
export function supportsNotifications(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Check if notifications are currently enabled
 */
export function notificationsEnabled(): boolean {
  return supportsNotifications() && Notification.permission === 'granted';
}

/**
 * Request notification permission (standalone utility)
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!supportsNotifications()) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';

  try {
    return (await Notification.requestPermission()) as NotificationPermission;
  } catch {
    return 'denied';
  }
}
