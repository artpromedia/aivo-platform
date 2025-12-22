/**
 * LTI User Service
 *
 * Handles the resolution and creation of AIVO users from LTI launches.
 * Implements the complete user mapping flow:
 * 1. Check existing LTI link (same issuer + clientId + sub)
 * 2. Try to match by email (link existing AIVO user)
 * 3. Create new user (provision from LTI claims)
 *
 * Supports:
 * - Multiple LTI platforms per user (Canvas + Schoology)
 * - Role mapping (LTI roles → AIVO roles)
 * - Profile syncing (update AIVO user from LTI claims)
 * - Tenant resolution from platform registration
 */

import type { PrismaClient, LtiUserMapping } from '../generated/prisma-client/index.js';

import { LtiUserRole, LTI_ROLES } from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * LTI User Mapping record - re-export from Prisma for convenience
 */
export type LtiUserMappingRecord = LtiUserMapping;

/**
 * Context extracted from LTI launch for user resolution
 */
export interface LtiUserContext {
  /** LTI platform issuer URL */
  issuer: string;
  /** OAuth client ID */
  clientId: string;
  /** LTI deployment ID */
  deploymentId: string;
  /** Platform user subject (unique user ID on platform) */
  sub: string;
  /** User's email address (may be absent for privacy) */
  email?: string;
  /** User's given/first name */
  givenName?: string;
  /** User's family/last name */
  familyName?: string;
  /** User's full display name */
  name?: string;
  /** LTI roles (URIs) */
  roles: string[];
  /** Custom claims passed from LMS */
  customClaims?: Record<string, string>;
  /** Tenant ID from tool registration */
  tenantId: string;
  /** Tool ID for the LTI tool registration */
  toolId: string;
}

/**
 * AIVO user role enum (matches auth-svc)
 */
export type AivoUserRole = 'LEARNER' | 'TEACHER' | 'PARENT' | 'ADMIN' | 'AUTHOR';

/**
 * Resolved user result
 */
export interface ResolvedUser {
  /** AIVO user ID */
  userId: string;
  /** Whether user was newly created */
  isNewUser: boolean;
  /** Mapped AIVO role */
  role: AivoUserRole;
  /** User's display name */
  displayName: string;
  /** User's email (if available) */
  email?: string | undefined;
  /** The LTI user mapping record */
  mapping: LtiUserMappingRecord;
}

/**
 * User profile for creation/update
 */
interface UserProfile {
  email?: string | undefined;
  displayName: string;
  firstName?: string | undefined;
  lastName?: string | undefined;
  role: AivoUserRole;
  source: 'LTI';
  emailVerified: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// LTI USER SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class LtiUserService {
  private readonly prisma: PrismaClient;
  private readonly authServiceUrl: string | undefined;

