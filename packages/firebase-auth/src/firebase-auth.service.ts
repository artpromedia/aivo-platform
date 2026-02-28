/**
 * Firebase Auth Service
 *
 * Shared Firebase Authentication helpers using Firebase Admin SDK.
 * Provides email verification link generation, user creation, and
 * verification status checks.
 *
 * Uses dynamic import to allow firebase-admin as an optional peer dependency.
 */

// ============================================================================
// Type definitions for firebase-admin Auth (compiles without package installed)
// ============================================================================

interface FirebaseAuthUser {
  uid: string;
  email?: string;
  emailVerified: boolean;
  disabled: boolean;
}

interface ActionCodeSettings {
  url: string;
  handleCodeInApp?: boolean;
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
    actionCodeSettings?: ActionCodeSettings
  ): Promise<string>;
  deleteUser(uid: string): Promise<void>;
}

interface FirebaseCredential {
  cert(options: {
    projectId: string;
    privateKey: string;
    clientEmail: string;
  }): unknown;
}

interface FirebaseApp {
  auth(): FirebaseAuth;
}

interface FirebaseAdminSDK {
  initializeApp(
    options: { credential: unknown },
    name?: string
  ): FirebaseApp;
  credential: FirebaseCredential;
}

// ============================================================================
// Config
// ============================================================================

export interface FirebaseAuthConfig {
  projectId: string;
  privateKey: string;
  clientEmail: string;
  /** Unique app name to avoid conflicts when multiple services init */
  appName?: string;
}

// ============================================================================
// Dynamic loader
// ============================================================================

let admin: FirebaseAdminSDK | null = null;

async function loadFirebaseAdmin(): Promise<FirebaseAdminSDK | null> {
  try {
    // Dynamic import — keeps firebase-admin optional at install time
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const module = await import('firebase-admin' as string);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return (module.default ?? module) as FirebaseAdminSDK;
  } catch {
    return null;
  }
}

// ============================================================================
// Service
// ============================================================================

export class FirebaseAuthService {
  private app: FirebaseApp | null = null;
  private initialized = false;
  private readonly cfg: FirebaseAuthConfig;

  constructor(cfg: FirebaseAuthConfig) {
    this.cfg = cfg;
  }

  /**
   * Initialize Firebase Admin SDK. Returns true on success.
   * Safe to call multiple times — subsequent calls are no-ops.
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) return this.app !== null;

    admin = await loadFirebaseAdmin();
    if (!admin) {
      this.initialized = true;
      return false;
    }

    try {
      this.app = admin.initializeApp(
        {
          credential: admin.credential.cert({
            projectId: this.cfg.projectId,
            privateKey: this.cfg.privateKey.replaceAll(
              String.raw`\n`,
              '\n'
            ),
            clientEmail: this.cfg.clientEmail,
          }),
        },
        this.cfg.appName ?? 'default'
      );
      this.initialized = true;
      return true;
    } catch {
      this.initialized = true;
      return false;
    }
  }

  /** Whether the SDK is ready for use */
  isConfigured(): boolean {
    return this.initialized && this.app !== null;
  }

  // --------------------------------------------------------------------------
  // User Management
  // --------------------------------------------------------------------------

  /**
   * Create a Firebase Auth user.
   * Returns the UID or null if Firebase is not configured.
   */
  async createUser(
    email: string,
    password?: string
  ): Promise<{ uid: string } | null> {
    if (!this.app) return null;

    const createRequest: { email: string; password?: string; emailVerified?: boolean } = {
      email,
      emailVerified: false,
    };
    if (password !== undefined) createRequest.password = password;

    const user = await this.app.auth().createUser(createRequest);

    return { uid: user.uid };
  }

  /**
   * Look up a Firebase user by email.
   * Returns null if not found or Firebase is not configured.
   */
  async getUserByEmail(
    email: string
  ): Promise<FirebaseAuthUser | null> {
    if (!this.app) return null;

    try {
      return await this.app.auth().getUserByEmail(email);
    } catch {
      return null;
    }
  }

  /**
   * Look up a Firebase user by UID.
   */
  async getUser(uid: string): Promise<FirebaseAuthUser | null> {
    if (!this.app) return null;

    try {
      return await this.app.auth().getUser(uid);
    } catch {
      return null;
    }
  }

  /**
   * Check whether a Firebase user's email is verified.
   */
  async isEmailVerified(uid: string): Promise<boolean> {
    if (!this.app) return false;

    try {
      const user = await this.app.auth().getUser(uid);
      return user.emailVerified;
    } catch {
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // Email Verification
  // --------------------------------------------------------------------------

  /**
   * Generate a Firebase email verification link.
   *
   * @param email     The email address to verify
   * @param continueUrl  URL to redirect to after verification
   * @returns The verification link, or null if Firebase is not configured
   */
  async generateEmailVerificationLink(
    email: string,
    continueUrl?: string
  ): Promise<string | null> {
    if (!this.app) return null;

    const settings: ActionCodeSettings | undefined = continueUrl
      ? { url: continueUrl }
      : undefined;

    return this.app
      .auth()
      .generateEmailVerificationLink(email, settings);
  }

  /**
   * Delete a Firebase user by UID.
   */
  async deleteUser(uid: string): Promise<void> {
    if (!this.app) return;

    try {
      await this.app.auth().deleteUser(uid);
    } catch {
      // Swallow — best-effort cleanup
    }
  }
}
