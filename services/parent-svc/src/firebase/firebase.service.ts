/**
 * Firebase Admin SDK Service
 *
 * Provides Firebase Cloud Messaging (FCM) for push notifications
 * and Firebase Auth for email verification link generation.
 */

import { logger } from '@aivo/ts-observability';

import { config } from '../config.js';

// Type definitions for firebase-admin (allows compile without package installed)
interface FirebaseCredential {
  cert(options: { projectId: string; privateKey: string; clientEmail: string }): unknown;
}
interface FirebaseMessaging {
  send(message: unknown): Promise<string>;
  sendEachForMulticast(message: unknown): Promise<{
    successCount: number;
    failureCount: number;
    responses: { success: boolean; error?: { code?: string } }[];
  }>;
}
interface FirebaseAuthUser {
  uid: string;
  email?: string;
  emailVerified: boolean;
  disabled: boolean;
}
interface FirebaseAuth {
  createUser(properties: {
    email: string;
    password?: string;
    emailVerified?: boolean;
  }): Promise<FirebaseAuthUser>;
  getUserByEmail(email: string): Promise<FirebaseAuthUser>;
  getUser(uid: string): Promise<FirebaseAuthUser>;
  generateEmailVerificationLink(
    email: string,
    actionCodeSettings?: { url: string }
  ): Promise<string>;
}
interface FirebaseAdminSDK {
  initializeApp(options: { credential: unknown }): unknown;
  credential: FirebaseCredential;
  messaging(): FirebaseMessaging;
  auth(): FirebaseAuth;
}

// Firebase admin SDK is loaded dynamically to allow optional dependency
let admin: FirebaseAdminSDK | null = null;

async function loadFirebaseAdmin(): Promise<FirebaseAdminSDK | null> {
  try {
    // Dynamic import to allow optional dependency
    const module = await import('firebase-admin' as string);
    return (module.default ?? module) as FirebaseAdminSDK;
  } catch {
    return null;
  }
}

export class FirebaseService {
  private app: unknown = null;
  private initialized = false;

  /**
   * Initialize Firebase Admin SDK
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    const { firebaseProjectId, firebasePrivateKey, firebaseClientEmail } = config;

    // Skip initialization if credentials are not configured
    if (!firebaseProjectId || !firebasePrivateKey || !firebaseClientEmail) {
      logger.warn('Firebase credentials not configured, push notifications will be disabled');
      return;
    }

    // Load firebase-admin dynamically
    admin = await loadFirebaseAdmin();
    if (!admin) {
      logger.warn('firebase-admin package not installed, push notifications will be disabled');
      return;
    }

    try {
      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: firebaseProjectId,
          privateKey: firebasePrivateKey.replaceAll(String.raw`\n`, '\n'),
          clientEmail: firebaseClientEmail,
        }),
      });
      this.initialized = true;
      logger.info('Firebase Admin SDK initialized successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to initialize Firebase Admin SDK: ${message}`);
    }
  }

  /**
   * Check if Firebase is properly configured and initialized
   */
  isConfigured(): boolean {
    return this.initialized && this.app !== null && admin !== null;
  }

  /**
   * Send a push notification via FCM
   */
  async sendPushNotification(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured() || !admin) {
      return { success: false, error: 'Firebase not configured' };
    }

    try {
      const message = {
        token,
        notification: {
          title,
          body,
        },
        data,
        // iOS-specific settings
        apns: {
          payload: {
            aps: {
              badge: 1,
              sound: 'default',
            },
          },
        },
        // Android-specific settings
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            priority: 'high',
            channelId: 'aivo_notifications',
          },
        },
      };

      const messageId = await admin.messaging().send(message);
      logger.info(`Push notification sent successfully: ${messageId}`);
      return { success: true, messageId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorCode = (error as { code?: string })?.code;

      logger.error(`Failed to send push notification: ${errorMessage} (${errorCode})`);

      // Handle specific FCM errors
      if (
        errorCode === 'messaging/invalid-registration-token' ||
        errorCode === 'messaging/registration-token-not-registered'
      ) {
        return { success: false, error: 'invalid_token' };
      }

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send push notifications to multiple tokens
   */
  async sendMulticast(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<{ successCount: number; failureCount: number; invalidTokens: string[] }> {
    if (!this.isConfigured() || !admin) {
      return { successCount: 0, failureCount: tokens.length, invalidTokens: [] };
    }

    if (tokens.length === 0) {
      return { successCount: 0, failureCount: 0, invalidTokens: [] };
    }

    try {
      const message = {
        tokens,
        notification: {
          title,
          body,
        },
        data,
        apns: {
          payload: {
            aps: {
              badge: 1,
              sound: 'default',
            },
          },
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            priority: 'high',
            channelId: 'aivo_notifications',
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      const invalidTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const code = resp.error?.code;
          if (
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/registration-token-not-registered'
          ) {
            invalidTokens.push(tokens[idx]);
          }
        }
      });

      logger.info(`Multicast push: ${response.successCount} sent, ${response.failureCount} failed`);

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokens,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to send multicast push notification: ${message}`);
      return { successCount: 0, failureCount: tokens.length, invalidTokens: [] };
    }
  }

  // --------------------------------------------------------------------------
  // Firebase Auth — Email Verification
  // --------------------------------------------------------------------------

  /**
   * Create a Firebase Auth user for email verification tracking.
   * Returns the UID or null if Firebase is not configured.
   */
  async createAuthUser(
    email: string,
    password?: string
  ): Promise<{ uid: string } | null> {
    if (!this.isConfigured() || !admin) {
      return null;
    }

    try {
      const user = await admin.auth().createUser({
        email,
        password,
        emailVerified: false,
      });
      return { uid: user.uid };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to create Firebase Auth user: ${msg}`);
      return null;
    }
  }

  /**
   * Generate a Firebase email verification link.
   */
  async generateEmailVerificationLink(
    email: string,
    continueUrl?: string
  ): Promise<string | null> {
    if (!this.isConfigured() || !admin) {
      return null;
    }

    try {
      const settings = continueUrl ? { url: continueUrl } : undefined;
      return await admin
        .auth()
        .generateEmailVerificationLink(email, settings);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to generate verification link: ${msg}`);
      return null;
    }
  }

  /**
   * Look up a Firebase user by email.
   */
  async getUserByEmail(
    email: string
  ): Promise<{ uid: string; emailVerified: boolean } | null> {
    if (!this.isConfigured() || !admin) {
      return null;
    }

    try {
      const user = await admin.auth().getUserByEmail(email);
      return { uid: user.uid, emailVerified: user.emailVerified };
    } catch {
      return null;
    }
  }

  /**
   * Check whether a Firebase user's email is verified.
   */
  async isEmailVerified(uid: string): Promise<boolean> {
    if (!this.isConfigured() || !admin) {
      return false;
    }

    try {
      const user = await admin.auth().getUser(uid);
      return user.emailVerified;
    } catch {
      return false;
    }
  }
}