  constructor(prisma: PrismaClient, authServiceUrl?: string) {
    this.prisma = prisma;
    this.authServiceUrl = authServiceUrl ?? process.env.AUTH_SERVICE_URL;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MAIN RESOLUTION FLOW
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Resolve LTI user to AIVO user, creating if necessary.
   *
   * Resolution priority:
   * 1. Existing LTI link (same platform + user ID)
   * 2. Email match (link existing AIVO user to LTI)
   * 3. Create new user
   */
  async resolveOrCreateUser(context: LtiUserContext): Promise<ResolvedUser> {
    // Step 1: Check for existing LTI user mapping
    const existingMapping = await this.findExistingMapping(context);

    if (existingMapping) {
      // Update user profile if LTI data changed
      await this.syncUserProfile(existingMapping.aivoUserId, context);

      return {
        userId: existingMapping.aivoUserId,
        isNewUser: false,
        role: this.mapLtiRoles(context.roles),
        displayName: this.buildDisplayName(context),
        email: context.email,
        mapping: existingMapping,
      };
    }

    // Step 2: Try to match by email if provided
    if (context.email) {
      const emailMatch = await this.findUserByEmail(context.email, context.tenantId);

      if (emailMatch) {
        // Create LTI link for existing user
        const mapping = await this.createUserMapping(emailMatch.userId, context);

        return {
          userId: emailMatch.userId,
          isNewUser: false,
          role: this.mapLtiRoles(context.roles),
          displayName: this.buildDisplayName(context),
          email: context.email,
          mapping,
        };
      }
    }

    // Step 3: Create new user
    const newUser = await this.createUserFromLti(context);
    const mapping = await this.createUserMapping(newUser.userId, context);

    return {
      userId: newUser.userId,
      isNewUser: true,
      role: newUser.role,
      displayName: newUser.displayName,
      email: newUser.email,
      mapping,
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // LOOKUP METHODS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Find existing LTI user mapping
   */
  private async findExistingMapping(context: LtiUserContext): Promise<LtiUserMappingRecord | null> {
    return this.prisma.ltiUserMapping.findUnique({
      where: {
        ltiToolId_lmsUserId: {
          ltiToolId: context.toolId,
          lmsUserId: context.sub,
        },
      },
    });
  }

  /**
   * Find AIVO user by email within tenant
   */
  private async findUserByEmail(
    email: string,
    tenantId: string
  ): Promise<{ userId: string } | null> {
    // Check if we have a user mapping with this email
    const existingMapping = await this.prisma.ltiUserMapping.findFirst({
      where: {
        tenantId,
        lmsEmail: email,
      },
      select: {
        aivoUserId: true,
      },
    });

    if (existingMapping) {
      return { userId: existingMapping.aivoUserId };
    }

    // If auth service is available, call it to find user by email
    if (this.authServiceUrl) {
      try {
        const response = await fetch(
          `${this.authServiceUrl}/internal/users/by-email?email=${encodeURIComponent(email)}&tenantId=${tenantId}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Internal-Service': 'lti-svc',
            },
          }
        );

        if (response.ok) {
          const user = (await response.json()) as { id: string };
          return { userId: user.id };
        }
      } catch (error) {
        console.error('Failed to lookup user by email:', error);
      }
    }

    return null;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // USER CREATION
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Create a new AIVO user from LTI context
   */
  private async createUserFromLti(
    context: LtiUserContext
  ): Promise<{ userId: string; role: AivoUserRole; displayName: string; email?: string }> {
    const role = this.mapLtiRoles(context.roles);
    const displayName = this.buildDisplayName(context);

    // Generate a placeholder email if not provided
    // Using a recognizable pattern for LTI-provisioned accounts
    const email = context.email || this.generatePlaceholderEmail(context);

    const profile: UserProfile = {
      email,
      displayName,
      firstName: context.givenName,
      lastName: context.familyName,
      role,
      source: 'LTI',
      emailVerified: !!context.email, // Only verified if real email
    };

    // Call auth service to create user
    if (this.authServiceUrl) {
      try {
        const response = await fetch(`${this.authServiceUrl}/internal/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Service': 'lti-svc',
          },
          body: JSON.stringify({
            tenantId: context.tenantId,
            ...profile,
            metadata: {
              ltiIssuer: context.issuer,
              ltiClientId: context.clientId,
              ltiSub: context.sub,
            },
          }),
        });

        if (response.ok) {
          const user = (await response.json()) as { id: string };
          return {
            userId: user.id,
            role,
            displayName,
            ...(context.email ? { email: context.email } : {}),
          };
        }

        // If email conflict, try to get existing user
        if (response.status === 409) {
          const existingUser = await this.findUserByEmail(email, context.tenantId);
          if (existingUser) {
            return {
              userId: existingUser.userId,
              role,
              displayName,
              ...(context.email ? { email: context.email } : {}),
            };
          }
        }

        throw new Error(`Failed to create user: ${response.status}`);
      } catch (error) {
        console.error('Failed to create user via auth service:', error);
        throw error;
      }
    }

    // Fallback: Generate a UUID for local-only scenarios (testing)
    const userId = crypto.randomUUID();
    console.warn(`Auth service unavailable, generated local user ID: ${userId}`);

    return {
      userId,
      role,
      displayName,
      ...(context.email ? { email: context.email } : {}),
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // USER MAPPING
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Create LTI user mapping record
   */
  private async createUserMapping(
    aivoUserId: string,
    context: LtiUserContext
  ): Promise<LtiUserMappingRecord> {
    return this.prisma.ltiUserMapping.create({
      data: {
        tenantId: context.tenantId,
        ltiToolId: context.toolId,
        lmsUserId: context.sub,
        aivoUserId,
        lmsEmail: context.email ?? null,
        lmsName: this.buildDisplayName(context),
      },
    });
  }

  /**
   * Update existing mapping with new LTI data
   */
  private async updateMapping(mappingId: string, context: LtiUserContext): Promise<void> {
    await this.prisma.ltiUserMapping.update({
      where: { id: mappingId },
      data: {
        lmsEmail: context.email ?? null,
        lmsName: this.buildDisplayName(context),
        lastSeenAt: new Date(),
      },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PROFILE SYNC
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Sync AIVO user profile with LTI claims (if changed)
   */
  private async syncUserProfile(userId: string, context: LtiUserContext): Promise<void> {
    // Update the mapping first
    const mapping = await this.findExistingMapping(context);
    if (mapping) {
      await this.updateMapping(mapping.id, context);
    }

    // If auth service available, sync profile changes
    if (this.authServiceUrl) {
      try {
        await fetch(`${this.authServiceUrl}/internal/users/${userId}/sync-lti`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Service': 'lti-svc',
          },
          body: JSON.stringify({
            displayName: this.buildDisplayName(context),
            firstName: context.givenName,
            lastName: context.familyName,
            // Only update email if previously placeholder
            email: context.email,
          }),
        });
      } catch (error) {
        // Non-critical, log and continue
        console.warn('Failed to sync user profile:', error);
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ROLE MAPPING
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Map LTI role URIs to AIVO roles.
   *
   * LTI uses URIs for roles, we need to map to our enum.
   * Priority: Instructor > TA > Admin > Content Developer > Mentor > Learner
   */
  mapLtiRoles(ltiRoles: string[]): AivoUserRole {
    const roleMapping: Record<string, AivoUserRole> = {
      // Context (course) roles
      [LTI_ROLES.CONTEXT_INSTRUCTOR]: 'TEACHER',
      [LTI_ROLES.CONTEXT_TEACHING_ASSISTANT]: 'TEACHER',
      [LTI_ROLES.CONTEXT_CONTENT_DEVELOPER]: 'AUTHOR',
      [LTI_ROLES.CONTEXT_MENTOR]: 'TEACHER',
      [LTI_ROLES.CONTEXT_LEARNER]: 'LEARNER',

      // Institution roles
      [LTI_ROLES.INSTITUTION_INSTRUCTOR]: 'TEACHER',
      [LTI_ROLES.INSTITUTION_STUDENT]: 'LEARNER',
      [LTI_ROLES.INSTITUTION_ADMINISTRATOR]: 'ADMIN',

      // System roles
      [LTI_ROLES.SYSTEM_ADMINISTRATOR]: 'ADMIN',
    };

    // Check roles in priority order
    const priorityOrder: AivoUserRole[] = ['ADMIN', 'AUTHOR', 'TEACHER', 'LEARNER'];

    for (const priorityRole of priorityOrder) {
      for (const ltiRole of ltiRoles) {
        if (roleMapping[ltiRole] === priorityRole) {
          return priorityRole;
        }
      }
    }

    // Also check for short-form roles (some LMS send these)
    const shortFormMapping: Record<string, AivoUserRole> = {
      Instructor: 'TEACHER',
      Teacher: 'TEACHER',
      Learner: 'LEARNER',
      Student: 'LEARNER',
      Administrator: 'ADMIN',
      Admin: 'ADMIN',
      ContentDeveloper: 'AUTHOR',
      TA: 'TEACHER',
      TeachingAssistant: 'TEACHER',
    };

    for (const ltiRole of ltiRoles) {
      // Extract last segment if it's a URI
      const segments = ltiRole.split(/[#/]/);
      const shortRole = segments.at(-1);
      if (shortRole && shortFormMapping[shortRole]) {
        return shortFormMapping[shortRole];
      }
    }

    // Default to LEARNER if no recognized role
    return 'LEARNER';
  }

  /**
   * Map AIVO role to internal LTI user role enum
   */
  aivoRoleToLtiRole(aivoRole: AivoUserRole): LtiUserRole {
    switch (aivoRole) {
      case 'ADMIN':
        return LtiUserRole.ADMINISTRATOR;
      case 'TEACHER':
        return LtiUserRole.INSTRUCTOR;
      case 'AUTHOR':
        return LtiUserRole.CONTENT_DEVELOPER;
      case 'LEARNER':
      case 'PARENT':
      default:
        return LtiUserRole.LEARNER;
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Build display name from LTI claims
   */
  private buildDisplayName(context: LtiUserContext): string {
    if (context.name) {
      return context.name;
    }

    if (context.givenName && context.familyName) {
      return `${context.givenName} ${context.familyName}`;
    }

    if (context.givenName) {
      return context.givenName;
    }

    if (context.email) {
      const emailPart = context.email.split('@')[0];
      return emailPart ?? 'LTI User';
    }

    return 'LTI User';
  }

  /**
   * Generate placeholder email for users without email in LTI claims
   */
  private generatePlaceholderEmail(context: LtiUserContext): string {
    // Use a hash of the sub to create a unique but deterministic email
    const hash = this.simpleHash(`${context.issuer}:${context.clientId}:${context.sub}`);
    return `lti-${hash}@lti.placeholder.aivo.local`;
  }

  /**
   * Simple hash function for generating placeholder identifiers
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const codePoint = str.codePointAt(i);
      if (codePoint !== undefined) {
        hash = (hash << 5) - hash + codePoint;
        hash = hash & hash; // Convert to 32bit integer
      }
    }
    return Math.abs(hash).toString(36);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ADMIN METHODS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Get all LTI mappings for a user
   */
  async getUserMappings(aivoUserId: string): Promise<LtiUserMappingRecord[]> {
    return this.prisma.ltiUserMapping.findMany({
      where: { aivoUserId },
    });
  }

  /**
   * Unlink an LTI account from AIVO user
   */
  async unlinkAccount(mappingId: string): Promise<void> {
    await this.prisma.ltiUserMapping.delete({
      where: { id: mappingId },
    });
  }

  /**
   * Get user's LTI context for session enrichment
   */
  async getLtiContext(
    toolId: string,
    lmsUserId: string
  ): Promise<{ aivoUserId: string; role: LtiUserRole } | null> {
    const mapping = await this.prisma.ltiUserMapping.findUnique({
      where: {
        ltiToolId_lmsUserId: {
          ltiToolId: toolId,
          lmsUserId,
        },
      },
    });

    if (!mapping) {
      return null;
    }

    return {
      aivoUserId: mapping.aivoUserId,
      role: LtiUserRole.LEARNER, // Would need to store role in mapping
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create LTI user service instance
 */
export function createLtiUserService(
  prisma: PrismaClient,
  authServiceUrl?: string
): LtiUserService {
  return new LtiUserService(prisma, authServiceUrl);
}
