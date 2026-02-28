/**
 * Firebase Auth Integration
 *
 * Initializes the shared @aivo/firebase-auth service for auth-svc.
 * When Firebase credentials are configured, email verification uses
 * Firebase Admin SDK's generateEmailVerificationLink(). Otherwise
 * the service falls back to custom token-based verification.
 */

import { FirebaseAuthService } from '@aivo/firebase-auth';

import { config } from '../config.js';

let firebaseAuth: FirebaseAuthService | null = null;

/**
 * Initialize Firebase Auth if credentials are present.
 * Call once during service startup.
 */
export async function initializeFirebaseAuth(): Promise<void> {
  const { firebaseProjectId, firebasePrivateKey, firebaseClientEmail } =
    config;

  if (!firebaseProjectId || !firebasePrivateKey || !firebaseClientEmail) {
    console.log(
      '[auth-svc] Firebase Auth not configured — using custom token verification'
    );
    return;
  }

  firebaseAuth = new FirebaseAuthService({
    projectId: firebaseProjectId,
    privateKey: firebasePrivateKey,
    clientEmail: firebaseClientEmail,
    appName: 'auth-svc',
  });

  const ok = await firebaseAuth.initialize();
  if (ok) {
    console.log('[auth-svc] Firebase Auth initialized');
  } else {
    firebaseAuth = null;
    console.warn(
      '[auth-svc] Firebase Auth init failed — using custom token verification'
    );
  }
}

/**
 * Returns the FirebaseAuthService instance, or null if not configured.
 */
export function getFirebaseAuth(): FirebaseAuthService | null {
  return firebaseAuth;
}
