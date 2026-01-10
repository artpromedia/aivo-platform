/**
 * App Store Links Configuration
 *
 * Centralized configuration for mobile app store links.
 * Used for cross-app onboarding flows and download notifications.
 */

export const APP_STORE_LINKS = {
  learner: {
    ios: 'https://apps.apple.com/app/aivo-learner/id1234567890',
    android: 'https://play.google.com/store/apps/details?id=com.aivolearning.learner',
    universal: 'https://aivolearning.com/download/learner',
  },
  parent: {
    ios: 'https://apps.apple.com/app/aivo-parent/id1234567891',
    android: 'https://play.google.com/store/apps/details?id=com.aivolearning.parent',
    universal: 'https://aivolearning.com/download/parent',
  },
  teacher: {
    ios: 'https://apps.apple.com/app/aivo-teacher/id1234567892',
    android: 'https://play.google.com/store/apps/details?id=com.aivolearning.teacher',
    universal: 'https://aivolearning.com/download/teacher',
  },
} as const;

export type AppType = keyof typeof APP_STORE_LINKS;
export type Platform = 'ios' | 'android' | 'universal';

/**
 * Get the appropriate app store link based on platform detection.
 * Falls back to universal link if platform cannot be determined.
 */
export function getAppStoreLink(
  appType: AppType,
  userAgent?: string
): { url: string; platform: Platform } {
  const links = APP_STORE_LINKS[appType];

  if (userAgent) {
    const ua = userAgent.toLowerCase();
    if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
      return { url: links.ios, platform: 'ios' };
    }
    if (ua.includes('android')) {
      return { url: links.android, platform: 'android' };
    }
  }

  return { url: links.universal, platform: 'universal' };
}

/**
 * Generate deep link for app-to-app navigation.
 */
export function getDeepLink(appType: AppType, path: string = ''): string {
  const schemes: Record<AppType, string> = {
    learner: 'aivo-learner',
    parent: 'aivo-parent',
    teacher: 'aivo-teacher',
  };

  return `${schemes[appType]}://${path}`;
}

/**
 * Generate universal link for web-to-app navigation.
 */
export function getUniversalLink(appType: AppType, path: string = ''): string {
  const hosts: Record<AppType, string> = {
    learner: 'learn.aivolearning.com',
    parent: 'parent.aivolearning.com',
    teacher: 'teach.aivolearning.com',
  };

  return `https://${hosts[appType]}${path}`;
}
